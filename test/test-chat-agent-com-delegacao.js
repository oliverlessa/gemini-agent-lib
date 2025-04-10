/**
 * Teste do ChatAgent com delegação para agentes especialistas
 * 
 * Este teste verifica o funcionamento básico do ChatAgent com a funcionalidade
 * de delegação para agentes especialistas.
 */

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const ChatAgent = require('../lib/chat-agent');
const VertexAILLM = require('../lib/vertex-ai-llm');
const AgentRegistry = require('../lib/agent-registry');

// Configuração dos agentes especialistas para teste
const specialistAgentsConfig = {
    "Tradutor EN-PT": {
        objective: "Traduzir textos do inglês para o português brasileiro.",
        context: "Você é um tradutor especializado. Traduza o texto fornecido do inglês para o português brasileiro de forma precisa e natural.",
        llmMode: 'oneshot'
    },
    "Pesquisador": {
        objective: "Buscar e resumir informações sobre um tópico específico.",
        context: "Você é um pesquisador especializado. Forneça informações precisas e concisas sobre o tópico solicitado.",
        enableGoogleSearch: true,
        llmMode: 'oneshot'
    }
};

// Ferramenta simples para teste
const echoTool = {
    name: "echo",
    description: "Repete o texto fornecido",
    parameters: {
        type: "OBJECT",
        properties: {
            text: {
                type: "STRING",
                description: "Texto a ser repetido"
            }
        },
        required: ["text"]
    },
    function: async (args) => {
        return { echo: args.text };
    }
};

async function runTest() {
    console.log("=== Teste do ChatAgent com Delegação para Especialistas ===\n");
    
    try {
        // Cria o ChatAgent com delegação habilitada
        console.log("1. Criando ChatAgent com delegação habilitada...");
        const chatAgent = new ChatAgent({
            role: "Assistente de Teste",
            objective: "Testar a funcionalidade de delegação para especialistas",
            llm: new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                modelName: "gemini-2.0-flash-001", // Usar um modelo mais leve para testes
                mode: "chat"
            }),
            tools: [echoTool],
            enableSpecialistDelegation: true,
            specialistAgentsConfig: specialistAgentsConfig
        });
        
        // Verifica os especialistas disponíveis
        const availableRoles = chatAgent.getAvailableSpecialistRoles();
        console.log(`2. Especialistas disponíveis: ${availableRoles.join(', ')}`);
        
        // Testa o registro de um novo especialista
        console.log("\n3. Registrando um novo especialista...");
        chatAgent.registerSpecialist("Analista", {
            objective: "Analisar dados e fornecer insights",
            context: "Você é um analista especializado em dados. Forneça análises claras e objetivas.",
            llmMode: 'oneshot'
        });
        
        // Verifica os especialistas após o registro
        const updatedRoles = chatAgent.getAvailableSpecialistRoles();
        console.log(`4. Especialistas após registro: ${updatedRoles.join(', ')}`);
        
        // Testa a remoção de um especialista
        console.log("\n5. Removendo um especialista...");
        chatAgent.unregisterSpecialist("Analista");
        
        // Verifica os especialistas após a remoção
        const finalRoles = chatAgent.getAvailableSpecialistRoles();
        console.log(`6. Especialistas após remoção: ${finalRoles.join(', ')}`);
        
        // Testa a desabilitação da delegação
        console.log("\n7. Desabilitando a delegação para especialistas...");
        chatAgent.disableSpecialistDelegation();
        
        // Verifica se a delegação foi desabilitada
        console.log(`8. Especialistas disponíveis após desabilitar: ${chatAgent.getAvailableSpecialistRoles().join(', ') || 'Nenhum'}`);
        
        // Testa a habilitação da delegação novamente
        console.log("\n9. Habilitando a delegação para especialistas novamente...");
        chatAgent.enableSpecialistDelegation(specialistAgentsConfig);
        
        // Verifica se a delegação foi habilitada novamente
        console.log(`10. Especialistas disponíveis após habilitar: ${chatAgent.getAvailableSpecialistRoles().join(', ')}`);
        
        // Testa o processamento de uma mensagem (opcional, depende do ambiente)
        if (process.env.RUN_LLM_TESTS === 'true') {
            console.log("\n11. Testando processamento de mensagem com delegação...");
            console.log("Enviando mensagem: 'Traduza para português: Hello, world!'");
            
            const response = await chatAgent.processUserMessage("Traduza para português: Hello, world!");
            console.log(`Resposta: ${response.text}`);
        } else {
            console.log("\n11. Teste de processamento de mensagem ignorado (defina RUN_LLM_TESTS=true para executar)");
        }
        
        console.log("\n=== Teste concluído com sucesso! ===");
        
    } catch (error) {
        console.error("Erro durante o teste:", error);
    }
}

// Executa o teste
runTest().catch(console.error);
