// test-vertex-only-search.js
require('dotenv').config();
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');

/**
 * Este teste demonstra o uso apenas do Google Search Retrieval com o VertexAILLM,
 * sem function calling, para verificar se o problema está na combinação das duas funcionalidades.
 */
async function testVertexOnlySearch() {
    try {
        console.log("=== Teste de Apenas Google Search com Vertex AI ===");
        
        // Criar instância do VertexAILLM
        const vertexLLM = new VertexAILLM({
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-1.0-pro", // ou outro modelo que suporte Google Search
            mode: "oneshot"
        });
        
        // Criar o agente apenas com Google Search
        const agenteApenasSearch = new Agent({
            role: "Assistente de Pesquisa",
            objective: "Fornecer informações atualizadas usando o Google Search",
            context: `Você é um assistente de IA avançado com acesso ao Google Search.
                     Use o Google Search para obter informações atualizadas.
                     Forneça respostas completas e precisas baseadas nas informações encontradas.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            enableGoogleSearch: true // Habilitando apenas o Google Search
        });
        
        // Verificar o formato das ferramentas preparadas para o LLM
        const toolsForLLM = agenteApenasSearch.prepareToolsForLLM();
        console.log("\nFormato das ferramentas para Vertex AI (apenas Google Search):");
        console.log(JSON.stringify(toolsForLLM, null, 2));
        
        // Verificar se o formato está correto para Vertex AI
        const expectedFormat = [
            {
                googleSearchRetrieval: {
                    disableAttribution: false
                }
            }
        ];
        
        console.log("\nFormato esperado para Vertex AI (apenas Google Search):");
        console.log(JSON.stringify(expectedFormat, null, 2));
        
        // Verificar se os formatos são iguais
        const actualJson = JSON.stringify(toolsForLLM);
        const expectedJson = JSON.stringify(expectedFormat);
        
        if (actualJson === expectedJson) {
            console.log("\n✅ O formato para Vertex AI (apenas Google Search) está correto!");
        } else {
            console.log("\n❌ O formato para Vertex AI (apenas Google Search) não está correto!");
            console.log("\nDiferenças:");
            compareObjects(toolsForLLM, expectedFormat);
        }
        
        // Definir tarefas que incentivem o uso do Google Search
        const tarefas = [
            "Qual é a população atual do Brasil?"
        ];
        
        // Executar cada tarefa
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agenteApenasSearch.task = tarefa;
            
            try {
                const resposta = await agenteApenasSearch.executeTask();
                console.log(`\nResposta do Agente (apenas Google Search):\n${resposta}`);
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
testVertexOnlySearch();
