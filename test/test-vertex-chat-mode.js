require('dotenv').config();
const VertexAILLM = require('../lib/vertex-ai-llm');

// Função para testar o modo chat com as melhorias implementadas
async function testChatMode() {
    console.log("Iniciando teste do modo chat com melhorias...");
    
    // Inicializa o modelo no modo chat
    const llm = new VertexAILLM({
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        modelName: "gemini-1.0-pro",
        mode: "chat",
        generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.2
        }
    });
    
    console.log("Modelo inicializado no modo chat");
    
    // Teste 1: Envio de mensagem simples
    console.log("\n--- Teste 1: Mensagem simples ---");
    const resposta1 = await llm.generateContent({
        prompt: "Olá! Quem é você?",
        context: "Você é um assistente útil chamado GeminiBot. Responda de forma concisa."
    });
    console.log("Resposta 1:", resposta1.text);
    
    // Teste 2: Envio de segunda mensagem (deve manter o contexto)
    console.log("\n--- Teste 2: Segunda mensagem (mantendo contexto) ---");
    const resposta2 = await llm.generateContent({
        prompt: "Qual é o seu propósito?",
        context: "Você é um assistente útil chamado GeminiBot. Responda de forma concisa."
    });
    console.log("Resposta 2:", resposta2.text);
    
    // Teste 3: Envio de mensagem com histórico explícito
    console.log("\n--- Teste 3: Mensagem com histórico explícito ---");
    const historico = [
        { role: "user", parts: [{ text: "Qual é a capital do Brasil?" }] },
        { role: "model", parts: [{ text: "A capital do Brasil é Brasília." }] }
    ];
    
    const resposta3 = await llm.generateContent({
        prompt: "E qual é a população aproximada dessa cidade?",
        context: "Você é um assistente útil chamado GeminiBot. Responda de forma concisa.",
        history: historico
    });
    console.log("Resposta 3:", resposta3.text);
    
    // Teste 4: Envio de mensagem com ferramentas
    console.log("\n--- Teste 4: Mensagem com ferramentas ---");
    const ferramentas = [
        {
            functionDeclarations: [
                {
                    name: "obter_previsao_tempo",
                    description: "Obtém a previsão do tempo para uma cidade",
                    parameters: {
                        type: "OBJECT",
                        properties: {
                            cidade: {
                                type: "STRING",
                                description: "Nome da cidade"
                            }
                        },
                        required: ["cidade"]
                    }
                }
            ]
        }
    ];
    
    const resposta4 = await llm.generateContent({
        prompt: "Como está o tempo em São Paulo hoje?",
        context: "Você é um assistente útil chamado GeminiBot. Use as ferramentas disponíveis quando necessário.",
        tools: ferramentas
    });
    console.log("Resposta 4:", resposta4.text);
    if (resposta4.functionCall) {
        console.log("Function Call:", JSON.stringify(resposta4.functionCall, null, 2));
    }
    
    // Teste 5: Envio de mensagem com contexto diferente (deve reinicializar o chat)
    console.log("\n--- Teste 5: Mensagem com contexto diferente ---");
    const resposta5 = await llm.generateContent({
        prompt: "Quem é você agora?",
        context: "Você é um assistente especializado em meteorologia chamado ClimaBot.",
        tools: ferramentas
    });
    console.log("Resposta 5:", resposta5.text);

    // Teste 6: Envio de mensagem com contexto diferente (deve reinicializar o chat)
    console.log("\n--- Teste 6: ---");
    const resposta6 = await llm.generateContent({
        prompt: "Clima em hoje em Vitória da Conquista, Bahia",
        context: "Você é um assistente especializado em meteorologia chamado ClimaBot."
    });
    console.log("Resposta 6:", resposta6.text);
    
    console.log("\nTestes concluídos!");
}

// Executa o teste
testChatMode().catch(error => {
    console.error("Erro durante o teste:", error);
});
