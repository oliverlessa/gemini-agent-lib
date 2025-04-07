// test-vertex-only-function.js
require('dotenv').config();
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');

/**
 * Este teste demonstra o uso apenas de function calling com o VertexAILLM,
 * sem Google Search Retrieval, para verificar se o problema está na combinação das duas funcionalidades.
 */
async function testVertexOnlyFunction() {
    try {
        console.log("=== Teste de Apenas Function Calling com Vertex AI ===");
        
        // Criar instância do VertexAILLM
        const vertexLLM = new VertexAILLM({
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-1.0-pro", // ou outro modelo que suporte Function Calling
            mode: "oneshot"
        });
        
        // Definir uma ferramenta de calculadora
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
        
        // Criar o agente apenas com Function Calling
        const agenteApenasFunction = new Agent({
            role: "Assistente de Cálculos",
            objective: "Realizar cálculos matemáticos",
            context: `Você é um assistente de IA avançado com a capacidade de realizar cálculos matemáticos.
                     Use a ferramenta de cálculo para resolver expressões matemáticas.
                     Forneça respostas claras e precisas.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            tools: [calculatorTool]
            // Sem enableGoogleSearch
        });
        
        // Verificar o formato das ferramentas preparadas para o LLM
        const toolsForLLM = agenteApenasFunction.prepareToolsForLLM();
        console.log("\nFormato das ferramentas para Vertex AI (apenas Function Calling):");
        console.log(JSON.stringify(toolsForLLM, null, 2));
        
        // Verificar se o formato está correto para Vertex AI
        const expectedFormat = [
            {
                functionDeclarations: [
                    {
                        name: "calculate",
                        description: "Realiza cálculos matemáticos",
                        parameters: {
                            type: "OBJECT",
                            properties: {
                                expression: {
                                    type: "STRING",
                                    description: "Expressão matemática a ser calculada"
                                }
                            },
                            required: ["expression"]
                        }
                    }
                ]
            }
        ];
        
        console.log("\nFormato esperado para Vertex AI (apenas Function Calling):");
        console.log(JSON.stringify(expectedFormat, null, 2));
        
        // Verificar se os formatos são iguais
        const actualJson = JSON.stringify(toolsForLLM);
        const expectedJson = JSON.stringify(expectedFormat);
        
        if (actualJson === expectedJson) {
            console.log("\n✅ O formato para Vertex AI (apenas Function Calling) está correto!");
        } else {
            console.log("\n❌ O formato para Vertex AI (apenas Function Calling) não está correto!");
            console.log("\nDiferenças:");
            compareObjects(toolsForLLM, expectedFormat);
        }
        
        // Definir tarefas que incentivem o uso de function calling
        const tarefas = [
            "Quanto é 123 + 456 * 789?"
        ];
        
        // Executar cada tarefa
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agenteApenasFunction.task = tarefa;
            
            try {
                const resposta = await agenteApenasFunction.executeTask();
                console.log(`\nResposta do Agente (apenas Function Calling):\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste:", error);
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
testVertexOnlyFunction();
