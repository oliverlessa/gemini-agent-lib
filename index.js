// index.js - Exporta todos os componentes da biblioteca GeminiAgentLib

const Agent = require('./lib/agent');
const ChatAgent = require('./lib/chat-agent');
const ChatManager = require('./lib/chat-manager');
const GenerativeAILLM = require('./lib/generative-ai-llm');
const VertexAILLM = require('./lib/vertex-ai-llm');
const SequentialAgentChain = require('./lib/sequential-agent-chain');
const HierarchicalAgentOrchestrator = require('./lib/hierarchical-agent-orchestrator');
const HierarchicalAgentThinkingOrchestrator = require('./lib/hierarchical-agent-thinking-orchestrator');
const FunctionDeclarationSchemaType = require('./lib/function-declaration-schema-type');
const ToolBuilder = require('./lib/tool-builder');
const ThinkingAgent = require('./lib/thinking-agent');
const AutoGenOrchestrator = require('./lib/auto-gen-orchestrator');

// Componentes de memória
const ConversationMemory = require('./lib/memory/conversation-memory');
const SQLiteConversationMemoryAdapter = require('./lib/memory/sqlite-conversation-memory-adapter');
const MongoDBConversationMemoryAdapter = require('./lib/memory/mongodb-conversation-memory-adapter');
const FactMemory = require('./lib/memory/fact-memory');
const SQLiteFactMemoryAdapter = require('./lib/memory/sqlite-fact-memory-adapter');
const MongoDBFactMemoryAdapter = require('./lib/memory/mongodb-fact-memory-adapter');
const SummaryMemory = require('./lib/memory/summary-memory');
const SQLiteSummaryMemoryAdapter = require('./lib/memory/sqlite-summary-memory-adapter');
const MongoDBSummaryMemoryAdapter = require('./lib/memory/mongodb-summary-memory-adapter');

// Exportar ferramentas específicas
const VertexAISearchRetrieverTool = require('./lib/tools/vertex-ai-search-retriever-tool');
const WeatherTool = require('./lib/tools/weather-tool');
const RestaurantTool = require('./lib/tools/restaurant-tool');
const TemplateTool = require('./lib/tools/template-tool');

module.exports = {
    // Componentes principais
    Agent,
    ChatAgent,
    ChatManager,
    GenerativeAILLM,
    VertexAILLM,
    SequentialAgentChain,
    HierarchicalAgentOrchestrator,
    HierarchicalAgentThinkingOrchestrator,
    FunctionDeclarationSchemaType,
    ToolBuilder,
    ThinkingAgent,
    AutoGenOrchestrator,
    
    // Componentes de memória
    memory: {
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
        MongoDBSummaryMemoryAdapter
    },
    
    // Ferramentas
    tools: {
        VertexAISearchRetrieverTool,
        WeatherTool,
        RestaurantTool,
        TemplateTool
    }
};
