// index.js - Exporta todos os componentes da biblioteca GeminiAgentLib

const Agent = require('./lib/agent');
const ChatAgent = require('./lib/chat-agent');
const GenerativeAILLM = require('./lib/generative-ai-llm');
const VertexAILLM = require('./lib/vertex-ai-llm');
const SequentialAgentChain = require('./lib/sequential-agent-chain');
const HierarchicalAgentOrchestrator = require('./lib/hierarchical-agent-orchestrator');
const HierarchicalAgentThinkingOrchestrator = require('./lib/hierarchical-agent-thinking-orchestrator');
const FunctionDeclarationSchemaType = require('./lib/function-declaration-schema-type');
const ToolBuilder = require('./lib/tool-builder');
const ThinkingAgent = require('./lib/thinking-agent');
const AutoGenOrchestrator = require('./lib/auto-gen-orchestrator');

// Exportar ferramentas específicas
const VertexAISearchRetrieverTool = require('./lib/tools/vertex-ai-search-retriever-tool');
const WeatherTool = require('./lib/tools/weather-tool');
const RestaurantTool = require('./lib/tools/restaurant-tool');
const TemplateTool = require('./lib/tools/template-tool');

module.exports = {
    // Componentes principais
    Agent,
    ChatAgent,
    GenerativeAILLM,
    VertexAILLM,
    SequentialAgentChain,
    HierarchicalAgentOrchestrator,
    HierarchicalAgentThinkingOrchestrator,
    FunctionDeclarationSchemaType,
    ToolBuilder,
    ThinkingAgent,
    AutoGenOrchestrator,
    
    // Ferramentas
    tools: {
        VertexAISearchRetrieverTool,
        WeatherTool,
        RestaurantTool,
        TemplateTool
    }
};
