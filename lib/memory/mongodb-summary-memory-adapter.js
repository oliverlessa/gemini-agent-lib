const SummaryMemory = require('./summary-memory');
const { MongoClient } = require('mongodb');
const debug = require('../debug').create('memory:mongodb');

/**
 * Adaptador de memória de resumos que utiliza MongoDB para persistência.
 * Implementa a interface SummaryMemory.
 */
class MongoDBSummaryMemoryAdapter extends SummaryMemory {
    /**
     * Construtor para o adaptador de memória de resumos MongoDB.
     * @param {Object} options - Opções de configuração.
     * @param {Object} options.dbConfig - Configuração do banco de dados MongoDB.
     * @param {string} options.dbConfig.connectionUri - URI de conexão do MongoDB.
     * @param {string} options.dbConfig.dbName - Nome do banco de dados MongoDB.
     * @param {string} [options.dbConfig.collectionName='summaries'] - Nome da collection para os resumos.
     */
    constructor({ dbConfig }) {
        if (!dbConfig || !dbConfig.connectionUri) {
            throw new Error("MongoDBSummaryMemoryAdapter requer 'dbConfig.connectionUri'.");
        }
        if (!dbConfig || !dbConfig.dbName) {
            throw new Error("MongoDBSummaryMemoryAdapter requer 'dbConfig.dbName'.");
        }
        super({ dbType: 'mongodb', dbConfig });

        this.connectionUri = dbConfig.connectionUri;
        this.dbName = dbConfig.dbName;
        this.collectionName = dbConfig.collectionName || 'summaries';
        this.client = new MongoClient(this.connectionUri);
        this.summariesCollection = null;
    }

    /**
     * Conecta ao banco de dados MongoDB e obtém a collection de resumos.
     * Deve ser chamado e aguardado antes de usar o adaptador.
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await this.client.connect();
            const db = this.client.db(this.dbName);
            this.summariesCollection = db.collection(this.collectionName);
            // Criar índice para buscas eficientes por timestamp DESC (operação idempotente - não causa erro se o índice já existir)
            await this.summariesCollection.createIndex({ context_id: 1, timestamp: -1 }, { background: true });
            debug(`Conectado ao MongoDB, database: '${this.dbName}', collection: '${this.collectionName}'`);
        } catch (error) {
            console.error("[MongoDBSummaryMemoryAdapter] Erro ao conectar ao MongoDB:", error);
            throw error;
        }
    }

    /**
     * Adiciona um novo resumo para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} summaryContent - O conteúdo do resumo.
     * @param {Date} [timestamp=new Date()] - O timestamp associado ao resumo.
     * @returns {Promise<void>}
     */
    async addSummary(contextId, summaryContent, timestamp = new Date()) {
        try {
            if (!this.summariesCollection) {
                throw new Error("[MongoDBSummaryMemoryAdapter] Não conectado ao MongoDB.");
            }
            await this.summariesCollection.insertOne({
                context_id: contextId,
                summary_content: summaryContent,
                timestamp: timestamp // Armazena como tipo Date do BSON
            });
        } catch (error) {
            console.error("[MongoDBSummaryMemoryAdapter] Erro ao adicionar resumo:", error);
            throw error;
        }
    }

    /**
     * Recupera o resumo mais recente para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<string|null>} - O conteúdo do resumo mais recente, ou null se nenhum resumo for encontrado.
     */
    async getLatestSummary(contextId) {
        try {
            if (!this.summariesCollection) {
                throw new Error("[MongoDBSummaryMemoryAdapter] Não conectado ao MongoDB.");
            }
            const latestDoc = await this.summariesCollection.findOne(
                { context_id: contextId },
                { sort: { timestamp: -1 } } // Ordena por timestamp descendente e pega o primeiro
            );
            return latestDoc ? latestDoc.summary_content : null;
        } catch (error) {
            console.error("[MongoDBSummaryMemoryAdapter] Erro ao obter último resumo:", error);
            throw error;
        }
    }

    /**
     * Recupera todos os resumos para um contexto específico, ordenados do mais recente para o mais antigo.
     * @param {string} contextId - Identificador único do contexto.
     * @param {number} [limit] - Número máximo de resumos a serem retornados.
     * @returns {Promise<Array<{ summaryContent: string, timestamp: Date }>>} - Um array de objetos de resumo.
     */
    async getAllSummaries(contextId, limit) {
        try {
            if (!this.summariesCollection) {
                throw new Error("[MongoDBSummaryMemoryAdapter] Não conectado ao MongoDB.");
            }
            let queryOptions = { sort: { timestamp: -1 } }; // Ordena por timestamp descendente
            if (limit && typeof limit === 'number' && limit > 0) {
                queryOptions.limit = limit;
            }

            const cursor = this.summariesCollection.find({ context_id: contextId }, queryOptions);
            const summaries = [];
            await cursor.forEach(doc => {
                summaries.push({
                    summaryContent: doc.summary_content,
                    timestamp: doc.timestamp // Timestamp já é Date
                });
            });
            return summaries;
        } catch (error) {
            console.error("[MongoDBSummaryMemoryAdapter] Erro ao obter todos os resumos:", error);
            throw error;
        }
    }

    /**
     * Deleta todos os resumos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<void>}
     */
    async deleteAllSummaries(contextId) {
        try {
            if (!this.summariesCollection) {
                throw new Error("[MongoDBSummaryMemoryAdapter] Não conectado ao MongoDB.");
            }
            await this.summariesCollection.deleteMany({ context_id: contextId });
        } catch (error) {
            console.error("[MongoDBSummaryMemoryAdapter] Erro ao deletar resumos:", error);
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
                this.summariesCollection = null;
            } catch (error) {
                console.error("[MongoDBSummaryMemoryAdapter] Erro ao fechar conexão MongoDB:", error);
                throw error;
            }
        }
    }
}

module.exports = MongoDBSummaryMemoryAdapter;
