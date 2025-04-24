/**
 * Índice de exportação para os componentes de memória
 * 
 * Este arquivo facilita a importação dos adaptadores de memória
 * em outros componentes da biblioteca, como o ChatManager.
 */

// Interfaces de memória
const ConversationMemory = require('./conversation-memory');
const FactMemory = require('./fact-memory');
const SummaryMemory = require('./summary-memory');

// Adaptadores SQLite
const SQLiteConversationMemoryAdapter = require('./sqlite-conversation-memory-adapter');
const SQLiteFactMemoryAdapter = require('./sqlite-fact-memory-adapter');
const SQLiteSummaryMemoryAdapter = require('./sqlite-summary-memory-adapter');

// Adaptadores MongoDB
const MongoDBConversationMemoryAdapter = require('./mongodb-conversation-memory-adapter');
const MongoDBFactMemoryAdapter = require('./mongodb-fact-memory-adapter');
const MongoDBSummaryMemoryAdapter = require('./mongodb-summary-memory-adapter');

// Adaptador ChromaDB (Adicionado)
const ChromaDBMemoryAdapter = require('./chromadb-semantic-memory-adapter');

// Exportar todos os componentes
module.exports = {
    // Interfaces
    ConversationMemory,
    FactMemory,
    SummaryMemory,
    
    // Adaptadores SQLite
    SQLiteConversationMemoryAdapter,
    SQLiteFactMemoryAdapter,
    SQLiteSummaryMemoryAdapter,
    
    // Adaptadores MongoDB
    MongoDBConversationMemoryAdapter,
    MongoDBFactMemoryAdapter,
    MongoDBSummaryMemoryAdapter,

    // Adaptador ChromaDB (Adicionado)
    ChromaDBMemoryAdapter
};
