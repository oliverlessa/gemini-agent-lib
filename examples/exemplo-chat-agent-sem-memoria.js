/**
 * Exemplo de uso do ChatAgent sem sistemas de memória persistente
 * 
 * Este exemplo demonstra como o ChatAgent funciona com a memória volátil padrão,
 * sem utilizar nenhum dos sistemas de memória persistente.
 */

require('dotenv').config();
const { ChatAgent, VertexAILLM } = require('../index');

async function main() {
    try {
        console.log("Iniciando exemplo de ChatAgent com memória volátil padrão...");
        
        // Criar instância do LLM
        const llm = new VertexAILLM({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            modelName: "gemini-2.0-flash-001",
            mode: "chat",
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2
            }
        });
        
        // Criar instância do ChatAgent sem nenhum sistema de memória persistente
        const chatAgent = new ChatAgent({
            role: "Assistente de Viagens",
            objective: "Ajudar o usuário a planejar viagens",
            context: `Você é um assistente especializado em viagens.
Você deve fornecer informações úteis sobre destinos, dicas de viagem e recomendações.`,
            llm
            // Nenhum sistema de memória é fornecido (conversationMemory, factMemory, summaryMemory)
        });
        
        console.log(`ChatAgent criado sem sistemas de memória persistente.`);
        console.log(`chatId: ${chatAgent.chatId}`); // Deve ser null
        
        // Simular uma conversa
        console.log("\n--- Iniciando conversa ---\n");
        
        // Primeira mensagem do usuário
        const mensagem1 = "Quais são os melhores destinos para visitar em Portugal?";
        console.log(`Usuário: ${mensagem1}`);
        
        let resposta = await chatAgent.processUserMessage(mensagem1);
        console.log(`Assistente: ${resposta.text}`);
        
        // Segunda mensagem do usuário
        const mensagem2 = "Qual é a melhor época do ano para visitar Lisboa?";
        console.log(`\nUsuário: ${mensagem2}`);
        
        resposta = await chatAgent.processUserMessage(mensagem2);
        console.log(`Assistente: ${resposta.text}`);
        
        // Terceira mensagem do usuário
        const mensagem3 = "Quais são as comidas típicas que devo experimentar?";
        console.log(`\nUsuário: ${mensagem3}`);
        
        resposta = await chatAgent.processUserMessage(mensagem3);
        console.log(`Assistente: ${resposta.text}`);
        
        // Mostrar o histórico de conversa (volátil)
        console.log("\n--- Histórico de conversa (volátil) ---");
        console.log(chatAgent.conversationHistory);
        
        // Limpar o histórico
        console.log("\n--- Limpando histórico ---");
        await chatAgent.clearHistory();
        console.log(`Histórico após limpeza: ${chatAgent.conversationHistory.length} mensagens`);
        
        // Nova conversa após limpar o histórico
        const novaMensagem = "Olá, estou planejando uma viagem para o Brasil. O que você recomenda?";
        console.log(`\nUsuário: ${novaMensagem}`);
        
        resposta = await chatAgent.processUserMessage(novaMensagem);
        console.log(`Assistente: ${resposta.text}`);
        
        // Mostrar o novo histórico
        console.log("\n--- Novo histórico de conversa ---");
        console.log(chatAgent.conversationHistory);
        
        console.log("\nExemplo concluído com sucesso!");
    } catch (error) {
        console.error("Erro durante a execução do exemplo:", error);
    }
}

// Executar o exemplo
main();
