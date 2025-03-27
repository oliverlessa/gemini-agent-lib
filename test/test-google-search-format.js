// test-google-search-format.js
const Agent = require('../lib/agent');
const GenerativeAILLM = require('../lib/generative-ai-llm');
const VertexAILLM = require('../lib/vertex-ai-llm');

// Função para testar o formato do Google Search Retrieval
function testGoogleSearchFormat() {
    console.log("Testando o formato do Google Search Retrieval...");
    
    // Teste 1: Apenas Google Search habilitado com Gemini API
    console.log("\n=== Teste 1: Apenas Google Search habilitado com Gemini API ===");
    const mockGeminiLLM = new GenerativeAILLM({
        apiKey: "mock-api-key",
        modelName: "gemini-2.0-flash",
        mode: "oneshot"
    });
    // Sobrescreve o método generateContent para evitar chamadas reais à API
    mockGeminiLLM.generateContent = () => ({ text: "Resposta de teste" });
    
    const agentOnlyGoogleSearch = new Agent({
        role: "Agente de Teste",
        objective: "Testar o formato do Google Search",
        context: "Contexto de teste",
        task: "Tarefa de teste",
        llm: mockGeminiLLM,
        enableGoogleSearch: true
    });
    
    const toolsFormatOnlyGoogleSearch = agentOnlyGoogleSearch.prepareToolsForLLM();
    console.log("Formato das ferramentas com apenas Google Search:");
    console.log(JSON.stringify(toolsFormatOnlyGoogleSearch, null, 2));
    
    // Verificar se o formato está correto para Gemini API
    const expectedFormatOnlyGoogleSearch = [
        {
            google_search: {}
        }
    ];
    
    console.log("\nFormato esperado:");
    console.log(JSON.stringify(expectedFormatOnlyGoogleSearch, null, 2));
    
    // Verificar se os formatos são iguais
    const actualJsonOnlyGoogleSearch = JSON.stringify(toolsFormatOnlyGoogleSearch);
    const expectedJsonOnlyGoogleSearch = JSON.stringify(expectedFormatOnlyGoogleSearch);
    
    if (actualJsonOnlyGoogleSearch === expectedJsonOnlyGoogleSearch) {
        console.log("\n✅ O formato com apenas Google Search está correto!");
    } else {
        console.log("\n❌ O formato com apenas Google Search não está correto!");
        console.log("\nDiferenças:");
        compareObjects(toolsFormatOnlyGoogleSearch, expectedFormatOnlyGoogleSearch);
    }
    
    // Teste 2: Apenas Google Search habilitado com Vertex AI
    console.log("\n=== Teste 2: Apenas Google Search habilitado com Vertex AI ===");
    const mockVertexLLM = new VertexAILLM({
        apiKey: "mock-api-key",
        projectId: "mock-project-id",
        location: "us-central1",
        modelName: "gemini-2.0-flash-001",
        mode: "oneshot"
    });
    // Sobrescreve o método generateContent para evitar chamadas reais à API
    mockVertexLLM.generateContent = () => ({ text: "Resposta de teste" });
    
    const agentOnlyGoogleSearchVertex = new Agent({
        role: "Agente de Teste Vertex",
        objective: "Testar o formato do Google Search com Vertex AI",
        context: "Contexto de teste",
        task: "Tarefa de teste",
        llm: mockVertexLLM,
        enableGoogleSearch: true
    });
    
    const toolsFormatOnlyGoogleSearchVertex = agentOnlyGoogleSearchVertex.prepareToolsForLLM();
    console.log("Formato das ferramentas com apenas Google Search (Vertex AI):");
    console.log(JSON.stringify(toolsFormatOnlyGoogleSearchVertex, null, 2));
    
    // Verificar se o formato está correto para Vertex AI
    const expectedFormatOnlyGoogleSearchVertex = [
        {
            google_search: {}
        }
    ];
    
    console.log("\nFormato esperado (Vertex AI):");
    console.log(JSON.stringify(expectedFormatOnlyGoogleSearchVertex, null, 2));
    
    // Verificar se os formatos são iguais
    const actualJsonOnlyGoogleSearchVertex = JSON.stringify(toolsFormatOnlyGoogleSearchVertex);
    const expectedJsonOnlyGoogleSearchVertex = JSON.stringify(expectedFormatOnlyGoogleSearchVertex);
    
    if (actualJsonOnlyGoogleSearchVertex === expectedJsonOnlyGoogleSearchVertex) {
        console.log("\n✅ O formato com apenas Google Search (Vertex AI) está correto!");
    } else {
        console.log("\n❌ O formato com apenas Google Search (Vertex AI) não está correto!");
        console.log("\nDiferenças:");
        compareObjects(toolsFormatOnlyGoogleSearchVertex, expectedFormatOnlyGoogleSearchVertex);
    }
    
    // Teste 3: Google Search e Function Declarations juntos com Gemini API
    console.log("\n=== Teste 3: Google Search e Function Declarations juntos com Gemini API ===");
    const agentCombined = new Agent({
        role: "Agente de Teste",
        objective: "Testar o formato combinado",
        context: "Contexto de teste",
        task: "Tarefa de teste",
        llm: mockGeminiLLM,
        tools: [
            {
                name: "get_current_weather",
                description: "Obtém informações meteorológicas para uma localização específica",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "Nome da cidade ou localização"
                        }
                    },
                    required: ["location"]
                },
                function: async (args) => ({ weather: "sunny" })
            }
        ],
        enableGoogleSearch: true
    });
    
    const toolsFormatCombined = agentCombined.prepareToolsForLLM();
    console.log("Formato das ferramentas combinadas:");
    console.log(JSON.stringify(toolsFormatCombined, null, 2));
    
    // Verificar se o formato está correto para Gemini API com Function Declarations
    const expectedFormatCombined = [
        {
            functionDeclarations: [
                {
                    name: "get_current_weather",
                    description: "Obtém informações meteorológicas para uma localização específica",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            location: {
                                type: "STRING",
                                description: "Nome da cidade ou localização"
                            }
                        },
                        required: ["location"]
                    }
                }
            ],
            google_search: {} // Formato para Gemini API
        }
    ];
    
    console.log("\nFormato esperado:");
    console.log(JSON.stringify(expectedFormatCombined, null, 2));
    
    // Verificar se os formatos são iguais
    const actualJsonCombined = JSON.stringify(toolsFormatCombined);
    const expectedJsonCombined = JSON.stringify(expectedFormatCombined);
    
    if (actualJsonCombined === expectedJsonCombined) {
        console.log("\n✅ O formato combinado está correto!");
    } else {
        console.log("\n❌ O formato combinado não está correto!");
        console.log("\nDiferenças:");
        compareObjects(toolsFormatCombined, expectedFormatCombined);
    }
    
    // Teste 4: Google Search e Function Declarations juntos com Vertex AI
    console.log("\n=== Teste 4: Google Search e Function Declarations juntos com Vertex AI ===");
    const agentCombinedVertex = new Agent({
        role: "Agente de Teste Vertex",
        objective: "Testar o formato combinado com Vertex AI",
        context: "Contexto de teste",
        task: "Tarefa de teste",
        llm: mockVertexLLM,
        tools: [
            {
                name: "get_current_weather",
                description: "Obtém informações meteorológicas para uma localização específica",
                parameters: {
                    type: "object",
                    properties: {
                        location: {
                            type: "string",
                            description: "Nome da cidade ou localização"
                        }
                    },
                    required: ["location"]
                },
                function: async (args) => ({ weather: "sunny" })
            }
        ],
        enableGoogleSearch: true
    });
    
    const toolsFormatCombinedVertex = agentCombinedVertex.prepareToolsForLLM();
    console.log("Formato das ferramentas combinadas com Vertex AI:");
    console.log(JSON.stringify(toolsFormatCombinedVertex, null, 2));
    
    // Verificar se o formato está correto para Vertex AI com Function Declarations
    const expectedFormatCombinedVertex = [
        {
            functionDeclarations: [
                {
                    name: "get_current_weather",
                    description: "Obtém informações meteorológicas para uma localização específica",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            location: {
                                type: "STRING",
                                description: "Nome da cidade ou localização"
                            }
                        },
                        required: ["location"]
                    }
                }
            ],
            google_search: {} // Formato para Vertex AI
        }
    ];
    
    console.log("\nFormato esperado para combinado com Vertex AI:");
    console.log(JSON.stringify(expectedFormatCombinedVertex, null, 2));
    
    // Verificar se os formatos são iguais
    const actualJsonCombinedVertex = JSON.stringify(toolsFormatCombinedVertex);
    const expectedJsonCombinedVertex = JSON.stringify(expectedFormatCombinedVertex);
    
    if (actualJsonCombinedVertex === expectedJsonCombinedVertex) {
        console.log("\n✅ O formato combinado com Vertex AI está correto!");
    } else {
        console.log("\n❌ O formato combinado com Vertex AI não está correto!");
        console.log("\nDiferenças:");
        compareObjects(toolsFormatCombinedVertex, expectedFormatCombinedVertex);
    }
    
    // Teste 5: Nenhuma ferramenta habilitada
    console.log("\n=== Teste 5: Nenhuma ferramenta habilitada ===");
    const agentNoTools = new Agent({
        role: "Agente de Teste",
        objective: "Testar sem ferramentas",
        context: "Contexto de teste",
        task: "Tarefa de teste",
        llm: mockGeminiLLM // Mock do LLM
        // Sem tools e sem enableGoogleSearch
    });
    
    const toolsFormatNoTools = agentNoTools.prepareToolsForLLM();
    console.log("Formato sem ferramentas:");
    console.log(toolsFormatNoTools);
    
    if (toolsFormatNoTools === undefined) {
        console.log("\n✅ O formato sem ferramentas está correto (undefined)!");
    } else {
        console.log("\n❌ O formato sem ferramentas não está correto!");
        console.log(`Esperado: undefined, Recebido: ${JSON.stringify(toolsFormatNoTools)}`);
    }
}

