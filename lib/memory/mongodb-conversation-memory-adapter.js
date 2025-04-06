const ConversationMemory = require('./conversation-memory');
const { MongoClient } = require('mongodb');

/**
 * Adaptador de memória de conversação que utiliza MongoDB para persistência.
 * Implementa a interface ConversationMemory.
 */
class MongoDBConversationMemoryAdapter extends ConversationMemory {
    /**
     * Construtor para o adaptador de memória MongoDB.
     * @param {Object} options - Opções de configuração.
     * @param {Object} options.dbConfig - Configuração do banco de dados MongoDB.
     * @param {string} options.dbConfig.connectionUri - URI de conexão do MongoDB.
     * @param {string} options.dbConfig.dbName - Nome do banco de dados MongoDB.
     * @param {string} [options.dbConfig.collectionName='chat_history'] - Nome da collection para o histórico.
     */
    constructor({ dbConfig }) {
        if (!dbConfig || !dbConfig.connectionUri) {
            throw new Error("MongoDBConversationMemoryAdapter requer 'dbConfig.connectionUri'.");
        }
        if (!dbConfig || !dbConfig.dbName) {
            throw new Error("MongoDBConversationMemoryAdapter requer 'dbConfig.dbName'.");
        }
        super({ dbType: 'mongodb', dbConfig });

        this.connectionUri = dbConfig.connectionUri;
        this.dbName = dbConfig.dbName;
        this.collectionName = dbConfig.collectionName || 'chat_history';
        this.client = new MongoClient(this.connectionUri);
        this.historyCollection = null;
    }

    /**
     * Conecta ao banco de dados MongoDB e obtém a collection de histórico.
     * Deve ser chamado e aguardado antes de usar o adaptador.
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await this.client.connect();
            const db = this.client.db(this.dbName);
            this.historyCollection = db.collection(this.collectionName);
            console.log(`[MongoDBConversationMemoryAdapter] Conectado ao MongoDB, database: '${this.dbName}', collection: '${this.collectionName}'`);
        } catch (error) {
            console.error("[MongoDBConversationMemoryAdapter] Erro ao conectar ao MongoDB:", error);
            throw error;
        }
    }

    /**
     * Carrega o histórico de conversas do MongoDB para um determinado ID de chat.
     * @param {string} chatId - Identificador único da conversa.
     * @returns {Promise<ChatMessage[]>} - Array de mensagens do histórico.
     */
    async loadHistory(chatId) {
        try {
            if (!this.historyCollection) {
                throw new Error("[MongoDBConversationMemoryAdapter] Não conectado ao MongoDB.");
            }
            const cursor = this.historyCollection.find({ chat_id: chatId }).sort({ message_index: 1 });
            const messages = [];
            await cursor.forEach(doc => {
                messages.push({ role: doc.role, content: doc.content });
            });
            return messages;
        } catch (error) {
            console.error("[MongoDBConversationMemoryAdapter] Erro ao carregar histórico do MongoDB:", error);
            throw error;
        }
    }

    /**
     * Adiciona uma nova mensagem ao histórico no MongoDB.
     * @param {string} chatId - Identificador único da conversa.
     * @param {string} role - Papel do autor da mensagem.
     * @param {string} content - Conteúdo da mensagem.
     * @returns {Promise<void>}
     */
    async appendMessage(chatId, role, content) {
        try {
            if (!this.historyCollection) {
                throw new Error("[MongoDBConversationMemoryAdapter] Não conectado ao MongoDB.");
            }
            const lastMessage = await this.historyCollection.find({ chat_id: chatId }).sort({ message_index: -1 }).limit(1).toArray();
            const nextIndex = (lastMessage.length > 0) ? lastMessage[0].message_index + 1 : 0;

            await this.historyCollection.insertOne({
                chat_id: chatId,
                message_index: nextIndex,
                role: role,
                content: content,
                timestamp: new Date()
            });
        } catch (error) {
            console.error("[MongoDBConversationMemoryAdapter] Erro ao adicionar mensagem ao MongoDB:", error);
            throw error;
        }
    }

    /**
     * Limpa o histórico de conversas no MongoDB para um determinado ID de chat.
     * @param {string} chatId - Identificador único da conversa.
     * @returns {Promise<void>}
     */
    async clearHistory(chatId) {
        try {
            if (!this.historyCollection) {
                throw new Error("[MongoDBConversationMemoryAdapter] Não conectado ao MongoDB.");
            }
            await this.historyCollection.deleteMany({ chat_id: chatId });
        } catch (error) {
            console.error("[MongoDBConversationMemoryAdapter] Erro ao limpar histórico do MongoDB:", error);
            throw error;
        }
    }

    /**
     * Fecha a conexão com o banco de dados MongoDB.
     * @returns {Promise<void>}
     */
    async close() {
        if (this.client) {
            try {
                await this.client.close();
                console.log("[MongoDBConversationMemoryAdapter] Conexão com o banco de dados MongoDB fechada.");
                this.client = null;
                this.historyCollection = null;
            } catch (error) {
                console.error("[MongoDBConversationMemoryAdapter] Erro ao fechar conexão MongoDB:", error);
                throw error;
            }
        }
    }
}

module.exports = MongoDBConversationMemoryAdapter;
