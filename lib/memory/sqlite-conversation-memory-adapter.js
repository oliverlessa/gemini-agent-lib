const ConversationMemory = require('./conversation-memory');
const sqlite3 = require('sqlite3').verbose();
const debug = require('../debug').create('gemini-agent-lib:memory:conversation');

/**
 * Adaptador de memória de conversação que utiliza SQLite para persistência.
 * Implementa a interface ConversationMemory.
 */
class SQLiteConversationMemoryAdapter extends ConversationMemory {
    /**
     * Construtor para o adaptador de memória SQLite.
     * @param {Object} options - Opções de configuração.
     * @param {Object} options.dbConfig - Configuração do banco de dados SQLite.
     * @param {string} options.dbConfig.dbPath - Caminho para o arquivo do banco de dados SQLite.
     */
    constructor(options) { // Remover desestruturação
        debug('Inicializando adaptador com opções: %o', options);
        // Verificar diretamente o objeto options
        if (!options || !options.dbConfig || !options.dbConfig.dbPath) {
            console.error("[SQLiteConversationMemoryAdapter] Opções recebidas:", options); // Log para depuração
            throw new Error("SQLiteConversationMemoryAdapter requer 'options.dbConfig.dbPath'.");
        }
        const dbConfig = options.dbConfig; // Extrair dbConfig
        super({ dbType: 'sqlite', dbConfig: dbConfig }); // Passar dbConfig explicitamente
        this.dbPath = dbConfig.dbPath;
        this.db = new sqlite3.Database(this.dbPath);
        this._initializeDatabase();
    }

    /**
     * Inicializa o banco de dados, criando a tabela de histórico se necessário.
     * @private
     */
    _initializeDatabase() {
        debug('Inicializando banco de dados SQLite em: %s', this.dbPath);
        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS chat_history (
                    chat_id TEXT NOT NULL,
                    message_index INTEGER NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (chat_id, message_index)
                );
            `, (err) => {
                if (err) {
                    console.error('Erro ao criar tabela chat_history:', err);
                } else {
                    debug('Tabela chat_history verificada/criada com sucesso');
                }
            });
        });
    }

    /**
     * Carrega o histórico de conversas do SQLite para um determinado ID de chat.
     * @param {string} chatId - Identificador único da conversa.
     * @returns {Promise<ChatMessage[]>} - Array de mensagens do histórico.
     */
    async loadHistory(chatId) {
        debug('Carregando histórico para chatId: %s', chatId);
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT role, content FROM chat_history
                WHERE chat_id = ?
                ORDER BY message_index ASC
            `, [chatId], (err, rows) => {
                if (err) {
                    console.error("[SQLiteConversationMemoryAdapter] Erro ao carregar histórico:", err);
                    reject(err);
                    return;
                }
                const history = rows.map(row => ({
                    role: row.role,
                    content: row.content
                }));
                debug('Histórico carregado para chatId %s: %d mensagens', chatId, history.length);
                resolve(history);
            });
        });
    }

    /**
     * Adiciona uma nova mensagem ao histórico no SQLite.
     * @param {string} chatId - Identificador único da conversa.
     * @param {string} role - Papel do autor da mensagem.
     * @param {string} content - Conteúdo da mensagem.
     * @returns {Promise<void>}
     */
    async appendMessage(chatId, role, content) {
        debug('Adicionando mensagem para chatId: %s, role: %s', chatId, role);
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT MAX(message_index) AS maxIndex FROM chat_history WHERE chat_id = ?`, [chatId], (err, row) => {
                if (err) {
                    console.error("[SQLiteConversationMemoryAdapter] Erro ao obter max index:", err);
                    reject(err);
                    return;
                }
                const nextIndex = (row && row.maxIndex !== null) ? row.maxIndex + 1 : 0;
                debug('Próximo índice para chatId %s: %d', chatId, nextIndex);

                this.db.run(`
                    INSERT INTO chat_history (chat_id, message_index, role, content)
                    VALUES (?, ?, ?, ?)
                `, [chatId, nextIndex, role, content], function(err) {
                    if (err) {
                        console.error("[SQLiteConversationMemoryAdapter] Erro ao adicionar mensagem:", err);
                        reject(err);
                        return;
                    }
                    debug('Mensagem adicionada com sucesso para chatId %s no índice %d', chatId, nextIndex);
                    resolve();
                });
            });
        });
    }

    /**
     * Limpa o histórico de conversas no SQLite para um determinado ID de chat.
     * @param {string} chatId - Identificador único da conversa.
     * @returns {Promise<void>}
     */
    async clearHistory(chatId) {
        debug('Limpando histórico para chatId: %s', chatId);
        return new Promise((resolve, reject) => {
            this.db.run(`
                DELETE FROM chat_history WHERE chat_id = ?
            `, [chatId], function(err) {
                if (err) {
                    console.error("[SQLiteConversationMemoryAdapter] Erro ao limpar histórico:", err);
                    reject(err);
                    return;
                }
                debug('Histórico limpo para chatId %s: %d registros removidos', chatId, this.changes);
                resolve();
            });
        });
    }

    /**
     * Fecha a conexão com o banco de dados SQLite.
     * @returns {Promise<void>}
     */
    async close() {
        debug('Fechando conexão com o banco de dados SQLite');
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    console.error("[SQLiteConversationMemoryAdapter] Erro ao fechar conexão:", err);
                    reject(err);
                    return;
                }
                debug('Conexão com o banco de dados SQLite fechada com sucesso');
                resolve();
            });
        });
    }
}

module.exports = SQLiteConversationMemoryAdapter;
