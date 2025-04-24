// test-vertex-function-calling.js
require('dotenv').config();
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');

// Função principal de teste
async function testVertexFunctionCalling() {
    try {
        console.log("Iniciando teste de function calling com Vertex AI...");
        
        // Criar instância do VertexAILLM com credenciais do .env
        console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
        console.log("VERTEX_PROJECT_ID:", process.env.VERTEX_PROJECT_ID);
        
        const vertexLLM = new VertexAILLM({
            apiKey: process.env.VERTEX_API_KEY,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001", // ou outro modelo que suporte function calling
            mode: "oneshot" // ou "chat" para testar em modo de chat
        });
        
        // Definir apenas uma tool (função) para o agente
        // Nota: O Vertex AI suporta apenas uma ferramenta por vez
        console.log("Aviso: O Vertex AI suporta apenas uma ferramenta por vez");
        
        // Definir a função getWeather
        const tools = [
            {
                name: "getWeather",
                description: "Obtém informações meteorológicas para uma cidade específica",
                parameters: {
                    type: "object",
                    properties: {
                        city: {
                            type: "string",
                            description: "Nome da cidade"
                        },
                        unit: {
                            type: "string",
                            enum: ["celsius", "fahrenheit"],
                            description: "Unidade de temperatura (opcional)"
                        }
                    },
                    required: ["city"]
                },
                function: async (args) => {
                    console.log(`Chamada para getWeather com args:`, args);
                    // Retorna dados meteorológicos fictícios
                    return {
                        city: args.city,
                        temperature: Math.floor(Math.random() * 30) + 5, // 5-35°C
                        conditions: ["ensolarado", "nublado", "chuvoso", "tempestuoso"][Math.floor(Math.random() * 4)],
                        humidity: Math.floor(Math.random() * 60) + 30, // 30-90%
                        wind: Math.floor(Math.random() * 30), // 0-30 km/h
                        forecast: [
                            { day: "hoje", temp: Math.floor(Math.random() * 30) + 5, conditions: "ensolarado" },
                            { day: "amanhã", temp: Math.floor(Math.random() * 30) + 5, conditions: "parcialmente nublado" },
                            { day: "depois de amanhã", temp: Math.floor(Math.random() * 30) + 5, conditions: "chuvoso" }
                        ]
                    };
                }
            }
        ];
        
        // Criar o agente com as tools
        const agenteFunctionCalling = new Agent({
            role: "Assistente de Dados",
            objective: "Fornecer informações precisas e úteis usando as ferramentas disponíveis",
            context: `Você é um assistente de IA avançado com acesso a várias ferramentas. 
                     Quando o usuário fizer perguntas que exijam dados externos, use as ferramentas apropriadas para obter esses dados.
                     Sempre que possível, use a ferramenta mais adequada para a tarefa.
                     Após receber os resultados da ferramenta, forneça uma resposta clara e informativa baseada nesses dados.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            tools: tools
        });
        
        // Definir tarefas que incentivem o uso das tools
        // const tarefas = [
        //     "Como está o clima em São Paulo hoje?",
        //     "Pesquise informações sobre inteligência artificial",
        //     "Calcule as estatísticas para os seguintes números: 5, 10, 15, 20, 25",
        //     "Qual é a previsão do tempo para o Rio de Janeiro nos próximos dias?",
        //     "Encontre os 5 principais resultados para 'machine learning'"
        // ];
        const tarefas = [
            "Como está o clima em São Paulo hoje?"
        ];
        
        // Executar cada tarefa sequencialmente
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agenteFunctionCalling.task = tarefa;
            
            try {
                const resposta = await agenteFunctionCalling.executeTask();
                console.log(`\nResposta do Agente:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste:", error);
    }
}

// Executar o teste
testVertexFunctionCalling();
