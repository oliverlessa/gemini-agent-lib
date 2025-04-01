/**
 * @typedef {Object} ChatMessage
 * @property {string} role - 'user' ou 'model'
 * @property {string} content - Texto da mensagem
 */

/**
 * Classe abstrata que define a interface para armazenar e recuperar
 * o histórico sequencial de mensagens de uma conversa.
 */
class ConversationMemory {
    /**
     * Construtor da classe abstrata Memory.
     * @param {Object} options - Opções de configuração.
     * @param {string} options.dbType - O tipo de banco de dados (ex: 'sqlite', 'mongodb').
     * @param {Object} options.dbConfig - Configuração específica do banco de dados.
     */
    constructor({ dbType, dbConfig }) {
        if (new.target === ConversationMemory) {
            throw new TypeError("ConversationMemory é uma classe abstrata e não pode ser instanciada diretamente");
        }
        this.dbType = dbType;
        this.dbConfig = dbConfig;
    }

    /**
     * Carrega o histórico de conversas para um determinado ID de chat.
     * @param {string} chatId - Identificador único da conversa.
     * @returns {Promise<ChatMessage[]>} - Array de mensagens do histórico (pode ser vazio se não houver histórico).
     * @abstract
     */
    async loadHistory(chatId) {
        throw new Error("O método 'loadHistory' deve ser implementado na subclasse");
    }

    /**
     * Adiciona uma nova mensagem ao histórico de uma conversa.
     * @param {string} chatId - Identificador único da conversa.
     * @param {string} role - Papel do autor da mensagem ('user' ou 'model').
     * @param {string} content - Conteúdo da mensagem.
     * @returns {Promise<void>}
     * @abstract
     */
    async appendMessage(chatId, role, content) {
        throw new Error("O método 'appendMessage' deve ser implementado na subclasse");
    }

    /**
     * Limpa o histórico de conversas para um determinado ID de chat.
     * @param {string} chatId - Identificador único da conversa.
     * @returns {Promise<void>}
     * @abstract
     */
    async clearHistory(chatId) {
        throw new Error("O método 'clearHistory' deve ser implementado na subclasse");
    }

    /**
     * Fecha a conexão com o banco de dados (se aplicável).
     * @returns {Promise<void>}
     * @abstract
     */
    async close() {
        // Método opcional, adaptadores que precisam fechar conexões devem implementá-lo.
        return Promise.resolve(); // Implementação padrão vazia.
    }
}

module.exports = ConversationMemory;
