/**
 * Exemplo de uso do sistema de debug
 * 
 * Este exemplo demonstra como usar o sistema de debug da biblioteca.
 * 
 * Para executar com debug ativado:
 * DEBUG=gemini-agent-lib:* node examples/exemplo-debug.js
 * 
 * Para ativar apenas logs específicos:
 * DEBUG=gemini-agent-lib:exemplo node examples/exemplo-debug.js
 */

const { ChatAgent } = require('../index');
const VertexAILLM = require('../lib/vertex-ai-llm');
const debug = require('../lib/debug').create('exemplo');

// Criar uma instância do LLM
const llm = new VertexAILLM({
  projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
  credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  modelName: "gemini-2.0-flash-001",
  mode: "chat"
});

// Demonstração de diferentes níveis de detalhes nos logs
debug('Iniciando exemplo de debug');

// Exemplo de log com objeto
const config = {
  role: 'Assistente',
  objective: 'Demonstrar o sistema de debug',
  context: 'Você é um assistente útil.'
};
debug('Configuração do agente: %o', config);

// Criar um agente de chat
const chatAgent = new ChatAgent({
  role: config.role,
  objective: config.objective,
  context: config.context,
  llm: llm
});

// Demonstrar como os logs do ChatAgent serão exibidos se DEBUG=gemini-agent-lib:chat-agent estiver definido
async function demonstrarChat() {
  debug('Enviando mensagem para o agente');
  
  try {
    // Esta chamada gerará logs internos se DEBUG=gemini-agent-lib:chat-agent estiver definido
    const resposta = await chatAgent.processUserMessage('Olá, como você está?');
    
    debug('Resposta recebida: %s', resposta.text);
  } catch (erro) {
    debug('Erro ao processar mensagem: %o', erro);
  }
}

// Demonstrar formatação de logs
function demonstrarFormatacao() {
  debug('Demonstração de formatação:');
  debug('String: %s', 'texto de exemplo');
  debug('Número: %d', 42);
  debug('JSON: %j', { chave: 'valor' });
  debug('Objeto com inspeção: %o', { 
    usuario: 'João',
    preferencias: {
      tema: 'escuro',
      notificacoes: true
    }
  });
}

// Executar demonstrações
async function executar() {
  debug('Iniciando demonstrações');
  
  demonstrarFormatacao();
  
  // Comentado para evitar chamadas reais à API em um exemplo
  // await demonstrarChat();
  
  debug('Demonstrações concluídas');
}

// Verificar se o debug está ativado
if (process.env.DEBUG && process.env.DEBUG.includes('gemini-agent-lib:')) {
  console.log('Debug ativado com: ' + process.env.DEBUG);
} else {
  console.log('Debug não ativado. Execute com:');
  console.log('DEBUG=gemini-agent-lib:* node examples/exemplo-debug.js');
}

// Executar o exemplo
executar().catch(erro => {
  console.error('Erro na execução do exemplo:', erro);
});
