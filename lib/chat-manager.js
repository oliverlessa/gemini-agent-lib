/**
 * ChatManager - Gerenciador de múltiplas sessões de ChatAgent
 * 
 * Esta classe permite que uma única configuração ou instância da biblioteca
 * possa gerenciar conversas separadas para diferentes usuários, mantendo
 * seus históricos e memórias isolados.
 */

const ChatAgent = require('./chat-agent');
const VertexAILLM = require('./vertex-ai-llm');
const AgentRegistry = require('./agent-registry');
const { v4: uuidv4 } = require('uuid');
const debug = require('./debug');

// Criar um logger específico para o ChatManager
debug.chatManager = debug.create('chat-manager');

class ChatManager {
    /**
     * Gerencia múltiplas sessões de ChatAgent para diferentes usuários.
     *
     * @param {Object} config - Configuração para criar novas instâncias de ChatAgent.
     * @param {Object} config.llmConfig - Configuração para instanciar o VertexAILLM (ou um LLM factory).
     * @param {string} config.llmConfig.projectId - Obrigatório.
     * @param {string} [config.llmConfig.credentialsPath] - Caminho para as credenciais.
     * @param {string} [config.llmConfig.apiKey] - API Key alternativa.
     * @param {string} [config.llmConfig.modelName="gemini-2.0-flash-001"] - Nome do modelo.
     * @param {Object} [config.agentConfig={}] - Configuração base para cada ChatAgent (role, objective, context, tools, etc.).
     * @param {Object} [config.memoryConfig={}] - Configuração dos adaptadores de memória a serem usados.
     * @param {Object} [config.memoryConfig.conversation] - Configuração do adaptador de memória de conversação.
     * @param {string} [config.memoryConfig.conversation.type] - Ex: 'SQLiteConversationMemoryAdapter'.
     * @param {Object} [config.memoryConfig.conversation.dbConfig] - Config específica do adaptador.
     * @param {Object} [config.memoryConfig.fact] - Configuração do adaptador de memória de fatos.
     * @param {string} [config.memoryConfig.fact.type] - Ex: 'MongoDBFactMemoryAdapter'.
     * @param {Object} [config.memoryConfig.fact.dbConfig] - Config específica.
     * @param {Object} [config.memoryConfig.summary] - Configuração do adaptador de memória de resumos.
     * @param {string} [config.memoryConfig.summary.type] - Ex: 'SQLiteSummaryMemoryAdapter'.
     * @param {Object} [config.memoryConfig.summary.dbConfig] - Config específica.
     * @param {boolean} [config.shareMemoryInstances=true] - Se true, cria uma única instância de cada adaptador de memória e a compartilha entre os ChatAgents. Se false, cria novas instâncias para cada sessão (menos eficiente, pode ser necessário para DBs como SQLite em cenários específicos).
     * @param {Object} [config.delegationConfig={}] - Configuração para delegação de especialistas.
     * @param {boolean} [config.delegationConfig.enabled=false] - Habilita delegação.
     * @param {Object} [config.delegationConfig.specialistAgentsConfig] - Configs dos especialistas.
     * @param {AgentRegistry} [config.delegationConfig.agentRegistry] - Instância compartilhada opcional.
     */
    constructor({ 
        llmConfig, 
        agentConfig = {}, 
        memoryConfig = {}, 
        delegationConfig = {}, 
        shareMemoryInstances = true 
    }) {
        if (!llmConfig || !llmConfig.projectId) {
            throw new Error("ChatManager requer 'llmConfig' com 'projectId'.");
        }

        this.baseLlmConfig = { ...llmConfig, mode: 'chat' }; // Garante modo chat
        this.baseAgentConfig = agentConfig;
        this.memoryConfig = memoryConfig;
        this.delegationConfig = delegationConfig;
        this.shareMemoryInstances = shareMemoryInstances;

        /** @type {Map<string, ChatAgent>} */
        this.activeSessions = new Map();

        // Pré-instanciar componentes compartilhados (se aplicável)
        this.sharedLlm = new VertexAILLM(this.baseLlmConfig); // Uma instância LLM pode ser compartilhada
        this.sharedMemoryInstances = {};
        this.sharedAgentRegistry = null;

        if (this.shareMemoryInstances) {
            this._initializeSharedMemories();
        }
        
        if (this.delegationConfig.enabled) {
            // Se não for fornecido um registry compartilhado, criamos um com a config global
            this.sharedAgentRegistry = this.delegationConfig.agentRegistry || 
                new AgentRegistry(this.delegationConfig.specialistAgentsConfig || {});
        }

        debug.chatManager("ChatManager inicializado.");
        if (this.shareMemoryInstances) debug.chatManager("Instâncias de memória serão compartilhadas.");
        if (this.sharedAgentRegistry) debug.chatManager("Registro de Agentes será compartilhado.");
    }

