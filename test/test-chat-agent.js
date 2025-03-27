require('dotenv').config();
const { ChatAgent } = require('../');
const VertexAILLM = require('../lib/vertex-ai-llm');

/**
 * Função para testar o ChatAgent
 */
async function testChatAgent() {
    console.log("Iniciando teste do ChatAgent...");
    
    // Inicializa o LLM no modo chat
    const llm = new VertexAILLM({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        modelName: "gemini-1.0-pro",
        mode: "chat",
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.2
        }
    });
    
    console.log("LLM inicializado no modo chat");
    
    // Cria uma instância do ChatAgent
    const chatAgent = new ChatAgent({
        role: "Assistente Pessoal",
        objective: "Ajudar o usuário com suas perguntas e tarefas",
        context: "Você é um assistente pessoal útil e amigável chamado GeminiBot. Responda às perguntas do usuário de forma clara e concisa.",
        llm: llm
    });
    
    console.log("ChatAgent inicializado");
    
    // Teste 1: Primeira mensagem
    console.log("\n--- Teste 1: Primeira mensagem ---");
    const resposta1 = await chatAgent.processUserMessage("Olá! Quem é você?");
    console.log("Resposta 1:", resposta1.text);
    
    // Teste 2: Segunda mensagem (deve manter contexto)
    console.log("\n--- Teste 2: Segunda mensagem (deve manter contexto) ---");
    const resposta2 = await chatAgent.processUserMessage("Qual é o seu propósito?");
    console.log("Resposta 2:", resposta2.text);
    
    // Teste 3: Pergunta sobre conversa anterior
    console.log("\n--- Teste 3: Pergunta sobre conversa anterior ---");
    const resposta3 = await chatAgent.processUserMessage("O que eu perguntei para você primeiro?");
    console.log("Resposta 3:", resposta3.text);
    
    // Teste 4: Adicionando ferramentas
    console.log("\n--- Teste 4: Adicionando ferramentas ---");
    
    // Definição da ferramenta de previsão do tempo
    const weatherTool = {
        name: "obter_previsao_tempo",
        description: "Obtém a previsão do tempo para uma cidade",
        parameters: {
            type: "OBJECT",
            properties: {
                cidade: {
                    type: "STRING",
                    description: "Nome da cidade"
                }
            },
            required: ["cidade"]
        },
        function: async (args) => {
            // Simulação de resposta
            return {
                cidade: args.cidade,
                temperatura: "25°C",
                condicao: "Ensolarado",
                umidade: "60%"
            };
        }
    };
    
    // Adiciona a ferramenta ao agente
    chatAgent.tools = [weatherTool];
    
    // Teste 4: Usando a ferramenta de previsão do tempo (com processamento automático de function calls)
    console.log("\n--- Teste 4: Usando a ferramenta de previsão do tempo ---");
    const resposta4 = await chatAgent.processUserMessage("Como está o tempo em São Paulo hoje?");
    console.log("Resposta 4:", resposta4.text);
    
    // Não é mais necessário verificar e processar manualmente a function call
    // O método processUserMessage já faz isso automaticamente
    
    // Teste 5: Verificando memória de longo prazo
    console.log("\n--- Teste 5: Verificando memória de longo prazo ---");
    const resposta5 = await chatAgent.processUserMessage("Qual foi a temperatura em São Paulo que você me informou?");
    console.log("Resposta 5:", resposta5.text);
    
    // Teste 6: Limpando histórico
    console.log("\n--- Teste 6: Limpando histórico ---");
    chatAgent.clearHistory();
    const resposta6 = await chatAgent.processUserMessage("Do que estávamos falando antes?");
    console.log("Resposta 6:", resposta6.text);
    
    // Teste 7: Iniciando nova conversa após limpar histórico
    console.log("\n--- Teste 7: Nova conversa após limpar histórico ---");
    const resposta7 = await chatAgent.processUserMessage("Olá novamente! Você se lembra de mim?");
    console.log("Resposta 7:", resposta7.text);
    
    // Teste 8: Adicionando outra ferramenta
    console.log("\n--- Teste 8: Adicionando outra ferramenta ---");
    
    // Definição da ferramenta de calculadora
    const calculatorTool = {
        name: "calcular",
        description: "Realiza cálculos matemáticos",
        parameters: {
            type: "OBJECT",
            properties: {
                expressao: {
                    type: "STRING",
                    description: "Expressão matemática a ser calculada"
                }
            },
            required: ["expressao"]
        },
        function: async (args) => {
            try {
                // AVISO: eval é usado apenas para demonstração
                // Em um ambiente de produção, use uma solução mais segura
                const resultado = eval(args.expressao);
                return {
                    expressao: args.expressao,
                    resultado: resultado
                };
            } catch (error) {
                return {
                    expressao: args.expressao,
                    erro: error.message
                };
            }
        }
    };
    
    // Adiciona a ferramenta ao agente
    chatAgent.tools = [weatherTool, calculatorTool];
    
    // Teste 9: Usando a ferramenta de calculadora (com processamento automático de function calls)
    console.log("\n--- Teste 9: Usando a ferramenta de calculadora ---");
    const resposta9 = await chatAgent.processUserMessage("Quanto é 123 + 456?");
    console.log("Resposta 9:", resposta9.text);
    
    // Não é mais necessário verificar e processar manualmente a function call
    // O método processUserMessage já faz isso automaticamente
    
    console.log("\nTestes concluídos!");
}

// Executa o teste
testChatAgent().catch(error => {
    console.error("Erro durante o teste:", error);
});
