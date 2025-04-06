/**
 * Exemplo de uso do ChatAgent com adaptadores de memória MongoDB
 * 
 * Este exemplo demonstra como configurar e usar os adaptadores de memória
 * MongoDB com o ChatAgent.
 */

require('dotenv').config();
const { ChatAgent, VertexAILLM, memory } = require('../index');

// Configuração do MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = 'gemini_agent_memory';

async function main() {
    try {
        console.log("Iniciando exemplo de ChatAgent com memória MongoDB...");
        
        // Criar instâncias dos adaptadores de memória MongoDB
        const conversationMemory = new memory.MongoDBConversationMemoryAdapter({
            dbConfig: {
                connectionUri: MONGODB_URI,
                dbName: MONGODB_DB_NAME,
                collectionName: 'chat_history'
            }
        });
        
        const factMemory = new memory.MongoDBFactMemoryAdapter({
            dbConfig: {
                connectionUri: MONGODB_URI,
                dbName: MONGODB_DB_NAME,
                collectionName: 'facts'
            }
        });
        
        const summaryMemory = new memory.MongoDBSummaryMemoryAdapter({
            dbConfig: {
                connectionUri: MONGODB_URI,
                dbName: MONGODB_DB_NAME,
                collectionName: 'summaries'
            }
        });
        
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
        
        // Inicializar as conexões com o MongoDB
        console.log("Inicializando conexões com o MongoDB...");
        await conversationMemory.initialize();
        await factMemory.initialize();
        await summaryMemory.initialize();
        
        // Criar instância do ChatAgent com memória MongoDB
        const chatAgent = new ChatAgent({
            role: "Assistente Pessoal",
            objective: "Ajudar o usuário com suas tarefas diárias",
            context: `Você é um assistente pessoal amigável e prestativo.
Você deve manter um registro das preferências do usuário e usar essas informações para personalizar suas respostas.
Você também deve resumir periodicamente a conversa para manter o contexto.`,
            llm,
            conversationMemory,
            factMemory,
            summaryMemory
        });
        
        console.log(`ChatAgent criado com ID de conversa: ${chatAgent.chatId}`);
        
        // Simular uma conversa
        console.log("\n--- Iniciando conversa ---\n");
        
        // Primeira mensagem do usuário
        const mensagem1 = "Olá! Meu nome é Ana e eu trabalho com ciência de dados.";
        console.log(`Usuário: ${mensagem1}`);
        
        let resposta = await chatAgent.processUserMessage(mensagem1);
        console.log(`Assistente: ${resposta.text}`);
        
        // Armazenar fatos sobre o usuário
        await chatAgent.setFact("nome", "Ana");
        await chatAgent.setFact("profissao", "Cientista de Dados");
        await chatAgent.setFact("interesses", ["Python", "Machine Learning", "Visualização de Dados"]);
        
        // Segunda mensagem do usuário
        const mensagem2 = "Quais bibliotecas de Python você recomenda para análise de dados?";
        console.log(`\nUsuário: ${mensagem2}`);
        
        resposta = await chatAgent.processUserMessage(mensagem2);
        console.log(`Assistente: ${resposta.text}`);
        
        // Gerar e armazenar um resumo da conversa
        const resumo = "A usuária se chama Ana, trabalha como Cientista de Dados e pediu recomendações de bibliotecas Python para análise de dados.";
        await chatAgent.addSummary(resumo);
        
        // Terceira mensagem do usuário
        const mensagem3 = "Você pode me lembrar quais são meus interesses?";
        console.log(`\nUsuário: ${mensagem3}`);
        
        resposta = await chatAgent.processUserMessage(mensagem3);
        console.log(`Assistente: ${resposta.text}`);
        
        // Recuperar e mostrar fatos armazenados
        console.log("\n--- Fatos armazenados ---");
        const fatos = await chatAgent.getAllFacts();
        console.log(fatos);
        
        // Recuperar e mostrar o resumo mais recente
        console.log("\n--- Resumo mais recente ---");
        const ultimoResumo = await chatAgent.getLatestSummary();
        console.log(ultimoResumo);
        
        // Mostrar o histórico de conversa
        console.log("\n--- Histórico de conversa ---");
        console.log(chatAgent.conversationHistory);
        
        // Fechar as conexões com o banco de dados
        await conversationMemory.close();
        await factMemory.close();
        await summaryMemory.close();
        
        console.log("\nExemplo concluído com sucesso!");
    } catch (error) {
        console.error("Erro durante a execução do exemplo:", error);
    }
}

// Executar o exemplo
main();
