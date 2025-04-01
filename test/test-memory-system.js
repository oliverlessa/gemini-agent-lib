/**
 * Teste do sistema de memória para ChatAgent
 * 
 * Este teste verifica o funcionamento básico dos diferentes tipos de memória
 * (ConversationMemory, FactMemory e SummaryMemory) com o ChatAgent.
 */

require('dotenv').config();
const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { ChatAgent, VertexAILLM, memory } = require('../index');

// Caminho para o banco de dados SQLite de teste (será criado se não existir)
const dbPath = path.join(__dirname, 'test_memory.db');

// Limpar o banco de dados de teste se existir
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Banco de dados de teste removido: ${dbPath}`);
}

async function runTests() {
    let conversationMemory = null;
    let factMemory = null;
    let summaryMemory = null;
    let chatAgent = null;
    
    try {
        console.log("Iniciando testes do sistema de memória...");
        
        // Criar instâncias dos adaptadores de memória
        conversationMemory = new memory.SQLiteConversationMemoryAdapter({
            dbConfig: { dbPath }
        });
        
        factMemory = new memory.SQLiteFactMemoryAdapter({
            dbConfig: { dbPath }
        });
        
        summaryMemory = new memory.SQLiteSummaryMemoryAdapter({
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
        
        // Criar instância do ChatAgent com memória persistente
        chatAgent = new ChatAgent({
            role: "Assistente de Testes",
            objective: "Testar o sistema de memória",
            context: "Você é um assistente usado para testar o sistema de memória.",
            llm,
            conversationMemory,
            factMemory,
            summaryMemory
        });
        
        console.log(`ChatAgent criado com ID de conversa: ${chatAgent.chatId}`);
        
        // Teste 1: Verificar se o chatId foi gerado
        console.log("\nTeste 1: Verificar se o chatId foi gerado");
        assert.ok(chatAgent.chatId, "chatId deve ser gerado quando a memória é configurada");
        console.log("✓ chatId foi gerado corretamente");
        
        // Teste 2: Adicionar mensagens ao histórico e verificar persistência
        console.log("\nTeste 2: Adicionar mensagens ao histórico e verificar persistência");
        
        // Adicionar mensagens
        await chatAgent._addToConversationHistory("user", "Olá, isto é um teste.");
        await chatAgent._addToConversationHistory("model", "Olá! Como posso ajudar com o teste?");
        
        // Verificar se as mensagens foram adicionadas à memória volátil
        assert.strictEqual(chatAgent.conversationHistory.length, 2, "Deve haver 2 mensagens no histórico volátil");
        console.log("✓ Mensagens adicionadas ao histórico volátil");
        
        // Criar uma nova instância do adaptador para verificar persistência
        const conversationMemory2 = new memory.SQLiteConversationMemoryAdapter({
            dbConfig: { dbPath }
        });
        
        // Carregar o histórico do banco de dados
        const historioPersistente = await conversationMemory2.loadHistory(chatAgent.chatId);
        
        // Verificar se as mensagens foram persistidas
        assert.strictEqual(historioPersistente.length, 2, "Deve haver 2 mensagens no histórico persistente");
        assert.strictEqual(historioPersistente[0].role, "user", "A primeira mensagem deve ser do usuário");
        assert.strictEqual(historioPersistente[1].role, "model", "A segunda mensagem deve ser do modelo");
        console.log("✓ Mensagens persistidas corretamente");
        
        await conversationMemory2.close();
        
        // Teste 3: Armazenar e recuperar fatos
        console.log("\nTeste 3: Armazenar e recuperar fatos");
        
        // Armazenar fatos
        await chatAgent.setFact("nome", "Usuário de Teste");
        await chatAgent.setFact("idade", 30);
        await chatAgent.setFact("interesses", ["programação", "IA", "testes"]);
        
        // Recuperar fatos individualmente
        const nome = await chatAgent.getFact("nome");
        const idade = await chatAgent.getFact("idade");
        const interesses = await chatAgent.getFact("interesses");
        
        // Verificar se os fatos foram recuperados corretamente
        assert.strictEqual(nome, "Usuário de Teste", "O nome deve ser 'Usuário de Teste'");
        assert.strictEqual(idade, 30, "A idade deve ser 30");
        assert.deepStrictEqual(interesses, ["programação", "IA", "testes"], "Os interesses devem corresponder ao array");
        console.log("✓ Fatos individuais recuperados corretamente");
        
        // Recuperar todos os fatos
        const todosFatos = await chatAgent.getAllFacts();
        
        // Verificar se todos os fatos foram recuperados
        assert.strictEqual(Object.keys(todosFatos).length, 3, "Deve haver 3 fatos no total");
        assert.strictEqual(todosFatos.nome, "Usuário de Teste", "O nome deve ser 'Usuário de Teste'");
        assert.strictEqual(todosFatos.idade, 30, "A idade deve ser 30");
        assert.deepStrictEqual(todosFatos.interesses, ["programação", "IA", "testes"], "Os interesses devem corresponder ao array");
        console.log("✓ Todos os fatos recuperados corretamente");
        
        // Teste 4: Armazenar e recuperar resumos
        console.log("\nTeste 4: Armazenar e recuperar resumos");
        
        // Armazenar resumos
        const resumo1 = "Este é o primeiro resumo da conversa de teste.";
        const resumo2 = "Este é o segundo resumo, mais detalhado, da conversa de teste.";
        
        await chatAgent.addSummary(resumo1, new Date(Date.now() - 60000)); // 1 minuto atrás
        await chatAgent.addSummary(resumo2); // Agora
        
        // Recuperar o resumo mais recente
        const ultimoResumo = await chatAgent.getLatestSummary();
        
        // Verificar se o resumo mais recente foi recuperado corretamente
        assert.strictEqual(ultimoResumo, resumo2, "O resumo mais recente deve ser o segundo");
        console.log("✓ Resumo mais recente recuperado corretamente");
        
        // Recuperar todos os resumos
        const todosResumos = await chatAgent.getAllSummaries();
        
        // Verificar se todos os resumos foram recuperados
        assert.strictEqual(todosResumos.length, 2, "Deve haver 2 resumos no total");
        assert.strictEqual(todosResumos[0].summaryContent, resumo2, "O primeiro resumo na lista deve ser o mais recente");
        assert.strictEqual(todosResumos[1].summaryContent, resumo1, "O segundo resumo na lista deve ser o mais antigo");
        console.log("✓ Todos os resumos recuperados corretamente");
        
        // Teste 5: Limpar o histórico
        console.log("\nTeste 5: Limpar o histórico");
        
        // Limpar o histórico
        await chatAgent.clearHistory();
        
        // Verificar se o histórico volátil foi limpo
        assert.strictEqual(chatAgent.conversationHistory.length, 0, "O histórico volátil deve estar vazio");
        console.log("✓ Histórico volátil limpo corretamente");
        
        // Verificar se o histórico persistente foi limpo
        const historioPersistenteLimpo = await conversationMemory.loadHistory(chatAgent.chatId);
        assert.strictEqual(historioPersistenteLimpo.length, 0, "O histórico persistente deve estar vazio");
        console.log("✓ Histórico persistente limpo corretamente");
        
        console.log("\nTodos os testes concluídos com sucesso!");
    } catch (error) {
        console.error("Erro durante os testes:", error);
        throw error;
    } finally {
        // Fechar as conexões com o banco de dados
        if (conversationMemory) await conversationMemory.close();
        if (factMemory) await factMemory.close();
        if (summaryMemory) await summaryMemory.close();
        
        // Limpar o banco de dados de teste
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log(`\nBanco de dados de teste removido: ${dbPath}`);
        }
    }
}

// Executar os testes
runTests().catch(error => {
    console.error("Falha nos testes:", error);
    process.exit(1);
});
