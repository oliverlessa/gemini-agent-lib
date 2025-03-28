require('dotenv').config();
const { ChatAgent } = require('../');

/**
 * Exemplo de uso do ChatAgent com inicialização automática do LLM
 * 
 * Este script demonstra como usar o ChatAgent sem fornecer explicitamente um LLM,
 * permitindo que o agente crie automaticamente uma instância padrão do VertexAILLM.
 */
async function testChatAgentAutoLLM() {
    console.log("Iniciando teste do ChatAgent com inicialização automática do LLM...");
    
    // Cria uma instância do ChatAgent sem fornecer um LLM
    // Um VertexAILLM padrão será instanciado automaticamente
    const chatAgent = new ChatAgent({
        role: "Assistente Pessoal",
        objective: "Ajudar o usuário com suas perguntas e tarefas",
        context: "Você é um assistente pessoal útil e amigável chamado GeminiBot. Responda às perguntas do usuário de forma clara e concisa."
        // Observe que não estamos passando o parâmetro 'llm'
    });
    
    console.log("ChatAgent inicializado com LLM automático");
    
    // Teste 1: Primeira mensagem
    console.log("\n--- Teste 1: Primeira mensagem ---");
    const resposta1 = await chatAgent.processUserMessage("Olá! Quem é você?");
    console.log("Resposta 1:", resposta1.text);
    
    // Teste 2: Segunda mensagem (deve manter contexto)
    console.log("\n--- Teste 2: Segunda mensagem (deve manter contexto) ---");
    const resposta2 = await chatAgent.processUserMessage("Qual é o seu propósito?");
    console.log("Resposta 2:", resposta2.text);
    
    // Teste 3: Adicionando uma ferramenta simples
    console.log("\n--- Teste 3: Adicionando uma ferramenta simples ---");
    
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
    
    // Teste 3: Usando a ferramenta de calculadora
    console.log("\n--- Teste 3: Usando a ferramenta de calculadora ---");
    const resposta3 = await chatAgent.processUserMessage("Quanto é 123 + 456?");
    console.log("Resposta 3:", resposta3.text);
    
    // Teste 4: Limpando histórico
    console.log("\n--- Teste 4: Limpando histórico ---");
    chatAgent.clearHistory();
    const resposta4 = await chatAgent.processUserMessage("Do que estávamos falando antes?");
    console.log("Resposta 4:", resposta4.text);
    
    console.log("\nTestes concluídos!");
}

// Executa o teste
testChatAgentAutoLLM().catch(error => {
    console.error("Erro durante o teste:", error);
    console.error("Nota: Certifique-se de que as variáveis de ambiente GOOGLE_CLOUD_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS estão configuradas corretamente.");
});
