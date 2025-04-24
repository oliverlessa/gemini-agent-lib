// exemplo-tool-factory.js
require('dotenv').config();

/**
 * Este exemplo demonstra como usar o padrão factory para criar e configurar
 * instâncias personalizadas de tools para diferentes agentes.
 */

const Agent = require('../lib/agent');
const VertexAILLM = require('../lib/vertex-ai-llm');

// Importar as factories das tools
const vertexSearchRetrieverTool = require('../lib/tools/vertex-ai-search-retriever-tool');
const weatherTool = require('../lib/tools/weather-tool');
const restaurantTool = require('../lib/tools/restaurant-tool');

async function exemploToolFactory() {
    try {
        console.log("=== Exemplo de Uso do Padrão Factory para Tools ===\n");
        
        // Criar instância do VertexAILLM
        const vertexLLM = new VertexAILLM({
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001",
            mode: "oneshot",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2
            }
        });
        
        // 1. Criar instâncias personalizadas das tools
        console.log("1. Criando instâncias personalizadas das tools:");
        
        // Tool de busca no Vertex AI Search para o site da Fainor
        const fainorSearchTool = vertexSearchRetrieverTool({
            projectId: process.env.VERTEX_PROJECT_ID,
            location: "global",
            dataStoreId: "site-fainor_1714866492522",
            maxResults: 5,
            description: "Ferramenta especializada para buscar informações sobre a Fainor no Vertex AI Search"
        });
        console.log("   - Tool de busca para o site da Fainor criada com descrição personalizada");
        
        // Tool de clima com unidade em Fahrenheit
        const fahrenheitWeatherTool = weatherTool({
            unit: "fahrenheit"
        });
        console.log("   - Tool de clima com unidade em Fahrenheit criada");
        
        // Tool de restaurantes com culinária italiana
        const italianRestaurantTool = restaurantTool({
            cuisine: "Italiana",
            limit: 5
        });
        console.log("   - Tool de restaurantes com culinária italiana criada");
        
        // 2. Criar diferentes agentes com diferentes configurações de tools
        console.log("\n2. Criando agentes com diferentes configurações de tools:");
        
        // Agente de pesquisa acadêmica
        const agentePesquisa = new Agent({
            role: "Assistente de Pesquisa Acadêmica",
            objective: "Fornecer informações precisas sobre a Fainor",
            context: `Você é um assistente especializado em informações sobre a Fainor.
                     Use a ferramenta search_private_knowledge_base para encontrar informações relevantes.`,
            task: "Encontre informações sobre os cursos de pós-graduação da Fainor",
            llm: vertexLLM,
            tools: [fainorSearchTool] // Usando apenas a tool de busca configurada para a Fainor
        });
        console.log("   - Agente de Pesquisa Acadêmica criado");
        
        // Agente de turismo
        // const agenteTurismo = new Agent({
        //     role: "Guia de Turismo",
        //     objective: "Ajudar turistas a encontrar informações sobre clima e restaurantes",
        //     context: `Você é um guia de turismo virtual.
        //              Use as ferramentas disponíveis para fornecer informações úteis aos turistas.`,
        //     task: "Sugira restaurantes italianos em Salvador e informe o clima atual",
        //     llm: vertexLLM,
        //     tools: [fahrenheitWeatherTool, italianRestaurantTool] // Usando as tools personalizadas
        // });
        // console.log("   - Agente de Turismo criado");
        
        // // 3. Executar os agentes
        // console.log("\n3. Executando os agentes:");
        
        // // Executar o agente de pesquisa
        console.log("\n--- Executando o Agente de Pesquisa Acadêmica ---");
        try {
            const respostaPesquisa = await agentePesquisa.executeTask();
            console.log(`\nResposta do Agente de Pesquisa:\n${respostaPesquisa}`);
        } catch (error) {
            console.error("Erro ao executar o Agente de Pesquisa:", error);
        }
        
        // Executar o agente de turismo
        // console.log("\n--- Executando o Agente de Turismo ---");
        // try {
        //     const respostaTurismo = await agenteTurismo.executeTask();
        //     console.log(`\nResposta do Agente de Turismo:\n${respostaTurismo}`);
        // } catch (error) {
        //     console.error("Erro ao executar o Agente de Turismo:", error);
        // }
        
    } catch (error) {
        console.error("Erro ao executar o exemplo:", error);
    }
}

// Executar o exemplo
exemploToolFactory();