// Função para comparar objetos e encontrar diferenças
function compareObjects(actual, expected, path = "") {
    if (Array.isArray(actual) && Array.isArray(expected)) {
        // Comparar arrays
        if (actual.length !== expected.length) {
            console.log(`${path}: Tamanhos de array diferentes (${actual.length} vs ${expected.length})`);
        }
        
        const minLength = Math.min(actual.length, expected.length);
        for (let i = 0; i < minLength; i++) {
            compareObjects(actual[i], expected[i], `${path}[${i}]`);
        }
    } else if (typeof actual === 'object' && actual !== null && typeof expected === 'object' && expected !== null) {
        // Comparar objetos
        const actualKeys = Object.keys(actual);
        const expectedKeys = Object.keys(expected);
        
        // Verificar chaves extras em actual
        for (const key of actualKeys) {
            if (!expectedKeys.includes(key)) {
                console.log(`${path ? path + '.' : ''}${key}: Chave extra em actual`);
            }
        }
        
        // Verificar chaves faltando em actual
        for (const key of expectedKeys) {
            if (!actualKeys.includes(key)) {
                console.log(`${path ? path + '.' : ''}${key}: Chave faltando em actual`);
            }
        }
        
        // Comparar valores para chaves em comum
        for (const key of actualKeys) {
            if (expectedKeys.includes(key)) {
                compareObjects(actual[key], expected[key], `${path ? path + '.' : ''}${key}`);
            }
        }
    } else if (actual !== expected) {
        // Comparar valores primitivos
        console.log(`${path}: Valores diferentes (${JSON.stringify(actual)} vs ${JSON.stringify(expected)})`);
    }
}

// Executar o teste
testGoogleSearchFormat();
