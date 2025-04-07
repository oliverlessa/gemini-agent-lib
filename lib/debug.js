/**
 * Módulo de debug para a biblioteca gemini-agent-lib
 * 
 * Este módulo fornece uma interface unificada para logs de depuração
 * usando a biblioteca 'debug'. Os logs podem ser ativados definindo
 * a variável de ambiente DEBUG.
 * 
 * Exemplos:
 *   - DEBUG=gemini-agent-lib:* (ativa todos os logs)
 *   - DEBUG=gemini-agent-lib:agent,gemini-agent-lib:memory:* (ativa logs específicos)
 */

const debug = require('debug');

// Namespace base para toda a biblioteca
const BASE_NAMESPACE = 'gemini-agent-lib';

/**
 * Cria uma instância de debug para um componente específico
 * @param {string} component - Nome do componente (ex: 'agent', 'memory', etc.)
 * @returns {Function} Função de debug configurada
 */
function createDebug(component) {
  return debug(`${BASE_NAMESPACE}:${component}`);
}

// Exporta funções de debug pré-configuradas para os principais componentes
module.exports = {
  // Função para criar um logger personalizado
  create: createDebug,
  
  // Loggers pré-configurados para componentes principais
  agent: createDebug('agent'),
  chatAgent: createDebug('chat-agent'),
  thinkingAgent: createDebug('thinking-agent'),
  memory: {
    conversation: createDebug('memory:conversation'),
    fact: createDebug('memory:fact'),
    summary: createDebug('memory:summary'),
    mongodb: createDebug('memory:mongodb'),
    sqlite: createDebug('memory:sqlite')
  },
  orchestrator: {
    hierarchical: createDebug('orchestrator:hierarchical'),
    sequential: createDebug('orchestrator:sequential'),
    autoGen: createDebug('orchestrator:auto-gen'),
    thinking: createDebug('orchestrator:thinking')
  },
  tools: createDebug('tools'),
  llm: createDebug('llm'),
  registry: createDebug('registry')
};
