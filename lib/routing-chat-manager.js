/**
 * RoutingChatManager - Gerenciador de múltiplas sessões de ChatAgent com suporte a sub-conversas delegadas
 * 
 * Esta classe estende ChatManager e adiciona suporte para sub-conversas delegadas,
 * permitindo que um agente coordenador transfira temporariamente o controle da conversa
 * para um agente especialista e depois retome o controle.
 */

const ChatManager = require('./chat-manager');
const ChatAgent = require('./chat-agent');
const AgentRegistry = require('./agent-registry');
const { request_specialist_sub_conversation, end_specialist_sub_conversation } = require('./tools/subconversation-tools');
const debug = require('./debug');

// Criar um logger específico para o RoutingChatManager
debug.routingChatManager = debug.create('routing-chat-manager');

/**
 * @typedef {Object} SessionState
 * @property {ChatAgent} primaryAgent - O agente coordenador principal da sessão
 * @property {ChatAgent} activeAgent - O agente atualmente ativo (coordenador ou especialista)
 * @property {string|null} activeSpecialistRole - O papel do especialista ativo (ou null se o coordenador estiver ativo)
 * @property {Object<string, ChatAgent>} specialistInstances - Mapa de instâncias de especialistas criadas para esta sessão
 * @property {Object|null} pendingSpecialistResult - Resultado pendente de um especialista que acabou de finalizar
 */

class RoutingChatManager extends ChatManager {
    /**
     * Gerencia múltiplas sessões de ChatAgent com suporte a sub-conversas delegadas.
     *
     * @param {Object} config - Configuração para criar novas instâncias de ChatAgent.
     * @param {Object} config.llmConfig - Configuração para instanciar o VertexAILLM (ou um LLM factory).
     * @param {string} config.llmConfig.projectId - Obrigatório.
     * @param {string} [config.llmConfig.credentialsPath] - Caminho para as credenciais.
     * @param {string} [config.llmConfig.apiKey] - API Key alternativa.
     * @param {string} [config.llmConfig.modelName="gemini-2.0-flash-001"] - Nome do modelo.
     * @param {Object} [config.agentConfig={}] - Configuração base para cada ChatAgent (role, objective, context, tools, etc.).
     * @param {Object} [config.memoryConfig={}] - Configuração dos adaptadores de memória a serem usados.
     * @param {boolean} [config.shareMemoryInstances=true] - Se true, cria uma única instância de cada adaptador de memória e a compartilha entre os ChatAgents.
     * @param {Object} [config.specialistAgentRegistryConfig={}] - Configuração para o registro de agentes especialistas.
     */
    constructor({
        llmConfig,
        agentConfig = {},
        memoryConfig = {},
        shareMemoryInstances = true,
        specialistAgentRegistryConfig = {}
    }) {
        // Chamar o construtor da classe pai com as configurações relevantes
        super({
            llmConfig,
            agentConfig,
            memoryConfig,
            shareMemoryInstances
        });

        // Inicializar o registro de especialistas
        this.specialistRegistry = new AgentRegistry(specialistAgentRegistryConfig);

        // Inicializar o mapa de estados de sessão
        /** @type {Map<string, SessionState>} */
        this.sessionStates = new Map();

        debug.routingChatManager("RoutingChatManager inicializado.");
    }

    /**
     * Obtém ou cria o estado de uma sessão.
     * @param {string} sessionId - Identificador único para a sessão/usuário.
     * @param {Object} [sessionOptions={}] - Opções específicas para esta sessão.
     * @returns {Promise<SessionState>} O estado da sessão.
     * @private
     */
    async getOrCreateSessionState(sessionId, sessionOptions = {}) {
        if (this.sessionStates.has(sessionId)) {
            debug.routingChatManager(`Retornando estado de sessão existente para ID: ${sessionId}`);
            return this.sessionStates.get(sessionId);
        }

        debug.routingChatManager(`Criando novo estado de sessão para ID: ${sessionId}`);

        // Obter o agente primário usando o método da classe pai
        const primaryAgent = await super.getOrCreateSession(sessionId, {
            ...sessionOptions,
            // Adicionar a ferramenta de sinalização para solicitar sub-conversa
            tools: [...(sessionOptions.tools || []), request_specialist_sub_conversation]
        });

        // Criar o estado da sessão
        const sessionState = {
            primaryAgent,
            activeAgent: primaryAgent, // Inicialmente, o agente ativo é o primário
            activeSpecialistRole: null,
            specialistInstances: {},
            pendingSpecialistResult: null
        };

        // Armazenar o estado da sessão
        this.sessionStates.set(sessionId, sessionState);

        return sessionState;
    }