    /** 
     * Inicializa as instâncias de memória compartilhadas
     * @private 
     */
    _initializeSharedMemories() {
        debug.chatManager("Inicializando instâncias de memória compartilhada...");
        const memoryTypes = ['conversation', 'fact', 'summary']; // Adicionar 'semantic' quando pronto
        
        memoryTypes.forEach(memType => {
            const config = this.memoryConfig[memType];
            if (config && config.type && config.dbConfig) {
                try {
                    // Usa um factory ou switch para instanciar o adaptador correto
                    const AdapterClass = this._getMemoryAdapterClass(config.type);
                    this.sharedMemoryInstances[memType] = new AdapterClass({ dbConfig: config.dbConfig });
                    debug.chatManager(`Memória compartilhada '${memType}' (${config.type}) inicializada.`);
                } catch (error) {
                    console.error(`[ChatManager] Falha ao inicializar memória compartilhada ${memType} (${config.type}):`, error);
                    // Decide se quer continuar sem essa memória ou lançar erro fatal
                }
            }
        });
    }

    /** 
     * Obtém a classe do adaptador de memória pelo nome
     * @private 
     * @param {string} adapterType - Nome do tipo de adaptador
     * @returns {Class} Classe do adaptador
     */
    _getMemoryAdapterClass(adapterType) {
        // Importar os adaptadores de memória
        const {
            SQLiteConversationMemoryAdapter, 
            MongoDBConversationMemoryAdapter,
            SQLiteFactMemoryAdapter, 
            MongoDBFactMemoryAdapter,
            SQLiteSummaryMemoryAdapter, 
            MongoDBSummaryMemoryAdapter
        } = require('./memory');

        switch (adapterType) {
            case 'SQLiteConversationMemoryAdapter': return SQLiteConversationMemoryAdapter;
            case 'MongoDBConversationMemoryAdapter': return MongoDBConversationMemoryAdapter;
            case 'SQLiteFactMemoryAdapter': return SQLiteFactMemoryAdapter;
            case 'MongoDBFactMemoryAdapter': return MongoDBFactMemoryAdapter;
            case 'SQLiteSummaryMemoryAdapter': return SQLiteSummaryMemoryAdapter;
            case 'MongoDBSummaryMemoryAdapter': return MongoDBSummaryMemoryAdapter;
            default: throw new Error(`Tipo de adaptador de memória desconhecido: ${adapterType}`);
        }
    }

    /**
     * Obtém ou cria uma sessão de ChatAgent para um determinado ID.
     * @param {string} sessionId - Identificador único para a sessão/usuário. Deve ser não vazio.
     * @param {Object} [sessionOptions={}] - Opções específicas para esta sessão, que podem sobrescrever a configuração base do agente (ex: context personalizado).
     * @returns {Promise<ChatAgent>} A instância de ChatAgent para a sessão.
     * @throws {Error} Se sessionId for inválido.
     */
    async getOrCreateSession(sessionId, sessionOptions = {}) {
        if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
            throw new Error("sessionId inválido fornecido para getOrCreateSession.");
        }
        const trimmedSessionId = sessionId.trim();

