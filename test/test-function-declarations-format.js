// test-function-declarations-format.js
const Agent = require('../lib/agent');
const FunctionDeclarationSchemaType = require('../lib/function-declaration-schema-type');

// Função para testar o formato das declarações de funções
function testFunctionDeclarationsFormat() {
    console.log("Testando o formato das declarações de funções...");
    
    // Criar um agente com uma ferramenta de exemplo
    const agent = new Agent({
        role: "Agente de Teste",
        objective: "Testar o formato das declarações de funções",
        context: "Contexto de teste",
        task: "Tarefa de teste",
        llm: { generateContent: () => ({ text: "Resposta de teste" }) }, // Mock do LLM
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
                        },
                        unit: {
                            type: "string",
                            enum: ["celsius", "fahrenheit"],
                            description: "Unidade de temperatura (opcional)"
                        }
                    },
                    required: ["location"]
                },
                function: async (args) => ({ weather: "sunny" })
            }
        ]
    });
    
    // Obter as ferramentas no formato para o LLM
    const toolsForLLM = agent.prepareToolsForLLM();
    
    // Imprimir o formato das ferramentas
    console.log("Formato das ferramentas para o LLM:");
    console.log(JSON.stringify(toolsForLLM, null, 2));
    
    // Verificar se o formato está correto
    const expectedFormat = [
        {
            functionDeclarations: [
                {
                    name: "get_current_weather",
                    description: "Obtém informações meteorológicas para uma localização específica",
                    parameters: {
                        type: FunctionDeclarationSchemaType.OBJECT,
                        properties: {
                            location: {
                                type: FunctionDeclarationSchemaType.STRING,
                                description: "Nome da cidade ou localização"
                            },
                            unit: {
                                type: FunctionDeclarationSchemaType.STRING,
                                enum: ["celsius", "fahrenheit"],
                                description: "Unidade de temperatura (opcional)"
                            }
                        },
                        required: ["location"]
                    }
                }
            ]
        }
    ];
    
    console.log("\nFormato esperado:");
    console.log(JSON.stringify(expectedFormat, null, 2));
    
    // Verificar se os formatos são iguais
    const actualJson = JSON.stringify(toolsForLLM);
    const expectedJson = JSON.stringify(expectedFormat);
    
    if (actualJson === expectedJson) {
        console.log("\n✅ O formato está correto!");
    } else {
        console.log("\n❌ O formato não está correto!");
        console.log("\nDiferenças:");
        
        // Comparar os objetos para encontrar diferenças
        compareObjects(toolsForLLM, expectedFormat);
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
testFunctionDeclarationsFormat();
