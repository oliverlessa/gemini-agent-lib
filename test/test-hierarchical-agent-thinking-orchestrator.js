// test-hierarchical-agent-thinking-orchestrator.js
require('dotenv').config();
const { 
    ThinkingAgent, 
    Agent, 
    GenerativeAILLM,
    VertexAILLM,
    HierarchicalAgentThinkingOrchestrator 
} = require('../');

/**
 * Função para testar o HierarchicalAgentThinkingOrchestrator
 * 
 * Este teste demonstra como o HierarchicalAgentThinkingOrchestrator pode ser usado
 * para orquestrar agentes especialistas usando o modelo thinking.
 */
async function testHierarchicalAgentThinkingOrchestrator() {
    try {
        console.log("Iniciando teste do HierarchicalAgentThinkingOrchestrator...");
        
        // Criar instância do LLM para os agentes especialistas
        const geminiLLM = new GenerativeAILLM({ 
            apiKey: process.env.GEMINI_API_KEY,
            modelName: "gemini-2.0-flash" // Modelo padrão para agentes especialistas
        });
        const vertexLLM = new VertexAILLM({
            apiKey: process.env.VERTEX_API_KEY,
            credentialsPath: process.env.VERTEX_CREDENTIALS_PATH,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001", // ou outro modelo que suporte Google Search
            mode: "oneshot" // ou "chat" para testar em modo de chat
        });
        
        // Criar agentes especialistas
        const marketResearchAgent = new Agent({
            role: "Agente de Pesquisa de Mercado",
            objective: "Realizar pesquisa de mercado e identificar tendências.",
            context: "Você é um agente de pesquisa de mercado experiente, especializado em identificar tendências de mercado e coletar dados relevantes. com acesso ao Google Search. Use o Google Search para obter informações atualizadas. Utilize os dados do Google Search e cite as fontes sempre.",
            task: "", // Tarefa definida pelo orquestrador
            llm: vertexLLM,
            enableGoogleSearch: true,
            tools: []
        });

        const financialAnalystAgent = new Agent({
            role: "Agente de Análise Financeira",
            objective: "Analisar dados financeiros e fornecer insights.",
            context: "Você é um analista financeiro experiente, com expertise em analisar dados financeiros e identificar oportunidades e riscos.",
            task: "", // Tarefa definida pelo orquestrador
            llm: geminiLLM,
            tools: []
        });

        const marketingStrategistAgent = new Agent({
            role: "Agente de Estratégia de Marketing",
            objective: "Desenvolver estratégias de marketing eficazes.",
            context: "Você é um estrategista de marketing criativo e experiente, com foco em desenvolver estratégias de marketing que gerem resultados.",
            task: "", // Tarefa definida pelo orquestrador
            llm: geminiLLM,
            tools: []
        });
        
        // Array de agentes especialistas
        const specialistAgents = [
            marketResearchAgent,
            financialAnalystAgent,
            marketingStrategistAgent
        ];
        
        // Criar o HierarchicalAgentThinkingOrchestrator
        const orchestrator = new HierarchicalAgentThinkingOrchestrator(
            specialistAgents, 
            {
                apiKey: process.env.GEMINI_API_KEY,
                useVertexAI: process.env.USE_VERTEX_AI === 'true',
                vertexConfig: {
                    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                    projectId: process.env.GOOGLE_CLOUD_PROJECT,
                    location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
                }
            }
        );
        
        // Executar a orquestração com uma tarefa principal
        const mainTask = "Investigar o potencial de mercado para um novo produto de IA para educação e fornecer uma análise abrangente e recomendações.";
        console.log(`\n\n=== Iniciando orquestração para tarefa: "${mainTask}" ===`);
        
        // Executar a orquestração e obter o resultado
        const result = await orchestrator.orchestrate(mainTask);
        
        console.log("\n=== Resultado da Orquestração com Modelo Thinking ===");
        console.log(result);
        
    } catch (error) {
        console.error("Erro ao executar o teste de orquestração com modelo thinking:", error);
    }
}

// Executar o teste
testHierarchicalAgentThinkingOrchestrator();