        if (this.activeSessions.has(trimmedSessionId)) {
            debug.chatManager(`Retornando sessão existente para ID: ${trimmedSessionId}`);
            return this.activeSessions.get(trimmedSessionId);
        }

        debug.chatManager(`Criando nova sessão para ID: ${trimmedSessionId}`);

        // Preparar configuração final para esta instância do ChatAgent
        const agentFinalConfig = { ...this.baseAgentConfig, ...sessionOptions };

        // Lógica para instanciar/obter memórias para esta sessão
        let conversationMemoryInstance = null, factMemoryInstance = null, summaryMemoryInstance = null;
        
        if (this.shareMemoryInstances) {
            conversationMemoryInstance = this.sharedMemoryInstances.conversation || null;
            factMemoryInstance = this.sharedMemoryInstances.fact || null;
            summaryMemoryInstance = this.sharedMemoryInstances.summary || null;
        } else {
            // Criar instâncias de memória dedicadas (menos comum, mais complexo)
            // TODO: Implementar lógica para criar instâncias não compartilhadas se shareMemoryInstances for false
            console.warn("[ChatManager] Criação de instâncias de memória não compartilhadas não implementada, usando compartilhadas se disponíveis.");
            conversationMemoryInstance = this.sharedMemoryInstances.conversation || null;
            factMemoryInstance = this.sharedMemoryInstances.fact || null;
            summaryMemoryInstance = this.sharedMemoryInstances.summary || null;
        }

        // Criar a nova instância do ChatAgent
        const newAgentInstance = new ChatAgent({
            // Passar configurações base e sobrescritas
            ...agentFinalConfig,
            // Passar LLM (compartilhado)
            llm: this.sharedLlm,
            // Passar instâncias de memória (compartilhadas ou não)
            conversationMemory: conversationMemoryInstance,
            factMemory: factMemoryInstance,
            summaryMemory: summaryMemoryInstance,
            // Passar configuração de delegação
            enableSpecialistDelegation: this.delegationConfig.enabled || false,
            agentRegistry: this.sharedAgentRegistry, // Passa o registry compartilhado
            // specialistAgentsConfig NÃO é necessário aqui se agentRegistry é fornecido
            // Passar o sessionId como chatId OBRIGATORIAMENTE
            chatId: trimmedSessionId
        });

        // Armazenar a nova instância
        this.activeSessions.set(trimmedSessionId, newAgentInstance);
        debug.chatManager(`Nova sessão criada e armazenada para ID: ${trimmedSessionId}`);

        // Carregar histórico (se a memória for persistente e a instância acabou de ser criada)
        // A lógica _loadConversationHistory no construtor do ChatAgent já deve cuidar disso.

