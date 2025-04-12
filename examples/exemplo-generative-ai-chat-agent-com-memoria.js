/**
 * Exemplo de uso do ChatAgent com diferentes tipos de memória usando GenerativeAILLM
 *
 * Este exemplo demonstra como configurar e usar os diferentes tipos de memória
 * (ConversationMemory, FactMemory e SummaryMemory) com o ChatAgent,
 * utilizando o GenerativeAILLM (API do Google AI Studio / Gemini).
 */

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env
const { ChatAgent, GenerativeAILLM, memory } = require('../index'); // Importa GenerativeAILLM
const path = require('path');

// Caminho para o banco de dados SQLite (será criado se não existir)
// Usaremos um arquivo diferente para não misturar com o exemplo do VertexAI
const dbPath = path.join(__dirname, 'generative_ai_chat_memory.db');

async function main() {
    try {
        console.log("Iniciando exemplo de ChatAgent com memória persistente (Generative AI)...");

        // Verifica se a API Key do Gemini foi fornecida
        if (!process.env.GEMINI_API_KEY) {
            throw new Error("A variável de ambiente GEMINI_API_KEY não está definida. Por favor, defina-a no seu arquivo .env.");
        }

        // Criar instâncias dos adaptadores de memória
        const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
            dbConfig: { dbPath }
        });

        const factMemory = new memory.SQLiteFactMemoryAdapter({
            dbConfig: { dbPath }
        });

        const summaryMemory = new memory.SQLiteSummaryMemoryAdapter({
            dbConfig: { dbPath }
        });

        // Criar instância do LLM usando GenerativeAILLM
        const llm = new GenerativeAILLM({
            apiKey: process.env.GEMINI_API_KEY, // Usa a API Key do Gemini
            // projectId e location não são necessários para GenerativeAILLM
            modelName: "gemini-2.0-flash-001", // Modelo Gemini
            mode: "chat", // Modo chat
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2
            }
            // safetySettings podem ser omitidos para usar os padrões
        });

        // Criar instância do ChatAgent com memória persistente
        const chatAgent = new ChatAgent({
            role: "Assistente Pessoal (Gemini)",
            objective: "Ajudar o usuário com suas tarefas diárias usando Gemini",
            context: `Você é um assistente pessoal amigável e prestativo baseado no Gemini.
Você deve manter um registro das preferências do usuário e usar essas informações para personalizar suas respostas.
Você também deve resumir periodicamente a conversa para manter o contexto.`,
            llm, // Passa a instância do GenerativeAILLM
            conversationMemory,
            factMemory,
            summaryMemory
        });

        console.log(`ChatAgent (Gemini) criado com ID de conversa: ${chatAgent.chatId}`);

        // Simular uma conversa
        console.log("\n--- Iniciando conversa (Gemini) ---\n");

        // Primeira mensagem do usuário
        const mensagem1 = "Olá! Meu nome é Carlos e eu gosto de programação em JavaScript.";
        console.log(`Usuário: ${mensagem1}`);

        let resposta = await chatAgent.processUserMessage(mensagem1);
        console.log(`Assistente (Gemini): ${resposta.text}`);

        // Armazenar fatos sobre o usuário
        await chatAgent.setFact("nome", "Carlos");
        await chatAgent.setFact("linguagem_preferida", "JavaScript");

        // Segunda mensagem do usuário
        const mensagem2 = "Você pode me recomendar alguns frameworks de JavaScript para desenvolvimento web?";
        console.log(`\nUsuário: ${mensagem2}`);

        resposta = await chatAgent.processUserMessage(mensagem2);
        console.log(`Assistente (Gemini): ${resposta.text}`);

        // Gerar e armazenar um resumo da conversa
        const resumo = "O usuário se chama Carlos, gosta de JavaScript e pediu recomendações de frameworks para desenvolvimento web.";
        await chatAgent.addSummary(resumo);

        // Terceira mensagem do usuário
        const mensagem3 = "Qual é o meu nome e qual linguagem de programação eu gosto?";
        console.log(`\nUsuário: ${mensagem3}`);

        resposta = await chatAgent.processUserMessage(mensagem3);
        console.log(`Assistente (Gemini): ${resposta.text}`);

        // Recuperar e mostrar fatos armazenados
        console.log("\n--- Fatos armazenados (Gemini) ---");
        const fatos = await chatAgent.getAllFacts();
        console.log(fatos);

        // Recuperar e mostrar o resumo mais recente
        console.log("\n--- Resumo mais recente (Gemini) ---");
        const ultimoResumo = await chatAgent.getLatestSummary();
        console.log(ultimoResumo);

        // Mostrar o histórico de conversa
        console.log("\n--- Histórico de conversa (Gemini) ---");
        console.log(chatAgent.conversationHistory);

        // Fechar as conexões com o banco de dados
        await conversationMemory.close();
        await factMemory.close();
        await summaryMemory.close();

        console.log("\nExemplo (Generative AI) concluído com sucesso!");
    } catch (error) {
        console.error("Erro durante a execução do exemplo (Generative AI):", error);
    }
}

// Executar o exemplo
main();
