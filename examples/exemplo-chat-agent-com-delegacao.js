/**
 * Exemplo de uso do ChatAgent com delegação para agentes especialistas
 * 
 * Este exemplo demonstra como configurar e utilizar o ChatAgent com a funcionalidade
 * de delegação para agentes especialistas.
 */

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const ChatAgent = require('../lib/chat-agent');
const VertexAILLM = require('../lib/vertex-ai-llm');
const AgentRegistry = require('../lib/agent-registry');
const readline = require('readline');

// Exemplo de ferramenta que pode ser usada diretamente pelo ChatAgent
const calculatorTool = {
    name: "calculator",
    description: "Realiza cálculos matemáticos simples",
    parameters: {
        type: "OBJECT",
        properties: {
            expression: {
                type: "STRING",
                description: "Expressão matemática a ser calculada (ex: 2 + 2, 5 * 3, etc.)"
            }
        },
        required: ["expression"]
    },
    function: async (args) => {
        try {
            // Avaliação segura da expressão (em um ambiente real, use uma biblioteca segura)
            // NOTA: eval() não é seguro para uso em produção, use apenas para demonstração
            const result = eval(args.expression);
            return { result };
        } catch (error) {
            return { error: `Erro ao calcular: ${error.message}` };
        }
    }
};

// Configuração dos agentes especialistas
const specialistAgentsConfig = {
    "Tradutor EN-PT": {
        objective: "Traduzir textos do inglês para o português brasileiro com precisão e naturalidade.",
        context: `Você é um tradutor especializado em traduzir textos do inglês para o português brasileiro.
Sua tarefa é fornecer traduções precisas e naturais, mantendo o tom e o estilo do texto original.
Adapte expressões idiomáticas e referências culturais quando necessário para que façam sentido em português.
Forneça apenas a tradução, sem explicações adicionais, a menos que seja solicitado.`,
        llmMode: 'oneshot',
        llmModelName: "gemini-1.0-pro", // Modelo específico para este especialista
        generationConfig: {
            temperature: 0.1 // Temperatura baixa para traduções mais precisas
        }
    },
    "Pesquisador Financeiro": {
        objective: "Fornecer análises e informações sobre mercados financeiros, ações e investimentos.",
        context: `Você é um pesquisador financeiro especializado.
Sua tarefa é analisar informações financeiras e fornecer insights claros e objetivos.
Ao responder perguntas sobre investimentos, sempre mencione que são apenas análises e não recomendações formais.
Seja preciso com números e dados, e cite fontes quando possível.`,
        enableGoogleSearch: true,
        llmMode: 'oneshot',
        generationConfig: {
            temperature: 0.3
        }
    },
    "Redator Técnico": {
        objective: "Criar documentação técnica clara e concisa para produtos e serviços de tecnologia.",
        context: `Você é um redator técnico especializado em criar documentação para produtos e serviços de tecnologia.
Sua tarefa é transformar informações técnicas complexas em conteúdo claro, conciso e fácil de entender.
Use linguagem simples e direta, evitando jargões desnecessários.
Organize o conteúdo de forma lógica, com títulos e subtítulos quando apropriado.`,
        llmMode: 'oneshot',
        generationConfig: {
            temperature: 0.2
        }
    }
};

async function main() {
    try {
        console.log("Inicializando ChatAgent com delegação para especialistas...");
        
        // Opção 1: Criar o ChatAgent com delegação habilitada e configuração de especialistas
        const chatAgent = new ChatAgent({
            role: "Assistente Virtual Inteligente",
            objective: "Ajudar o usuário com suas dúvidas e tarefas, delegando para especialistas quando necessário",
            llm: new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                modelName: "gemini-1.5-flash-001", // Modelo principal para o ChatAgent
                mode: "chat",
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7 // Temperatura mais alta para conversação geral
                }
            }),
            tools: [calculatorTool], // Ferramentas disponíveis diretamente para o ChatAgent
            enableGoogleSearch: false, // O ChatAgent principal não precisa de Google Search
            enableSpecialistDelegation: true, // Habilita a delegação para especialistas
            specialistAgentsConfig: specialistAgentsConfig // Configuração dos especialistas
        });
        
        // Opção 2 (alternativa): Criar o ChatAgent sem delegação e habilitá-la depois
        /*
        const chatAgent = new ChatAgent({
            role: "Assistente Virtual Inteligente",
            objective: "Ajudar o usuário com suas dúvidas e tarefas",
            llm: new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                modelName: "gemini-1.5-flash-001",
                mode: "chat"
            }),
            tools: [calculatorTool]
        });
        
        // Habilitar a delegação posteriormente
        chatAgent.enableSpecialistDelegation(specialistAgentsConfig);
        */
        
        // Opção 3 (alternativa): Usar um AgentRegistry compartilhado
        /*
        const sharedRegistry = new AgentRegistry(specialistAgentsConfig);
        
        const chatAgent = new ChatAgent({
            role: "Assistente Virtual Inteligente",
            objective: "Ajudar o usuário com suas dúvidas e tarefas",
            llm: new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                modelName: "gemini-1.5-flash-001",
                mode: "chat"
            }),
            tools: [calculatorTool],
            enableSpecialistDelegation: true,
            agentRegistry: sharedRegistry // Usar o registry compartilhado
        });
        */
        
        // Verificar os especialistas disponíveis
        const availableRoles = chatAgent.getAvailableSpecialistRoles();
        console.log(`Especialistas disponíveis: ${availableRoles.join(', ')}`);
        
        // Exemplo de como adicionar um novo especialista dinamicamente
        chatAgent.registerSpecialist("Analista de Dados", {
            objective: "Analisar dados e gerar insights estatísticos.",
            context: "Você é um analista de dados especializado em estatística e visualização de dados. Forneça análises claras e objetivas.",
            llmMode: 'oneshot'
        });
        
        console.log(`Especialistas após adição: ${chatAgent.getAvailableSpecialistRoles().join(', ')}`);
        
        // Interface de linha de comando para interagir com o ChatAgent
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log("\n=== ChatAgent com Delegação para Especialistas ===");
        console.log("Digite 'sair' para encerrar o programa.");
        console.log("Exemplos de mensagens para testar a delegação:");
        console.log("- \"Traduza para português: The quick brown fox jumps over the lazy dog.\"");
        console.log("- \"Qual a situação atual do mercado de ações?\"");
        console.log("- \"Crie uma documentação técnica para uma API REST.\"");
        console.log("- \"Quanto é 25 * 48?\" (Usa a ferramenta calculator diretamente)");
        console.log("- \"Me conte sobre o clima hoje.\" (Responde diretamente sem delegação)\n");
        
        // Função para processar mensagens do usuário
        async function processUserInput() {
            rl.question('Você: ', async (input) => {
                if (input.toLowerCase() === 'sair') {
                    console.log("Encerrando o programa...");
                    rl.close();
                    return;
                }
                
                try {
                    console.log("Processando...");
                    const response = await chatAgent.processUserMessage(input);
                    console.log(`\nAssistente: ${response.text}\n`);
                } catch (error) {
                    console.error("Erro ao processar mensagem:", error);
                    console.log("\nAssistente: Desculpe, ocorreu um erro ao processar sua mensagem.\n");
                }
                
                // Continua o loop
                processUserInput();
            });
        }
        
        // Inicia o loop de processamento
        processUserInput();
        
    } catch (error) {
        console.error("Erro ao inicializar o ChatAgent:", error);
    }
}

// Executa o programa
main().catch(console.error);
