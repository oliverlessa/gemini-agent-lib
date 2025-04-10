require('dotenv').config();
const { ChatAgent, GenerativeAILLM } = require('../');

/**
 * Exemplo simples de uso do ChatAgent
 * 
 * Este script demonstra como usar o ChatAgent para criar um assistente
 * conversacional que mantém o histórico de conversa entre interações.
 */
async function testChatAgentSimple() {
    console.log("Iniciando teste simples do ChatAgent...");
    
    // Inicializa o LLM no modo chat
    const llm = new GenerativeAILLM({
        apiKey: process.env.GEMINI_API_KEY,
        modelName: "gemini-2.0-flash-001",
        mode: "chat", // Importante: o modo deve ser "chat"
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
    
    // Teste 4: Adicionando uma ferramenta simples
    console.log("\n--- Teste 4: Adicionando uma ferramenta simples ---");
    
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
    chatAgent.tools = [calculatorTool];
    
    // Teste 4: Usando a ferramenta de calculadora (com processamento automático de function calls)
    console.log("\n--- Teste 4: Usando a ferramenta de calculadora ---");
    const resposta4 = await chatAgent.processUserMessage("Quanto é 123 + 456?");
    console.log("Resposta 4:", resposta4.text);
    
    // Não é mais necessário verificar e processar manualmente a function call
    // O método processUserMessage já faz isso automaticamente
    
    // Teste 6: Limpando histórico
    console.log("\n--- Teste 6: Limpando histórico ---");
    chatAgent.clearHistory();
    const resposta6 = await chatAgent.processUserMessage("Do que estávamos falando antes?");
    console.log("Resposta 6:", resposta6.text);
    
    console.log("\nTestes concluídos!");
}

// Executa o teste
testChatAgentSimple().catch(error => {
    console.error("Erro durante o teste:", error);
});
