// Carrega variáveis de ambiente
require('dotenv').config();

// Importa componentes da biblioteca
const { Agent, VertexAILLM } = require('gemini-agent-lib');

/**
 * Função principal para testar o agente com Vertex AI
 */
async function testarAgenteVertexAI() {
    console.log("Iniciando teste do Agente com Vertex AI...");
    
    // 1. Inicializa o LLM Vertex AI
    const llm = new VertexAILLM({
        projectId: process.env.VERTEX_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        modelName: "gemini-2.0-flash-001",
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.2
        }
    });
    
    console.log("LLM Vertex AI inicializado");
    
    // 2. Cria uma instância do Agente
    const agente = new Agent({
        role: "Assistente de Pesquisa",
        objective: "Fornecer informações precisas e úteis",
        context: "Você é um assistente de pesquisa especializado em fornecer informações claras e concisas. Responda às perguntas do usuário de forma direta e objetiva. Cite as fontes de pesquisa utilizadas para responder às perguntas.",
        task: "Responda à pergunta: 'Quais são os principais benefícios da inteligência artificial?'",
        llm: llm,
        enableGoogleSearch: true
    });
    
    console.log("Agente inicializado");
    
    // 3. Executa a tarefa do agente
    console.log("\n--- Executando tarefa do agente ---");
    const resposta = await agente.executeTask();
    console.log("\nResposta do agente:");
    console.log(resposta);
    
    // 4. Teste com uma ferramenta (tool)
    console.log("\n--- Teste com ferramenta ---");
    
    // Definição da ferramenta de calculadora
    const calculadoraTool = {
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
    
    // Cria um novo agente com a ferramenta
    const agenteComTool = new Agent({
        role: "Assistente Matemático",
        objective: "Resolver problemas matemáticos",
        context: "Você é um assistente especializado em matemática. Use a ferramenta de cálculo quando necessário para resolver expressões matemáticas.",
        task: "Calcule o resultado de: 1234 * 5678",
        llm: llm,
        tools: [calculadoraTool]
    });
    
    console.log("Agente com ferramenta inicializado");
    
    // Executa a tarefa do agente com ferramenta
    console.log("\n--- Executando tarefa do agente com ferramenta ---");
    const respostaComTool = await agenteComTool.executeTask();
    console.log("\nResposta do agente com ferramenta:");
    console.log(respostaComTool);
    
    console.log("\nTestes concluídos!");
}

// Executa o teste exemplo
testarAgenteVertexAI().catch(error => {
    console.error("Erro durante o teste:", error);
});