    /**
     * Sobrescreve o método getOrCreateSession para retornar apenas o agente primário.
     * @param {string} sessionId - Identificador único para a sessão/usuário.
     * @param {Object} [sessionOptions={}] - Opções específicas para esta sessão.
     * @returns {Promise<ChatAgent>} A instância de ChatAgent primário para a sessão.
     */
    async getOrCreateSession(sessionId, sessionOptions = {}) {
        const state = await this.getOrCreateSessionState(sessionId, sessionOptions);
        return state.primaryAgent;
    }

    /**
     * Processa uma mensagem de um usuário em uma sessão específica, roteando para o agente correto.
     * @param {string} sessionId - O ID da sessão/usuário.
     * @param {string} message - A mensagem do usuário.
     * @param {Object} [sessionOptions={}] - Opções para passar para getOrCreateSession se a sessão precisar ser criada.
     * @returns {Promise<Object>} A resposta do ChatAgent (geralmente { text: "..." }).
     */
    async processMessage(sessionId, message, sessionOptions = {}) {
        debug.routingChatManager(`Processando mensagem para sessão ID: ${sessionId}`);
        
        try {
            // Obter ou criar o estado da sessão
            const state = await this.getOrCreateSessionState(sessionId, sessionOptions);
            
            let agentToProcess;
            let messageForAgent;
            
            // Verificar se existe um resultado pendente de especialista
            if (state.pendingSpecialistResult) {
                debug.routingChatManager(`Resultado pendente encontrado para ${sessionId}. Preparando contexto para o agente primário.`);
                
                // O agente a processar é o primário
                agentToProcess = state.primaryAgent;
                
                // Obter o resultado pendente
                const pendingResult = state.pendingSpecialistResult;
                
                // Limpar o resultado pendente imediatamente para evitar reprocessamento
                state.pendingSpecialistResult = null;
                
                // Construir a mensagem para o agente primário com todas as informações relevantes
                messageForAgent = `[SYSTEM_NOTE: Sub-conversa anterior com especialista '${pendingResult.endedSpecialistRole}' concluída.
Status: ${pendingResult.status}
Resultado do Especialista: ${JSON.stringify(pendingResult.final_result)}
Última Mensagem do Usuário para Especialista: "${pendingResult.last_user_message}"
Mensagem do Especialista para Você: ${pendingResult.message_to_coordinator || 'Nenhuma'}]

---

Agora, processe a NOVA mensagem do usuário abaixo, levando em conta TODAS as informações da nota acima:
${message}
`;
            } else {
                // Sem resultado pendente, usar o agente ativo atual
                agentToProcess = state.activeAgent;
                messageForAgent = message;
            }
            
            // Processar a mensagem com o agente apropriado
            debug.routingChatManager(`Enviando mensagem para ${agentToProcess === state.primaryAgent ? 'agente primário' : 'especialista: ' + state.activeSpecialistRole}`);
            const response = await agentToProcess.processUserMessage(messageForAgent);
            
            // Verificar se a resposta contém um sinal interno
            if (response && response._internalToolSignal) {
                const signal = response._internalToolSignal;
                
                if (signal._signal_type === "REQUEST_SUB_CONVERSATION") {
                    debug.routingChatManager(`Sinal REQUEST_SUB_CONVERSATION detectado. Iniciando sub-conversa.`);
                    // Inicia a sub-conversa (define o especialista como agente ativo)
                    await this._startSubConversation(state, signal.details);

                    // --- INÍCIO DA NOVA LÓGICA ---
                    // Obtém o especialista recém-ativado
                    const specialistAgent = state.activeAgent;
                    const originalUserMessage = message; // A mensagem original que causou a transferência

                    if (specialistAgent && specialistAgent !== state.primaryAgent) {
                        debug.routingChatManager(`Processando automaticamente a mensagem original "${originalUserMessage.substring(0,50)}..." com o especialista ${state.activeSpecialistRole}`);
                        // Chama imediatamente o especialista com a mensagem original do usuário
                        const specialistResponse = await specialistAgent.processUserMessage(originalUserMessage);

                        // Retorna a resposta do especialista em vez da resposta do coordenador
                        // Se o especialista também retornar um sinal (ex: END_SUB_CONVERSATION imediato),
                        // ele será tratado na próxima chamada a processMessage ou aqui mesmo se necessário.
                        return specialistResponse;
                    } else {
                        // Fallback defensivo: se não conseguiu ativar o especialista, retorna a resposta do coordenador
                        console.error("[RoutingChatManager] Erro: Não foi possível obter o agente especialista após iniciar a sub-conversa. Retornando resposta do coordenador.");
                        // A resposta do especialista já foi retornada na lógica acima
                        return specialistResponse;
                    }
                    // --- FIM DA NOVA LÓGICA ---
                } else if (signal._signal_type === "END_SUB_CONVERSATION") {
                    // Verifica se o sinal veio do especialista
                    if (agentToProcess !== state.primaryAgent) {
                        debug.routingChatManager(`Sinal END_SUB_CONVERSATION detectado do especialista ${state.activeSpecialistRole}. Interceptando e re-roteando para o primário.`);

                        // Finaliza a sub-conversa e armazena o resultado pendente
                        await this._endSubConversation(state, signal.details);

                        // Obter o resultado que acabou de ser armazenado
                        const pendingResult = state.pendingSpecialistResult;
                        if (!pendingResult) {
                             // Fallback defensivo - algo deu errado em _endSubConversation
                             console.error("[RoutingChatManager] Erro crítico: Resultado pendente não encontrado após _endSubConversation. Não é possível re-rotear.");
                             // Retorna um erro genérico em vez da resposta do especialista
                             return { text: "[Desculpe, ocorreu um erro interno ao finalizar a conversa com o especialista.]" };
                        }
                        state.pendingSpecialistResult = null; // Limpar imediatamente

                        // Construir a mensagem para o agente primário
                        // Usar a mensagem original 'message' que foi passada para processMessage
                        const messageForPrimary = `[SYSTEM_NOTE: Sub-conversa com especialista '${pendingResult.endedSpecialistRole}' finalizada pelo especialista.
Status: ${pendingResult.status}
Resultado do Especialista: ${JSON.stringify(pendingResult.final_result)}
Última Mensagem do Usuário (causou o fim, não respondida pelo especialista): "${pendingResult.last_user_message}"
Mensagem do Especialista para Você: ${pendingResult.message_to_coordinator || 'Nenhuma'}]

---

Agora, processe a mensagem original do usuário acima, que não foi respondida pelo especialista:
${message}
`;
                        debug.routingChatManager(`Enviando mensagem original re-roteada para o agente primário.`);
                        const primaryResponse = await state.primaryAgent.processUserMessage(messageForPrimary);

                        // Retorna a resposta do agente primário
                        return primaryResponse;

                    } else {
                        // Caso raro: Sinal END veio do agente primário (não deveria acontecer)
                        debug.routingChatManager(`Sinal END_SUB_CONVERSATION detectado do agente primário (inesperado). Finalizando sub-conversa.`);
                        await this._endSubConversation(state, signal.details);
                        // Neste caso, apenas retornamos a resposta original (que contém o sinal)
                        // pois não há para onde re-rotear. O fluxo normal de pendingResult cuidará disso na próxima chamada.
                        return response;
                    }
                } else if (signal._signal_type === "SIGNAL_ERROR") {
                    console.error(`[RoutingChatManager] Erro de sinal: ${signal.error}`);
                    // A resposta original (que pode conter o erro) será retornada abaixo.
                }
            }

            // Se não houve sinal, ou se o sinal foi tratado e já retornou (REQUEST_SUB_CONVERSATION ou END_SUB_CONVERSATION interceptado),
            // ou se foi um SIGNAL_ERROR, este return pega os casos restantes.
            // Retorna a resposta original do agente que foi chamado (seja primário ou especialista sem sinal de fim).
            return response;
        } catch (error) {
            console.error(`[RoutingChatManager] Erro ao processar mensagem para sessão ${sessionId}:`, error);
            return { text: "[Desculpe, ocorreu um erro ao processar sua mensagem.]" };
        }
    }

