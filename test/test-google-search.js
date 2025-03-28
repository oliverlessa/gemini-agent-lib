// test-google-search.js
require('dotenv').config();
const GenerativeAILLM = require('../lib/generative-ai-llm');
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');

// Função principal de teste
async function testGoogleSearch() {
    try {
        console.log("Iniciando teste de Google Search Retrieval...");
        
        // Criar instância do GenerativeAILLM com a API key do .env
        const genAILLM = new GenerativeAILLM({
            apiKey: process.env.GEMINI_API_KEY,
            modelName: "gemini-2.0-flash", // ou outro modelo que suporte Google Search
            mode: "oneshot"
        });

        const vertexLLM = new VertexAILLM({
            credentialsPath: process.env.VERTEX_CREDENTIALS_PATH,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash",
            mode: "oneshot",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2
            }
        });
        
        // Criar o agente com Google Search habilitado
        const agenteGoogleSearch = new Agent({
            role: "Assistente de Pesquisa",
            objective: "Fornecer informações precisas e atualizadas usando o Google Search",
            context: `Você é um assistente de IA avançado com acesso ao Google Search.
                     Quando o usuário fizer perguntas que exijam informações atualizadas ou específicas,
                     use o Google Search para obter dados relevantes.
                     Após receber os resultados da pesquisa, forneça uma resposta clara e informativa
                     baseada nesses dados. Cite e liste todas as fontes de informações encontradas. Se as fontes forem sites, liste os links completos.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            enableGoogleSearch: true // Habilitando o Google Search
        });
        
        // Definir tarefas que incentivem o uso do Google Search
        const tarefas = [
            "Quais são as notícias mais recentes sobre inteligência artificial?",
            "Qual é a população atual do Brasil?",
            "Quem é o atual presidente da França?",
            "Quais são os filmes mais populares em cartaz atualmente?"
        ];
        
        // Executar cada tarefa sequencialmente
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agenteGoogleSearch.task = tarefa;
            
            try {
                const resposta = await agenteGoogleSearch.executeTask();
                console.log(`\nResposta do Agente com Google Search:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
        // Teste com Google Search e Function Calling juntos
        console.log("\n\n=== TESTANDO AGENTE COM GOOGLE SEARCH E FUNCTION CALLING ===");
        
        // Definir uma ferramenta simples
        const calculatorTool = {
            name: "calculate",
            description: "Realiza cálculos matemáticos",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "Expressão matemática a ser calculada"
                    }
                },
                required: ["expression"]
            },
            function: async (args) => {
                console.log(`Calculando: ${args.expression}`);
                try {
                    // Avalia a expressão de forma segura (apenas operações básicas)
                    // Nota: Em produção, use uma biblioteca segura para avaliar expressões
                    const sanitizedExpression = args.expression.replace(/[^0-9+\-*/().]/g, '');
                    const result = eval(sanitizedExpression);
                    return { result: result, expression: args.expression };
                } catch (error) {
                    return { error: `Erro ao calcular: ${error.message}`, expression: args.expression };
                }
            }
        };
        
        // Criar o agente com Google Search e Function Calling
        const agenteCombinado = new Agent({
            role: "Assistente Multifuncional",
            objective: "Fornecer informações e realizar cálculos",
            context: `Você é um assistente de IA avançado com acesso ao Google Search e à capacidade de realizar cálculos.
                     Use o Google Search para obter informações atualizadas.
                     Use a ferramenta de cálculo para resolver expressões matemáticas.
                     Combine essas capacidades para fornecer respostas completas e precisas.`,
            task: "", // Será definida abaixo
            llm: genAILLM,
            tools: [calculatorTool],
            enableGoogleSearch: true
        });
        
        // Definir tarefas que incentivem o uso combinado
        const tarefasCombinadas = [
            "Qual é a população do Japão e quanto isso representa em porcentagem da população mundial?",
            "Qual é o PIB do Brasil e quanto seria se crescesse 5% no próximo ano?"
        ];
        
        // Executar cada tarefa combinada
        for (const tarefa of tarefasCombinadas) {
            console.log(`\n\n--- Executando tarefa combinada: "${tarefa}" ---`);
            agenteCombinado.task = tarefa;
            
            try {
                const resposta = await agenteCombinado.executeTask();
                console.log(`\nResposta do Agente Combinado:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste:", error);
    }
}

// Função para testar o Google Search com Vertex AI
async function testGoogleSearchVertexAI() {
    try {
        console.log("\n\n========================================");
        console.log("Iniciando teste de Google Search com Vertex AI...");
        console.log("========================================\n");
        
        // Criar instância do VertexAILLM com credenciais do .env
        const vertexLLM = new VertexAILLM({
            apiKey: process.env.VERTEX_API_KEY,
            credentialsPath: process.env.VERTEX_CREDENTIALS_PATH,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001", // ou outro modelo que suporte Google Search
            mode: "oneshot" // ou "chat" para testar em modo de chat
        });
        
        // Criar o agente com Google Search habilitado
        const agenteGoogleSearchVertex = new Agent({
            role: "Assistente de Pesquisa Vertex",
            objective: "Fornecer informações precisas e atualizadas usando o Google Search via Vertex AI",
            context: `Você é um assistente de IA avançado com acesso ao Google Search.
                     Quando o usuário fizer perguntas que exijam informações atualizadas ou específicas,
                     use o Google Search para obter dados relevantes.
                     Após receber os resultados da pesquisa, forneça uma resposta clara e informativa
                     baseada nesses dados, citando as fontes quando apropriado.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            enableGoogleSearch: true // Habilitando o Google Search
        });
        
        // Definir tarefas que incentivem o uso do Google Search
        const tarefasVertex = [
            "Quais são as últimas notícias sobre tecnologia?",
            "Qual é a capital da Austrália e quantos habitantes tem?"
        ];
        
        // Executar cada tarefa sequencialmente
        for (const tarefa of tarefasVertex) {
            console.log(`\n\n--- Executando tarefa com Vertex AI: "${tarefa}" ---`);
            agenteGoogleSearchVertex.task = tarefa;
            
            try {
                const resposta = await agenteGoogleSearchVertex.executeTask();
                console.log(`\nResposta do Agente Vertex com Google Search:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}" com Vertex AI:`, error);
            }
        }
        
        // Teste com Google Search e Function Calling juntos no Vertex AI
        console.log("\n\n=== TESTANDO AGENTE VERTEX AI COM GOOGLE SEARCH E FUNCTION CALLING ===");
        
        // Definir uma ferramenta simples
        const calculatorTool = {
            name: "calculate",
            description: "Realiza cálculos matemáticos",
            parameters: {
                type: "object",
                properties: {
                    expression: {
                        type: "string",
                        description: "Expressão matemática a ser calculada"
                    }
                },
                required: ["expression"]
            },
            function: async (args) => {
                console.log(`Calculando: ${args.expression}`);
                try {
                    // Avalia a expressão de forma segura (apenas operações básicas)
                    const sanitizedExpression = args.expression.replace(/[^0-9+\-*/().]/g, '');
                    const result = eval(sanitizedExpression);
                    return { result: result, expression: args.expression };
                } catch (error) {
                    return { error: `Erro ao calcular: ${error.message}`, expression: args.expression };
                }
            }
        };
        
        // Criar o agente com Google Search e Function Calling
        const agenteCombinadoVertex = new Agent({
            role: "Assistente Multifuncional Vertex",
            objective: "Fornecer informações e realizar cálculos usando Vertex AI",
            context: `Você é um assistente de IA avançado com acesso ao Google Search e à capacidade de realizar cálculos.
                     Use o Google Search para obter informações atualizadas.
                     Use a ferramenta de cálculo para resolver expressões matemáticas.
                     Combine essas capacidades para fornecer respostas completas e precisas.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            tools: [calculatorTool],
            enableGoogleSearch: true
        });
        
        // Definir tarefas que incentivem o uso combinado
        const tarefasCombinadasVertex = [
            "Qual é a população da Índia e quanto isso representa em porcentagem da população da Ásia?"
        ];
        
        // Executar cada tarefa combinada
        for (const tarefa of tarefasCombinadasVertex) {
            console.log(`\n\n--- Executando tarefa combinada com Vertex AI: "${tarefa}" ---`);
            agenteCombinadoVertex.task = tarefa;
            
            try {
                const resposta = await agenteCombinadoVertex.executeTask();
                console.log(`\nResposta do Agente Combinado Vertex:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}" com Vertex AI:`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste com Vertex AI:", error);
    }
}

// Executar os testes
async function runTests() {
    // Primeiro teste com GenerativeAI
    // await testGoogleSearch();
    
    // Depois teste com Vertex AI
    await testGoogleSearchVertexAI();
}

// Iniciar os testes
runTests();
