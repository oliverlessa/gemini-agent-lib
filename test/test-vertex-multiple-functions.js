// test-vertex-multiple-functions.js
require('dotenv').config();
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');

// Importa as tool definitions dos arquivos na pasta 'tools/'
const weatherTool = require('../lib/tools/weather-tool');
const restaurantTool = require('../lib/tools/restaurant-tool');

// Função principal de teste com múltiplas funções
async function testVertexMultipleFunctions() {
    try {
        console.log("Iniciando teste de múltiplas funções com Vertex AI...");
        
        // Criar instância do VertexAILLM com credenciais do .env
        // console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
        // console.log("VERTEX_PROJECT_ID:", process.env.VERTEX_PROJECT_ID);
        
        const vertexLLM = new VertexAILLM({
            apiKey: process.env.VERTEX_API_KEY,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001", // ou outro modelo que suporte function calling
            mode: "oneshot" // ou "chat" para testar em modo de chat
        });
        
        console.log("Usando as ferramentas importadas do diretório tools/...");
        
        // Array de tools (agora usando as tools definidas com ToolBuilder)
        const tools = [
            weatherTool,
            restaurantTool
        ];
        
        // Definir todas as tarefas em um único array
        const tarefas = [
            // Tarefas relacionadas ao clima
            "Como está o clima em São Paulo hoje?",
            "Qual é a previsão do tempo para Curitiba amanhã?",
            // Tarefas relacionadas a restaurantes
            "Quais são os melhores restaurantes em Belo Horizonte?",
            "Quero encontrar restaurantes italianos no Rio de Janeiro",
            "Sugira restaurantes baratos em Salvador"
        ];
        
        // Criar um único agente com todas as ferramentas
        // console.log("\n\n=== TESTANDO AGENTE COM MÚLTIPLAS FERRAMENTAS ===");
        const agente = new Agent({
            role: "Assistente Multifuncional",
            objective: "Fornecer informações sobre clima e restaurantes",
            context: `Você é um assistente de IA multifuncional que pode fornecer informações sobre clima e restaurantes.
                     Use a ferramenta weather para obter dados meteorológicos atuais e previsões.
                     Use a ferramenta restaurant para encontrar restaurantes em diferentes localizações.
                     Após receber os resultados, forneça uma resposta clara e informativa baseada nesses dados.
                     Analise cuidadosamente a pergunta do usuário para determinar qual ferramenta usar.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            tools: tools // Passando o array de ferramentas
        });
        // console.log("\n\n=== TESTANDO AGENTE COM MÚLTIPLAS FERRAMENTAS ===");
        // const agente = new Agent({
        //     role: "Assistente Multifuncional",
        //     objective: "Fornecer informações sobre clima e restaurantes",
        //     context: `Você é um assistente de IA multifuncional que pode fornecer informações sobre clima e restaurantes.
        //              Analise cuidadosamente a pergunta do usuário para determinar qual ferramenta usar.
        //              Após receber os resultados, forneça uma resposta clara e informativa baseada nesses dados.`,
        //     task: "", // Será definida abaixo
        //     llm: vertexLLM,
        //     tools: tools // Passando o array de ferramentas
        // });
        
        // Executar todas as tarefas com o mesmo agente
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agente.task = tarefa;
            
            try {
                const resposta = await agente.executeTask();
                console.log(`\nResposta do Agente Multifuncional:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste:", error);
    }
}

// Executar o teste
testVertexMultipleFunctions();