    /**
     * Inicia uma sub-conversa com um especialista.
     * @param {SessionState} state - O estado da sessão.
     * @param {Object} details - Detalhes do sinal REQUEST_SUB_CONVERSATION.
     * @private
     */
    async _startSubConversation(state, details) {
        const { specialist_role, initial_context, user_message_for_specialist } = details;
        
        debug.routingChatManager(`Iniciando sub-conversa com especialista: ${specialist_role}`);
        
        try {
            // Verificar se o especialista já foi instanciado para esta sessão
            if (!state.specialistInstances[specialist_role]) {
                debug.routingChatManager(`Criando nova instância do especialista: ${specialist_role}`);
                
                // Obter a configuração do especialista do registro
                const specialistConfig = this.specialistRegistry.getSpecialistConfig(specialist_role);
                
                if (!specialistConfig) {
                    throw new Error(`Especialista '${specialist_role}' não encontrado no registro.`);
                }
                
                // Criar uma nova instância do especialista
                const specialistAgent = new ChatAgent({
                    ...specialistConfig,
                    // Adicionar a ferramenta de sinalização para finalizar sub-conversa
                    tools: [...(specialistConfig.tools || []), end_specialist_sub_conversation],
                    // Usar o mesmo LLM compartilhado
                    llm: this.sharedLlm,
                    // Usar as mesmas instâncias de memória compartilhadas
                    conversationMemory: this.sharedMemoryInstances.conversation,
                    factMemory: this.sharedMemoryInstances.fact,
                    summaryMemory: this.sharedMemoryInstances.summary,
                    // Usar o mesmo chatId para manter o contexto
                    chatId: state.primaryAgent.chatId
                });
                
                // Armazenar a instância do especialista
                state.specialistInstances[specialist_role] = specialistAgent;
            }
            
            // Obter a instância do especialista
            const specialistAgent = state.specialistInstances[specialist_role];
            
            // Atualizar o contexto do especialista com o contexto inicial fornecido
            if (initial_context && specialistAgent.context) {
                specialistAgent.context = `${specialistAgent.context}\n\n${initial_context}`;
            } else if (initial_context) {
                specialistAgent.context = initial_context;
            }
            
            // Atualizar o estado da sessão
            state.activeAgent = specialistAgent;
            state.activeSpecialistRole = specialist_role;
            
            // Se houver uma mensagem inicial para o especialista, processá-la
            if (user_message_for_specialist) {
                debug.routingChatManager(`Enviando mensagem inicial para o especialista: ${user_message_for_specialist.substring(0, 50)}${user_message_for_specialist.length > 50 ? '...' : ''}`);
                // Não precisamos fazer nada com a resposta aqui, pois o próximo processMessage já usará o especialista como agente ativo
            }
            
        } catch (error) {
            console.error(`[RoutingChatManager] Erro ao iniciar sub-conversa:`, error);
            // Reverter para o agente primário em caso de erro
            state.activeAgent = state.primaryAgent;
            state.activeSpecialistRole = null;
        }
    }

