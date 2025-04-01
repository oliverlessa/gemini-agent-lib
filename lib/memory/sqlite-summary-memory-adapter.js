const SummaryMemory = require('./summary-memory');
const sqlite3 = require('sqlite3').verbose();

/**
 * Adaptador de memória de resumos que utiliza SQLite para persistência.
 * Implementa a interface SummaryMemory.
 */
class SQLiteSummaryMemoryAdapter extends SummaryMemory {
    /**
     * Construtor para o adaptador de memória de resumos SQLite.
     * @param {Object} options - Opções de configuração.
     * @param {Object} options.dbConfig - Configuração do banco de dados SQLite.
     * @param {string} options.dbConfig.dbPath - Caminho para o arquivo do banco de dados SQLite.
     */
    constructor({ dbConfig }) {
        if (!dbConfig || !dbConfig.dbPath) {
            throw new Error("SQLiteSummaryMemoryAdapter requer 'dbConfig.dbPath'.");
        }
        super({ dbType: 'sqlite', dbConfig });
        this.dbPath = dbConfig.dbPath;
        this.db = new sqlite3.Database(this.dbPath);
        this._initializeDatabase();
    }

    /**
     * Inicializa o banco de dados, criando a tabela de resumos se necessário.
     * @private
     */
    _initializeDatabase() {
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS summaries (
                    summary_id INTEGER PRIMARY KEY AUTOINCREMENT,
                    context_id TEXT NOT NULL,
                    summary_content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
                );
            `);
            this.db.run(`
                CREATE INDEX IF NOT EXISTS idx_summaries_context_timestamp ON summaries (context_id, timestamp DESC);
            `);
        });
    }

    /**
     * Adiciona um novo resumo para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @param {string} summaryContent - O conteúdo do resumo.
     * @param {Date} [timestamp=new Date()] - O timestamp associado ao resumo.
     * @returns {Promise<void>}
     */
    async addSummary(contextId, summaryContent, timestamp = new Date()) {
        return new Promise((resolve, reject) => {
            // Converte timestamp para formato compatível com SQLite (ISO 8601 string)
            const isoTimestamp = timestamp.toISOString();
            this.db.run(`
                INSERT INTO summaries (context_id, summary_content, timestamp)
                VALUES (?, ?, ?)
            `, [contextId, summaryContent, isoTimestamp], function(err) {
                if (err) {
                    console.error("[SQLiteSummaryMemoryAdapter] Erro ao adicionar resumo:", err);
                    reject(err);
                } else {
                    resolve();
                }
            });
        });
    }

    /**
     * Recupera o resumo mais recente para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<string|null>} - O conteúdo do resumo mais recente, ou null se nenhum resumo for encontrado.
     */
    async getLatestSummary(contextId) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT summary_content FROM summaries
                WHERE context_id = ?
                ORDER BY timestamp DESC
                LIMIT 1
            `, [contextId], (err, row) => {
                if (err) {
                    console.error("[SQLiteSummaryMemoryAdapter] Erro ao obter último resumo:", err);
                    reject(err);
                } else {
                    resolve(row ? row.summary_content : null);
                }
            });
        });
    }

    /**
     * Recupera todos os resumos para um contexto específico, ordenados do mais recente para o mais antigo.
     * @param {string} contextId - Identificador único do contexto.
     * @param {number} [limit] - Número máximo de resumos a serem retornados.
     * @returns {Promise<Array<{ summaryContent: string, timestamp: Date }>>} - Um array de objetos de resumo.
     */
    async getAllSummaries(contextId, limit) {
        return new Promise((resolve, reject) => {
            let query = `
                SELECT summary_content, timestamp FROM summaries
                WHERE context_id = ?
                ORDER BY timestamp DESC
            `;
            const params = [contextId];
            if (limit && typeof limit === 'number' && limit > 0) {
                query += ` LIMIT ?`;
                params.push(limit);
            }

            this.db.all(query, params, (err, rows) => {
                if (err) {
                    console.error("[SQLiteSummaryMemoryAdapter] Erro ao obter todos os resumos:", err);
                    reject(err);
                } else {
                    // Converte timestamp de string ISO para objeto Date
                    const summaries = rows.map(row => ({
                        summaryContent: row.summary_content,
                        timestamp: new Date(row.timestamp)
                    }));
                    resolve(summaries);
                }
            });
        });
    }

    /**
     * Deleta todos os resumos para um contexto específico.
     * @param {string} contextId - Identificador único do contexto.
     * @returns {Promise<void>}
     */
    async deleteAllSummaries(contextId) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM summaries WHERE context_id = ?
            `, [contextId], function(err) {
                if (err) {
                    console.error("[SQLiteSummaryMemoryAdapter] Erro ao deletar resumos:", err);
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
                    console.error("[SQLiteSummaryMemoryAdapter] Erro ao fechar conexão:", err);
                    reject(err);
                    return;
                }
                console.log("[SQLiteSummaryMemoryAdapter] Conexão com o banco de dados SQLite fechada.");
                resolve();
            });
        });
    }
}

module.exports = SQLiteSummaryMemoryAdapter;
