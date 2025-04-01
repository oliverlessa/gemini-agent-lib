/**
 * Exemplo de uso do ChatAgent com apenas um tipo de memória
 * 
 * Este exemplo demonstra como usar apenas um tipo de memória (ConversationMemory)
 * com o ChatAgent, mostrando que os sistemas de memória são opcionais e podem
 * ser usados independentemente.
 */

require('dotenv').config();
const { ChatAgent, VertexAILLM, memory } = require('../index');
const path = require('path');

// Caminho para o banco de dados SQLite (será criado se não existir)
const dbPath = path.join(__dirname, 'chat_history_only.db');

async function main() {
    try {
        console.log("Iniciando exemplo de ChatAgent com apenas ConversationMemory...");
        
        // Criar apenas a instância do adaptador de memória de conversação
        const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
            dbConfig: { dbPath }
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
        
        // Criar instância do ChatAgent apenas com memória de conversação
        const chatAgent = new ChatAgent({
            role: "Assistente de Programação",
            objective: "Ajudar o usuário com questões de programação",
            context: `Você é um assistente especializado em programação.
Você deve fornecer respostas claras e concisas sobre questões de programação.`,
            llm,
            conversationMemory, // Apenas ConversationMemory
            // factMemory e summaryMemory não são fornecidos
        });
        
        console.log(`ChatAgent criado com ID de conversa: ${chatAgent.chatId}`);
        
        // Simular uma conversa
        console.log("\n--- Iniciando conversa ---\n");
        
        // Primeira mensagem do usuário
        const mensagem1 = "Como posso criar uma classe em JavaScript?";
        console.log(`Usuário: ${mensagem1}`);
        
        let resposta = await chatAgent.processUserMessage(mensagem1);
        console.log(`Assistente: ${resposta.text}`);
        
        // Segunda mensagem do usuário
        const mensagem2 = "E como implemento herança nessa classe?";
        console.log(`\nUsuário: ${mensagem2}`);
        
        resposta = await chatAgent.processUserMessage(mensagem2);
        console.log(`Assistente: ${resposta.text}`);
        
        // Terceira mensagem do usuário
        const mensagem3 = "Pode me dar um exemplo completo de uma classe base e uma classe derivada?";
        console.log(`\nUsuário: ${mensagem3}`);
        
        resposta = await chatAgent.processUserMessage(mensagem3);
        console.log(`Assistente: ${resposta.text}`);
        
        // Mostrar o histórico de conversa
        console.log("\n--- Histórico de conversa ---");
        console.log(chatAgent.conversationHistory);
        
        // Tentar usar métodos de outros tipos de memória (que não foram configurados)
        console.log("\n--- Tentando usar métodos de memória não configurados ---");
        
        // Tentar usar FactMemory (não configurado)
        const factResult = await chatAgent.setFact("linguagem", "JavaScript");
        console.log(`Resultado de setFact: ${factResult}`); // Deve retornar false
        
        const fact = await chatAgent.getFact("linguagem");
        console.log(`Resultado de getFact: ${fact}`); // Deve retornar null
        
        // Tentar usar SummaryMemory (não configurado)
        const summaryResult = await chatAgent.addSummary("Conversa sobre classes em JavaScript");
        console.log(`Resultado de addSummary: ${summaryResult}`); // Deve retornar false
        
        const summary = await chatAgent.getLatestSummary();
        console.log(`Resultado de getLatestSummary: ${summary}`); // Deve retornar null
        
        // Limpar o histórico
        console.log("\n--- Limpando histórico ---");
        await chatAgent.clearHistory();
        console.log(`Histórico após limpeza: ${chatAgent.conversationHistory.length} mensagens`);
        
        // Fechar a conexão com o banco de dados
        await conversationMemory.close();
        
        console.log("\nExemplo concluído com sucesso!");
    } catch (error) {
        console.error("Erro durante a execução do exemplo:", error);
    }
}

// Executar o exemplo
main();
