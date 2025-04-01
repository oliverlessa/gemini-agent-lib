/**
 * Classe abstrata que define a interface para armazenar e recuperar
 * fatos discretos (pares chave-valor) associados a um contexto.
 */
class FactMemory {
    /**
     * Construtor da classe abstrata FactMemory.
     * @param {Object} options - Opções de configuração.
     * @param {string} options.dbType - O tipo de banco de dados (ex: 'sqlite', 'mongodb').
     * @param {Object} options.dbConfig - Configuração específica do banco de dados.
     */
    constructor({ dbType, dbConfig }) {
        if (new.target === FactMemory) {
            throw new TypeError("FactMemory é uma classe abstrata e não pode ser instanciada diretamente");
        }
        this.dbType = dbType;
        this.dbConfig = dbConfig;
    }

    /**
     * Armazena ou atualiza um fato (par chave-valor) para um contexto específico.
     * Se a chave já existe para o contexto, o valor deve ser atualizado (comportamento upsert).
     * @param {string} contextId - Identificador único do contexto (chatId, userId, etc.).
     * @param {string} key - A chave do fato a ser armazenado.
     * @param {any} value - O valor do fato (pode ser string, número, booleano, objeto serializável).
     * @returns {Promise<void>}
     * @abstract
     */
    async setFact(contextId, key, value) {
        throw new Error("O método 'setFact' deve ser implementado na subclasse");
    }

    /**
     * Recupera o valor de um fato específico para um contexto e chave.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato a ser recuperado.
     * @returns {Promise<any|null>} - O valor do fato, ou null se a chave não for encontrada para o contexto.
     * @abstract
     */
    async getFact(contextId, key) {
        throw new Error("O método 'getFact' deve ser implementado na subclasse");
    }

    /**
     * Recupera todos os fatos (pares chave-valor) para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<Object<string, any>>} - Um objeto onde as chaves são os nomes dos fatos e os valores são os valores dos fatos. Retorna objeto vazio se nenhum fato for encontrado.
     * @abstract
     */
    async getAllFacts(contextId) {
        throw new Error("O método 'getAllFacts' deve ser implementado na subclasse");
    }

    /**
     * Deleta um fato específico para um contexto e chave.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato a ser deletado.
     * @returns {Promise<void>}
     * @abstract
     */
    async deleteFact(contextId, key) {
        throw new Error("O método 'deleteFact' deve ser implementado na subclasse");
    }

    /**
     * Deleta todos os fatos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<void>}
     * @abstract
     */
    async deleteAllFacts(contextId) {
        throw new Error("O método 'deleteAllFacts' deve ser implementado na subclasse");
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

module.exports = FactMemory;
