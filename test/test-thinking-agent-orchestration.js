// test-thinking-agent-orchestration.js
require('dotenv').config();
const { ThinkingAgent, Agent, GenerativeAILLM } = require('../');

/**
 * Função para testar o ThinkingAgent como orquestrador
 * 
 * Este teste demonstra como o ThinkingAgent pode ser usado como um agente orquestrador
 * que coordena outros agentes especialistas para resolver um problema complexo.
 */
async function testThinkingAgentOrchestration() {
    try {
        console.log("Iniciando teste do ThinkingAgent como orquestrador...");
        
        // Criar instância do LLM para os agentes especialistas
        const geminiLLM = new GenerativeAILLM({ 
            apiKey: process.env.GEMINI_API_KEY,
            modelName: "gemini-2.0-flash" // Modelo padrão para agentes especialistas
        });
        
        // Criar agentes especialistas
        const marketResearchAgent = new Agent({
            role: "Agente de Pesquisa de Mercado",
            objective: "Realizar pesquisa de mercado e identificar tendências.",
            context: "Você é um agente de pesquisa de mercado experiente, especializado em identificar tendências de mercado e coletar dados relevantes.",
            task: "", // Tarefa definida pelo orquestrador
            llm: geminiLLM,
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
        
        // Criar o ThinkingAgent como orquestrador
        const orchestratorAgent = new ThinkingAgent({
            role: "Orquestrador Estratégico",
            objective: "Coordenar agentes especialistas para resolver problemas complexos",
            context: `Você é um agente orquestrador que coordena uma equipe de especialistas.
                     Você tem acesso aos seguintes agentes especialistas:
                     
                     1. Agente de Pesquisa de Mercado: Especializado em identificar tendências de mercado e coletar dados relevantes.
                     2. Agente de Análise Financeira: Especializado em analisar dados financeiros e identificar oportunidades e riscos.
                     3. Agente de Estratégia de Marketing: Especializado em desenvolver estratégias de marketing eficazes.
                     
                     Seu trabalho é:
                     1. Analisar o problema principal
                     2. Dividir o problema em subtarefas para os especialistas
                     3. Atribuir cada subtarefa ao especialista mais adequado
                     4. Integrar as respostas dos especialistas em uma solução coerente
                     
                     Pense passo a passo e explique seu raciocínio.`,
            task: "", // Será definida abaixo
            apiKey: process.env.GEMINI_API_KEY
        });
        
        // Função para simular a execução de um agente especialista
        async function executeSpecialistAgent(agent, task) {
            console.log(`\n--- Executando ${agent.role} ---`);
            console.log(`Tarefa: ${task}`);
            
            agent.task = task;
            const response = await agent.executeTask();
            
            console.log(`Resposta do ${agent.role}:`);
            console.log(response);
            
            return response;
        }
        
        // Função para orquestrar os agentes especialistas
        async function orchestrateAgents(mainTask) {
            console.log(`\n\n=== Iniciando orquestração para tarefa: "${mainTask}" ===`);
            
            // Definir a tarefa principal para o orquestrador
            orchestratorAgent.task = mainTask;
            
            // Obter o plano de orquestração
            const orchestrationPlan = await orchestratorAgent.executeTask();
            console.log("\n=== Plano de Orquestração ===");
            console.log(orchestrationPlan);
            
            // Simular a execução do plano (em um sistema real, isso seria baseado no plano gerado)
            // Aqui estamos simplificando e apenas executando todos os agentes com subtarefas predefinidas
            
            // Executar o agente de pesquisa de mercado
            const marketResearchTask = "Identifique as principais tendências de mercado para produtos de IA na educação.";
            const marketResearchResult = await executeSpecialistAgent(marketResearchAgent, marketResearchTask);
            
            // Executar o agente de análise financeira
            const financialAnalysisTask = "Analise o potencial de retorno sobre investimento para um novo produto de IA para educação.";
            const financialAnalysisResult = await executeSpecialistAgent(financialAnalystAgent, financialAnalysisTask);
            
            // Executar o agente de estratégia de marketing
            const marketingStrategyTask = "Desenvolva uma estratégia de marketing para um novo produto de IA para educação.";
            const marketingStrategyResult = await executeSpecialistAgent(marketingStrategistAgent, marketingStrategyTask);
            
            // Integrar os resultados (em um sistema real, isso seria feito pelo orquestrador)
            const integratedResults = `
=== Resultados Integrados ===

Pesquisa de Mercado:
${marketResearchResult}

Análise Financeira:
${financialAnalysisResult}

Estratégia de Marketing:
${marketingStrategyResult}
            `;
            
            console.log("\n=== Resultados Integrados ===");
            console.log(integratedResults);
            
            return integratedResults;
        }
        
        // Executar a orquestração com uma tarefa principal
        const mainTask = "Investigar o potencial de mercado para um novo produto de IA para educação e fornecer uma análise abrangente e recomendações.";
        await orchestrateAgents(mainTask);
        
    } catch (error) {
        console.error("Erro ao executar o teste de orquestração:", error);
    }
}

// Executar o teste
testThinkingAgentOrchestration();