    /**
     * Finaliza uma sub-conversa com um especialista.
     * @param {SessionState} state - O estado da sessão.
     * @param {Object} details - Detalhes do sinal END_SUB_CONVERSATION.
     * @private
     */
    async _endSubConversation(state, details) {
        const { status, final_result, last_user_message, message_to_coordinator } = details;
        
        debug.routingChatManager(`Finalizando sub-conversa com especialista: ${state.activeSpecialistRole}`);
        
        try {
            // Armazenar o resultado do especialista para ser processado na próxima mensagem
            state.pendingSpecialistResult = {
                endedSpecialistRole: state.activeSpecialistRole,
                status,
                final_result,
                last_user_message,
                message_to_coordinator
            };
            
            // Retornar o controle para o agente primário
            state.activeAgent = state.primaryAgent;
            state.activeSpecialistRole = null;
            
            debug.routingChatManager(`Controle retornado para o agente primário. Resultado pendente armazenado.`);
            
        } catch (error) {
            console.error(`[RoutingChatManager] Erro ao finalizar sub-conversa:`, error);
            // Garantir que o controle volte para o agente primário mesmo em caso de erro
            state.activeAgent = state.primaryAgent;
            state.activeSpecialistRole = null;
        }
    }

    /**
     * Encerra uma sessão específica, removendo a instância do agente da memória ativa.
     * @param {string} sessionId - O ID da sessão a ser encerrada.
     * @returns {boolean} True se a sessão foi encontrada e removida, false caso contrário.
     */
    endSession(sessionId) {
        // Remover o estado da sessão
        if (this.sessionStates.has(sessionId)) {
            this.sessionStates.delete(sessionId);
        }
        
        // Chamar o método da classe pai para remover a sessão do mapa activeSessions
        return super.endSession(sessionId);
    }

    /**
     * Limpa o histórico de uma sessão específica (na memória persistente, se houver).
     * @param {string} sessionId - O ID da sessão cujo histórico deve ser limpo.
     * @returns {Promise<void>}
     */
    async clearSessionHistory(sessionId) {
        // Obter o estado da sessão
        const state = this.sessionStates.get(sessionId);
        
        if (state) {
            // Limpar o histórico do agente primário
            await state.primaryAgent.clearHistory();
            
            // Limpar o histórico de todos os especialistas
            for (const specialistRole in state.specialistInstances) {
                const specialistAgent = state.specialistInstances[specialistRole];
                await specialistAgent.clearHistory();
            }
            
            // Limpar o resultado pendente
            state.pendingSpecialistResult = null;
        } else {
            // Se o estado não for encontrado, chamar o método da classe pai
            await super.clearSessionHistory(sessionId);
        }
    }

    /**
     * Fecha todas as conexões de recursos compartilhados (LLM, Memórias).
     * Deve ser chamado quando a aplicação que usa o RoutingChatManager está encerrando.
     */
    async shutdown() {
        // Limpar o mapa de estados de sessão
        this.sessionStates.clear();
        
        // Chamar o método da classe pai para fechar as conexões compartilhadas
        await super.shutdown();
    }
}

module.exports = RoutingChatManager;
