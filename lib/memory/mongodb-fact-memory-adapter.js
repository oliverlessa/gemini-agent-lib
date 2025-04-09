const FactMemory = require('./fact-memory');
const { MongoClient } = require('mongodb');
const debug = require('../debug').create('memory:mongodb');

/**
 * Adaptador de memória de fatos que utiliza MongoDB para persistência.
 * Implementa a interface FactMemory.
 */
class MongoDBFactMemoryAdapter extends FactMemory {
    /**
     * Construtor para o adaptador de memória de fatos MongoDB.
     * @param {Object} options - Opções de configuração.
     * @param {Object} options.dbConfig - Configuração do banco de dados MongoDB.
     * @param {string} options.dbConfig.connectionUri - URI de conexão do MongoDB.
     * @param {string} options.dbConfig.dbName - Nome do banco de dados MongoDB.
     * @param {string} [options.dbConfig.collectionName='facts'] - Nome da collection para os fatos.
     */
    constructor({ dbConfig }) {
        if (!dbConfig || !dbConfig.connectionUri) {
            throw new Error("MongoDBFactMemoryAdapter requer 'dbConfig.connectionUri'.");
        }
        if (!dbConfig || !dbConfig.dbName) {
            throw new Error("MongoDBFactMemoryAdapter requer 'dbConfig.dbName'.");
        }
        super({ dbType: 'mongodb', dbConfig });

        this.connectionUri = dbConfig.connectionUri;
        this.dbName = dbConfig.dbName;
        this.collectionName = dbConfig.collectionName || 'facts';
        this.client = new MongoClient(this.connectionUri);
        this.factsCollection = null;
    }

    /**
     * Conecta ao banco de dados MongoDB e obtém a collection de fatos.
     * Deve ser chamado e aguardado antes de usar o adaptador.
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await this.client.connect();
            const db = this.client.db(this.dbName);
            this.factsCollection = db.collection(this.collectionName);
            // Criar índice para buscas eficientes (operação idempotente - não causa erro se o índice já existir)
            await this.factsCollection.createIndex({ context_id: 1, key: 1 }, { unique: true, background: true });
            debug(`Conectado ao MongoDB, database: '${this.dbName}', collection: '${this.collectionName}'`);
        } catch (error) {
            console.error("[MongoDBFactMemoryAdapter] Erro ao conectar ao MongoDB:", error);
            throw error;
        }
    }

    /**
     * Armazena ou atualiza um fato para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato.
     * @param {any} value - O valor do fato.
     * @returns {Promise<void>}
     */
    async setFact(contextId, key, value) {
        try {
            if (!this.factsCollection) {
                throw new Error("[MongoDBFactMemoryAdapter] Não conectado ao MongoDB.");
            }
            // Usa updateOne com upsert:true para inserir ou atualizar
            await this.factsCollection.updateOne(
                { context_id: contextId, key: key }, // Filtro para encontrar o fato
                { $set: { value: value, timestamp: new Date() } }, // Define/atualiza o valor e timestamp
                { upsert: true } // Cria o documento se não existir
            );
        } catch (error) {
            console.error("[MongoDBFactMemoryAdapter] Erro ao definir fato:", error);
            throw error;
        }
    }

    /**
     * Recupera o valor de um fato específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato.
     * @returns {Promise<any|null>} - O valor do fato, ou null se não encontrado.
     */
    async getFact(contextId, key) {
        try {
            if (!this.factsCollection) {
                throw new Error("[MongoDBFactMemoryAdapter] Não conectado ao MongoDB.");
            }
            const factDoc = await this.factsCollection.findOne({ context_id: contextId, key: key });
            return factDoc ? factDoc.value : null; // Retorna o valor ou null
        } catch (error) {
            console.error("[MongoDBFactMemoryAdapter] Erro ao obter fato:", error);
            throw error;
        }
    }

    /**
     * Recupera todos os fatos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<Object<string, any>>} - Um objeto com todos os fatos.
     */
    async getAllFacts(contextId) {
        try {
            if (!this.factsCollection) {
                throw new Error("[MongoDBFactMemoryAdapter] Não conectado ao MongoDB.");
            }
            const cursor = this.factsCollection.find({ context_id: contextId });
            const facts = {};
            await cursor.forEach(doc => {
                facts[doc.key] = doc.value;
            });
            return facts;
        } catch (error) {
            console.error("[MongoDBFactMemoryAdapter] Erro ao obter todos os fatos:", error);
            throw error;
        }
    }

    /**
     * Deleta um fato específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato a ser deletado.
     * @returns {Promise<void>}
     */
    async deleteFact(contextId, key) {
        try {
            if (!this.factsCollection) {
                throw new Error("[MongoDBFactMemoryAdapter] Não conectado ao MongoDB.");
            }
            await this.factsCollection.deleteOne({ context_id: contextId, key: key });
        } catch (error) {
            console.error("[MongoDBFactMemoryAdapter] Erro ao deletar fato:", error);
            throw error;
        }
    }

    /**
     * Deleta todos os fatos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<void>}
     */
    async deleteAllFacts(contextId) {
        try {
            if (!this.factsCollection) {
                throw new Error("[MongoDBFactMemoryAdapter] Não conectado ao MongoDB.");
            }
            await this.factsCollection.deleteMany({ context_id: contextId });
        } catch (error) {
            console.error("[MongoDBFactMemoryAdapter] Erro ao deletar todos os fatos:", error);
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
                debug("Conexão com o banco de dados MongoDB fechada.");
                this.client = null;
                this.factsCollection = null;
            } catch (error) {
                console.error("[MongoDBFactMemoryAdapter] Erro ao fechar conexão MongoDB:", error);
                throw error;
            }
        }
    }
}

module.exports = MongoDBFactMemoryAdapter;
