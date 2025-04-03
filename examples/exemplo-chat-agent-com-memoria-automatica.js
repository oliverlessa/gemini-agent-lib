/**
 * Exemplo de uso do ChatAgent com gerenciamento automático de memórias
 * 
 * Este exemplo demonstra como configurar e usar o ChatAgent com o gerenciamento
 * automático de memórias de fatos e resumos.
 */

// Importações
const path = require('path');
const { ChatAgent, VertexAILLM } = require('../index');
// Classes base não são instanciadas diretamente, apenas os adaptadores
// const ConversationMemory = require('../lib/memory/conversation-memory');
// const FactMemory = require('../lib/memory/fact-memory');
// const SummaryMemory = require('../lib/memory/summary-memory');
const SQLiteConversationMemoryAdapter = require('../lib/memory/sqlite-conversation-memory-adapter');
const SQLiteFactMemoryAdapter = require('../lib/memory/sqlite-fact-memory-adapter');
const SQLiteSummaryMemoryAdapter = require('../lib/memory/sqlite-summary-memory-adapter');

// Função principal
async function main() {
  try {
    console.log('Iniciando exemplo de ChatAgent com gerenciamento automático de memórias...\n');
    
    // Configurar adaptadores de memória com SQLite
    const dbPath = path.join(__dirname, 'memoria_automatica.db');
    
    // Instanciar diretamente os adaptadores SQLite, pois eles herdam das classes base
    const conversationMemory = new SQLiteConversationMemoryAdapter({ dbConfig: { dbPath } });
    const factMemory = new SQLiteFactMemoryAdapter({ dbConfig: { dbPath } });
    const summaryMemory = new SQLiteSummaryMemoryAdapter({ dbConfig: { dbPath } });
    
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
    
    // Criar instância do ChatAgent com gerenciamento automático de memórias
    const chatAgent = new ChatAgent({
      role: "Assistente Pessoal",
      objective: "Ajudar o usuário com suas tarefas e lembrar de informações importantes",
      context: "Você é um assistente pessoal amigável e prestativo que se lembra de detalhes sobre o usuário.",
      llm: llm,
      conversationMemory: conversationMemory,
      factMemory: factMemory,
      summaryMemory: summaryMemory,
      autoManageFactMemory: true,  // Habilita o gerenciamento automático de fatos
      autoManageSummaryMemory: true  // Habilita o gerenciamento automático de resumos
    });
    
    // Obter o ID da conversa
    console.log(`ID da conversa: ${chatAgent.chatId}\n`);
    
    // Simular uma conversa que contém fatos sobre o usuário
    console.log('=== Iniciando conversa ===');
    
    // Primeira mensagem - apresentação com fatos pessoais
    let userMessage = "Olá! Meu nome é Maria Silva e moro em São Paulo. Trabalho como engenheira de software.";
    console.log(`\nUsuário: ${userMessage}`);
    
    let response = await chatAgent.processUserMessage(userMessage);
    console.log(`Assistente: ${response.text}\n`);
    
    // Segunda mensagem - mais informações pessoais
    userMessage = "Tenho 32 anos e gosto muito de fotografia e viagens. Meu email é maria.silva@exemplo.com.";
    console.log(`Usuário: ${userMessage}`);
    
    response = await chatAgent.processUserMessage(userMessage);
    console.log(`Assistente: ${response.text}\n`);
    
    // Terceira mensagem - preferências
    userMessage = "Prefiro clima quente e meu destino favorito de viagem é Portugal.";
    console.log(`Usuário: ${userMessage}`);
    
    response = await chatAgent.processUserMessage(userMessage);
    console.log(`Assistente: ${response.text}\n`);
    
    // Verificar os fatos extraídos automaticamente
    console.log('=== Fatos extraídos automaticamente ===');
    const facts = await chatAgent.getAllFacts();
    console.log(JSON.stringify(facts, null, 2));
    console.log();
    
    // Verificar o resumo gerado automaticamente
    console.log('=== Resumo gerado automaticamente ===');
    const summary = await chatAgent.getLatestSummary();
    console.log(summary || 'Nenhum resumo gerado ainda.');
    console.log();
    
    // Demonstrar a coexistência de gerenciamento manual e automático
    console.log('=== Adicionando um fato manualmente ===');
    await chatAgent.setFact('ultima_viagem', 'Lisboa, Junho 2024');
    console.log('Fato adicionado manualmente: ultima_viagem = "Lisboa, Junho 2024"');
    
    // Verificar todos os fatos novamente
    console.log('\n=== Todos os fatos (automáticos + manuais) ===');
    const updatedFacts = await chatAgent.getAllFacts();
    console.log(JSON.stringify(updatedFacts, null, 2));
    console.log();
    
    // Quarta mensagem - testar se o agente se lembra dos fatos
    userMessage = "Você se lembra de alguma informação sobre mim?";
    console.log(`\nUsuário: ${userMessage}`);
    
    response = await chatAgent.processUserMessage(userMessage);
    console.log(`Assistente: ${response.text}\n`);
    
    // Fechar conexões
    await conversationMemory.close();
    await factMemory.close();
    await summaryMemory.close();
    
    console.log('Exemplo concluído com sucesso!');
    
  } catch (error) {
    console.error('Erro durante a execução do exemplo:', error);
  }
}

// Executar o exemplo
main();
