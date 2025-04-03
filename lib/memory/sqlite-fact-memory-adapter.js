const FactMemory = require('./fact-memory');
const sqlite3 = require('sqlite3').verbose();

/**
 * Adaptador de memória de fatos que utiliza SQLite para persistência.
 * Implementa a interface FactMemory.
 */
class SQLiteFactMemoryAdapter extends FactMemory {
    /**
     * Construtor para o adaptador de memória de fatos SQLite.
     * @param {Object} options - Opções de configuração.
     * @param {Object} options.dbConfig - Configuração do banco de dados SQLite.
     * @param {string} options.dbConfig.dbPath - Caminho para o arquivo do banco de dados SQLite.
     */
    constructor(options) { // Remover desestruturação
        // Verificar diretamente o objeto options
        if (!options || !options.dbConfig || !options.dbConfig.dbPath) {
            console.error("[SQLiteFactMemoryAdapter] Opções recebidas:", options); // Log para depuração
            throw new Error("SQLiteFactMemoryAdapter requer 'options.dbConfig.dbPath'.");
        }
        const dbConfig = options.dbConfig; // Extrair dbConfig
        super({ dbType: 'sqlite', dbConfig: dbConfig }); // Passar dbConfig explicitamente
        this.dbPath = dbConfig.dbPath;
        this.db = new sqlite3.Database(this.dbPath);
        this._initializeDatabase();
    }

    /**
     * Inicializa o banco de dados, criando a tabela de fatos se necessário.
     * @private
     */
    _initializeDatabase() {
        this.db.run(`
            CREATE TABLE IF NOT EXISTS facts (
                context_id TEXT NOT NULL,
                key TEXT NOT NULL,
                value TEXT NOT NULL,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (context_id, key)
            );
        `);
    }

    /**
     * Armazena ou atualiza um fato para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato.
     * @param {any} value - O valor do fato.
     * @returns {Promise<void>}
     */
    async setFact(contextId, key, value) {
        return new Promise((resolve, reject) => {
            const valueJson = JSON.stringify(value); // Serializa o valor para JSON
            // REPLACE funciona como UPSERT no SQLite se a PRIMARY KEY (context_id, key) existir
            this.db.run(`
                REPLACE INTO facts (context_id, key, value, timestamp)
                VALUES (?, ?, ?, CURRENT_TIMESTAMP)
            `, [contextId, key, valueJson], function(err) {
                if (err) {
                    console.error("[SQLiteFactMemoryAdapter] Erro ao definir fato:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Recupera o valor de um fato específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato.
     * @returns {Promise<any|null>} - O valor do fato, ou null se não encontrado.
     */
    async getFact(contextId, key) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT value FROM facts WHERE context_id = ? AND key = ?
            `, [contextId, key], (err, row) => {
                if (err) {
                    console.error("[SQLiteFactMemoryAdapter] Erro ao obter fato:", err);
                    reject(err);
                } else {
                    resolve(row ? JSON.parse(row.value) : null); // Deserializa o JSON ou retorna null
                }
            });
        });
    }

    /**
     * Recupera todos os fatos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<Object<string, any>>} - Um objeto com todos os fatos.
     */
    async getAllFacts(contextId) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT key, value FROM facts WHERE context_id = ?
            `, [contextId], (err, rows) => {
                if (err) {
                    console.error("[SQLiteFactMemoryAdapter] Erro ao obter todos os fatos:", err);
                    reject(err);
                } else {
                    const facts = {};
                    rows.forEach(row => {
                        facts[row.key] = JSON.parse(row.value); // Deserializa cada valor
                    });
                    resolve(facts);
                }
            });
        });
    }

    /**
     * Deleta um fato específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} key - A chave do fato a ser deletado.
     * @returns {Promise<void>}
     */
    async deleteFact(contextId, key) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM facts WHERE context_id = ? AND key = ?
            `, [contextId, key], function(err) {
                if (err) {
                    console.error("[SQLiteFactMemoryAdapter] Erro ao deletar fato:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Deleta todos os fatos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<void>}
     */
    async deleteAllFacts(contextId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM facts WHERE context_id = ?
            `, [contextId], function(err) {
                if (err) {
                    console.error("[SQLiteFactMemoryAdapter] Erro ao deletar todos os fatos:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Fecha a conexão com o banco de dados SQLite.
     * @returns {Promise<void>}
     */
    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error("[SQLiteFactMemoryAdapter] Erro ao fechar conexão:", err);
                    reject(err);
                    return;
                }
                console.log("[SQLiteFactMemoryAdapter] Conexão com o banco de dados SQLite fechada.");
                resolve();
            });
        });
    }
}

module.exports = SQLiteFactMemoryAdapter;
