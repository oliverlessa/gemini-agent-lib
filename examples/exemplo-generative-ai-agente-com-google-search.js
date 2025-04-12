const path = require('path'); // Importa o módulo path
// Carrega variáveis de ambiente do arquivo .env na raiz
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

// Importa componentes da biblioteca - Trocando VertexAILLM por GenerativeAILLM
const { Agent, GenerativeAILLM } = require('..'); // Importa GenerativeAILLM

/**
 * Função principal para testar o agente com Generative AI (Gemini) e Google Search
 */
async function testarAgenteGenerativeAI() {
    console.log("Iniciando teste do Agente com Generative AI (Gemini) e Google Search...");

    // Verifica se a API Key do Gemini foi fornecida
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("A variável de ambiente GEMINI_API_KEY não está definida. Por favor, defina-a no seu arquivo .env na raiz do projeto.");
    }

    // 1. Inicializa o LLM Generative AI
    const llm = new GenerativeAILLM({
        apiKey: process.env.GEMINI_API_KEY, // Usa a API Key do Gemini
        modelName: "gemini-2.0-flash-001", // Modelo Gemini
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.2
        }
        // projectId e location não são necessários
    });

    console.log("LLM Generative AI (Gemini) inicializado");

    // 2. Cria uma instância do Agente com Google Search habilitado
    const agente = new Agent({
        role: "Assistente de Pesquisa (Gemini)",
        objective: "Fornecer informações precisas e úteis usando Gemini e Google Search",
        context: "Você é um assistente de pesquisa baseado no Gemini, especializado em fornecer informações claras e concisas. Responda às perguntas do usuário de forma direta e objetiva. Cite as fontes de pesquisa utilizadas para responder às perguntas.",
        task: "Responda à pergunta: 'Quais são os principais benefícios da inteligência artificial?'",
        llm: llm, // Passa a instância do GenerativeAILLM
        enableGoogleSearch: true // Habilita o grounding via Google Search
    });

    console.log("Agente (Gemini) com Google Search inicializado");

    // 3. Executa a tarefa do agente
    console.log("\n--- Executando tarefa do agente (Gemini com Google Search) ---");
    const resposta = await agente.executeTask();
    console.log("\nResposta do agente:");
    console.log(resposta); // A resposta deve incluir as fontes se o grounding funcionou

    // 4. Teste com uma ferramenta (tool) - Usando o mesmo LLM GenerativeAILLM
    console.log("\n--- Teste com ferramenta (Gemini) ---");

    // Definição da ferramenta de calculadora (mesma do exemplo original)
    const calculadoraTool = {
        name: "calcular",
        description: "Realiza cálculos matemáticos",
        parameters: {
            type: "OBJECT", // Nota: O SDK GenerativeAI pode preferir FunctionDeclarationSchemaType.OBJECT
            properties: {
                expressao: {
                    type: "STRING", // Nota: O SDK GenerativeAI pode preferir FunctionDeclarationSchemaType.STRING
                    description: "Expressão matemática a ser calculada"
                }
            },
            required: ["expressao"]
        },
        function: async (args) => {
            try {
                // AVISO: eval é usado apenas para demonstração
                // Em um ambiente de produção, use uma solução mais segura
                console.log(`[Calculadora Tool] Executando: eval(${args.expressao})`);
                const resultado = eval(args.expressao);
                console.log(`[Calculadora Tool] Resultado: ${resultado}`);
                return {
                    expressao: args.expressao,
                    resultado: resultado
                };
            } catch (error) {
                console.error(`[Calculadora Tool] Erro: ${error.message}`);
                return {
                    expressao: args.expressao,
                    erro: error.message
                };
            }
        }
    };

    // Cria um novo agente com a ferramenta, usando o mesmo LLM GenerativeAILLM
    const agenteComTool = new Agent({
        role: "Assistente Matemático (Gemini)",
        objective: "Resolver problemas matemáticos usando Gemini",
        context: "Você é um assistente especializado em matemática baseado no Gemini. Use a ferramenta de cálculo quando necessário para resolver expressões matemáticas.",
        task: "Calcule o resultado de: 1234 * 5678",
        llm: llm, // Reutiliza a instância do GenerativeAILLM
        tools: [calculadoraTool] // Passa a ferramenta
    });

    console.log("Agente (Gemini) com ferramenta inicializado");

    // Executa a tarefa do agente com ferramenta
    console.log("\n--- Executando tarefa do agente com ferramenta (Gemini) ---");
    const respostaComTool = await agenteComTool.executeTask();
    console.log("\nResposta do agente com ferramenta:");
    // A resposta pode ser apenas o resultado numérico ou uma frase contendo o resultado,
    // dependendo de como o LLM decide responder após receber o resultado da ferramenta.
    console.log(respostaComTool);

    console.log("\nTestes (Generative AI) concluídos!");
}

// Executa o teste exemplo
testarAgenteGenerativeAI().catch(error => {
    console.error("Erro durante o teste (Generative AI):", error);
});
