/**
 * Teste do gerenciamento automático de memórias
 * 
 * Este teste verifica o funcionamento do mecanismo de gerenciamento automático
 * de memórias de fatos e resumos no ChatAgent.
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { ChatAgent, VertexAILLM } = require('../index');
const { 
  ConversationMemory, 
  FactMemory, 
  SummaryMemory,
  SQLiteConversationMemoryAdapter,
  SQLiteFactMemoryAdapter,
  SQLiteSummaryMemoryAdapter
} = require('../lib/memory');

// Configurações para o teste
const TEST_DB_PATH = path.join(__dirname, 'test_auto_memory.db');
const TEST_CHAT_ID = 'test-auto-memory-chat-id';

// Função para limpar o banco de dados de teste
function cleanupTestDb() {
  if (fs.existsSync(TEST_DB_PATH)) {
    fs.unlinkSync(TEST_DB_PATH);
    console.log(`Banco de dados de teste removido: ${TEST_DB_PATH}`);
  }
}

// Função principal de teste
async function runTests() {
  console.log('Iniciando testes de gerenciamento automático de memórias...\n');
  
  // Limpar banco de dados de teste anterior
  cleanupTestDb();
  
  try {
    // Criar adaptadores de memória para teste
    const conversationMemory = new ConversationMemory({
      adapter: new SQLiteConversationMemoryAdapter({ dbPath: TEST_DB_PATH })
    });
    
    const factMemory = new FactMemory({
      adapter: new SQLiteFactMemoryAdapter({ dbPath: TEST_DB_PATH })
    });
    
    const summaryMemory = new SummaryMemory({
      adapter: new SQLiteSummaryMemoryAdapter({ dbPath: TEST_DB_PATH })
    });
    
    // Criar um mock do LLM para testes
    // Este mock simula o comportamento do LLM real, mas com respostas predefinidas
    const mockLLM = {
      mode: 'chat',
      generateContent: async (params) => {
        // Se for uma chamada para o mecanismo de avaliação de memória
        if (params.context && params.context.includes('sistema de gerenciamento de memória')) {
          // Simular extração de fatos e geração de resumo
          return {
            text: `{
              "fatos": [
                {"chave": "nome_usuario", "valor": "João Silva"},
                {"chave": "profissao", "valor": "engenheiro"},
                {"chave": "cidade", "valor": "Rio de Janeiro"}
              ],
              "resumo": "O usuário se chama João Silva, é engenheiro e mora no Rio de Janeiro."
            }`
          };
        }
        
        // Para chamadas normais do LLM, retornar uma resposta simples
        return {
          text: "Olá! Como posso ajudar você hoje?",
          functionCall: null
        };
      }
    };
    
    // Criar instância do ChatAgent com gerenciamento automático de memórias
    const chatAgent = new ChatAgent({
      role: "Assistente de Teste",
      objective: "Testar o gerenciamento automático de memórias",
      context: "Você é um assistente de teste.",
      llm: mockLLM,
      conversationMemory: conversationMemory,
      factMemory: factMemory,
      summaryMemory: summaryMemory,
      autoManageFactMemory: true,
      autoManageSummaryMemory: true
    });
    
    // Sobrescrever o chatId para facilitar os testes
    chatAgent.chatId = TEST_CHAT_ID;
    
    console.log('1. Testando processamento de mensagem com gerenciamento automático...');
    
    // Processar uma mensagem de teste
    const userMessage = "Olá, meu nome é João Silva. Sou engenheiro e moro no Rio de Janeiro.";
    const response = await chatAgent.processUserMessage(userMessage);
    
    console.log(`   Mensagem do usuário: "${userMessage}"`);
    console.log(`   Resposta do agente: "${response.text}"`);
    
    // Verificar se os fatos foram extraídos automaticamente
    console.log('\n2. Verificando extração automática de fatos...');
    const facts = await chatAgent.getAllFacts();
    console.log(`   Fatos extraídos: ${JSON.stringify(facts)}`);
    
    // Testes de asserção para os fatos
    assert(facts.nome_usuario === 'João Silva', 'Falha: nome_usuario não foi extraído corretamente');
    assert(facts.profissao === 'engenheiro', 'Falha: profissao não foi extraída corretamente');
    assert(facts.cidade === 'Rio de Janeiro', 'Falha: cidade não foi extraída corretamente');
    
    console.log('   ✓ Fatos extraídos corretamente');
    
    // Verificar se o resumo foi gerado automaticamente
    console.log('\n3. Verificando geração automática de resumo...');
    const summary = await chatAgent.getLatestSummary();
    console.log(`   Resumo gerado: "${summary}"`);
    
    // Teste de asserção para o resumo
    assert(
      summary === 'O usuário se chama João Silva, é engenheiro e mora no Rio de Janeiro.',
      'Falha: resumo não foi gerado corretamente'
    );
    
    console.log('   ✓ Resumo gerado corretamente');
    
    // Testar a coexistência de gerenciamento manual e automático
    console.log('\n4. Testando coexistência de gerenciamento manual e automático...');
    
    // Adicionar um fato manualmente
    await chatAgent.setFact('hobby', 'fotografia');
    
    // Verificar se o fato manual foi adicionado junto com os automáticos
    const updatedFacts = await chatAgent.getAllFacts();
    console.log(`   Fatos após adição manual: ${JSON.stringify(updatedFacts)}`);
    
    // Teste de asserção para o fato manual
    assert(updatedFacts.hobby === 'fotografia', 'Falha: fato manual não foi adicionado corretamente');
    assert(updatedFacts.nome_usuario === 'João Silva', 'Falha: fatos automáticos foram perdidos');
    
    console.log('   ✓ Gerenciamento manual e automático coexistem corretamente');
    
    // Fechar conexões
    await conversationMemory.close();
    await factMemory.close();
    await summaryMemory.close();
    
    console.log('\nTodos os testes foram concluídos com sucesso!');
    
  } catch (error) {
    console.error('Erro durante os testes:', error);
    throw error;
  } finally {
    // Limpar banco de dados de teste
    cleanupTestDb();
  }
}

// Executar os testes
runTests()
  .then(() => {
    console.log('\nTestes de gerenciamento automático de memórias concluídos.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nTestes falharam:', error);
    process.exit(1);
  });
