// test-thinking-agent.js
require('dotenv').config();
const ThinkingAgent = require('../lib/thinking-agent');

/**
 * Função para testar a classe ThinkingAgent
 * 
 * Este teste cria uma instância do ThinkingAgent e executa várias tarefas
 * para analisar o formato de resposta do modelo gemini-2.0-flash-thinking-exp-01-21
 */
async function testThinkingAgent() {
    try {
        console.log("Iniciando teste do ThinkingAgent...");
        
        // Criar instância do ThinkingAgent
        const thinkingAgent = new ThinkingAgent({
            role: "Agente Pensante",
            objective: "Resolver problemas com raciocínio passo a passo",
            context: `Você é um agente especializado em resolver problemas complexos.
                     Ao receber uma pergunta, você deve pensar passo a passo antes de fornecer uma resposta final.
                     Explique seu raciocínio de forma clara e estruturada.`,
            task: "", // Será definida abaixo
            apiKey: process.env.GEMINI_API_KEY,
            useVertexAI: false // Mudar para true se quiser usar Vertex AI
            // Se useVertexAI for true, adicionar:
            // vertexConfig: {
            //     projectId: process.env.VERTEX_PROJECT_ID,
            //     credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            //     location: process.env.VERTEX_LOCATION || 'us-central1'
            // }
        });
        
        // Definir tarefas para testar
        const tarefas = [
            "Quanto é 27 x 34?",
            "Se um trem viaja a 120 km/h, quanto tempo levará para percorrer 450 km?",
            "Quais são os principais fatores a considerar ao escolher entre energia solar e eólica para uma residência?",
            "Explique o conceito de recursão em programação."
        ];
        
        // Executar cada tarefa
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            thinkingAgent.task = tarefa;
            
            try {
                const resposta = await thinkingAgent.executeTask();
                console.log(`\nResposta Processada do ThinkingAgent:\n`, resposta);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste do ThinkingAgent:", error);
    }
}

// Executar o teste
testThinkingAgent();
