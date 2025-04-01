/**
 * Classe abstrata que define a interface para armazenar e recuperar
 * resumos de segmentos de conversa associados a um contexto.
 */
class SummaryMemory {
    /**
     * Construtor da classe abstrata SummaryMemory.
     * @param {Object} options - Opções de configuração.
     * @param {string} options.dbType - O tipo de banco de dados (ex: 'sqlite', 'mongodb').
     * @param {Object} options.dbConfig - Configuração específica do banco de dados.
     */
    constructor({ dbType, dbConfig }) {
        if (new.target === SummaryMemory) {
            throw new TypeError("SummaryMemory é uma classe abstrata e não pode ser instanciada diretamente");
        }
        this.dbType = dbType;
        this.dbConfig = dbConfig;
    }

    /**
     * Adiciona um novo resumo para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} summaryContent - O conteúdo do resumo.
     * @param {Date} [timestamp=new Date()] - O timestamp associado ao resumo (geralmente o momento da criação).
     * @returns {Promise<void>}
     * @abstract
     */
    async addSummary(contextId, summaryContent, timestamp = new Date()) {
        throw new Error("O método 'addSummary' deve ser implementado na subclasse");
    }

    /**
     * Recupera o resumo mais recente para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<string|null>} - O conteúdo do resumo mais recente, ou null se nenhum resumo for encontrado.
     * @abstract
     */
    async getLatestSummary(contextId) {
        throw new Error("O método 'getLatestSummary' deve ser implementado na subclasse");
    }

    /**
     * Recupera todos os resumos para um contexto específico, ordenados do mais recente para o mais antigo.
     * @param {string} contextId - Identificador único do contexto.
     * @param {number} [limit] - Número máximo de resumos a serem retornados.
     * @returns {Promise<Array<{ summaryContent: string, timestamp: Date }>>} - Um array de objetos de resumo.
     * @abstract
     */
    async getAllSummaries(contextId, limit) {
        throw new Error("O método 'getAllSummaries' deve ser implementado na subclasse");
    }

    /**
     * Deleta todos os resumos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<void>}
     * @abstract
     */
    async deleteAllSummaries(contextId) {
        throw new Error("O método 'deleteAllSummaries' deve ser implementado na subclasse");
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

module.exports = SummaryMemory;