        return newAgentInstance;
    }

    /**
     * Processa uma mensagem de um usuário em uma sessão específica.
     * @param {string} sessionId - O ID da sessão/usuário.
     * @param {string} message - A mensagem do usuário.
     * @param {Object} [sessionOptions={}] - Opções para passar para getOrCreateSession se a sessão precisar ser criada.
     * @returns {Promise<Object>} A resposta do ChatAgent (geralmente { text: "..." }).
     * @throws {Error} Se sessionId for inválido ou ocorrer erro no processamento.
     */
    async processMessage(sessionId, message, sessionOptions = {}) {
        debug.chatManager(`Processando mensagem para sessão ID: ${sessionId}`);
        try {
            const agentInstance = await this.getOrCreateSession(sessionId, sessionOptions);
            const response = await agentInstance.processUserMessage(message);
            return response;
        } catch (error) {
            console.error(`[ChatManager] Erro ao processar mensagem para sessão ${sessionId}:`, error);
            // Retorna um erro padronizado ou relança
            return { text: "[Desculpe, ocorreu um erro ao processar sua mensagem.]" };
            // Ou: throw error;
        }
    }

    /**
     * Encerra uma sessão específica, removendo a instância do agente da memória ativa.
     * Nota: Isso NÃO limpa o histórico persistente.
     * @param {string} sessionId - O ID da sessão a ser encerrada.
     * @returns {boolean} True se a sessão foi encontrada e removida, false caso contrário.
     */
    endSession(sessionId) {
        if (!sessionId || typeof sessionId !== 'string') return false;
        const trimmedSessionId = sessionId.trim();

        const agentInstance = this.activeSessions.get(trimmedSessionId);
        if (agentInstance) {
            // Se as memórias NÃO forem compartilhadas, chamar agentInstance.close() aqui seria importante.
            // Se forem compartilhadas, o fechamento deve ser gerenciado centralmente quando o ChatManager for destruído.
            this.activeSessions.delete(trimmedSessionId);
            debug.chatManager(`Sessão encerrada e removida para ID: ${trimmedSessionId}`);
            return true;
        } else {
            debug.chatManager(`Tentativa de encerrar sessão inexistente: ${trimmedSessionId}`);
            return false;
        }
    }

    /**
     * Limpa o histórico de uma sessão específica (na memória persistente, se houver).
     * @param {string} sessionId - O ID da sessão cujo histórico deve ser limpo.
     * @returns {Promise<void>}
     * @throws {Error} Se a sessão não for encontrada.
     */
    async clearSessionHistory(sessionId) {
        if (!sessionId || typeof sessionId !== 'string' || !sessionId.trim()) {
            throw new Error("sessionId inválido fornecido para clearSessionHistory.");
        }
        const trimmedSessionId = sessionId.trim();
        const agentInstance = this.activeSessions.get(trimmedSessionId);
        
        if (!agentInstance) {
            // Se a sessão não está ativa, tenta limpar diretamente pela memória (se compartilhada)
            const conversationMemory = this.sharedMemoryInstances.conversation;
            if (conversationMemory) {
                debug.chatManager(`Limpando histórico persistente para sessão inativa ID: ${trimmedSessionId}`);
                await conversationMemory.clearHistory(trimmedSessionId);
                // Limpar outras memórias também?
                if (this.sharedMemoryInstances.fact) await this.sharedMemoryInstances.fact.deleteAllFacts(trimmedSessionId);
                if (this.sharedMemoryInstances.summary) await this.sharedMemoryInstances.summary.deleteAllSummaries(trimmedSessionId);
                return;
            } else {
                throw new Error(`Sessão com ID ${trimmedSessionId} não encontrada para limpar histórico.`);
            }
        }
        
        debug.chatManager(`Limpando histórico para sessão ativa ID: ${trimmedSessionId}`);
        await agentInstance.clearHistory();
        // Limpar outras memórias também?
        if (agentInstance.factMemory) await agentInstance.factMemory.deleteAllFacts(agentInstance.chatId);
        if (agentInstance.summaryMemory) await agentInstance.summaryMemory.deleteAllSummaries(agentInstance.chatId);
    }

    /**
     * Fecha todas as conexões de recursos compartilhados (LLM, Memórias).
     * Deve ser chamado quando a aplicação que usa o ChatManager está encerrando.
     */
    async shutdown() {
        debug.chatManager("Iniciando desligamento do ChatManager...");
        
        // Fechar LLM compartilhado (se o SDK tiver método close)
        // if (this.sharedLlm && typeof this.sharedLlm.close === 'function') {
        //     await this.sharedLlm.close();
        // }

        // Fechar memórias compartilhadas
        for (const memType in this.sharedMemoryInstances) {
            const memoryInstance = this.sharedMemoryInstances[memType];
            if (memoryInstance && typeof memoryInstance.close === 'function') {
                try {
                    debug.chatManager(`Fechando memória compartilhada ${memType}...`);
                    await memoryInstance.close();
                } catch (error) {
                    console.error(`[ChatManager] Erro ao fechar memória ${memType}:`, error);
                }
            }
        }
        
        this.activeSessions.clear(); // Limpa o mapa de sessões ativas
        debug.chatManager("ChatManager desligado.");
    }
}

module.exports = ChatManager;
