const VertexAILLM = require('./vertex-ai-llm');
const Agent = require('./agent');

/**
 * Classe AgentRegistry - Gerencia a criação e configuração de agentes especialistas
 * 
 * Esta classe permite registrar, configurar e instanciar agentes especialistas
 * que podem ser utilizados pelo ChatAgent para delegação de tarefas.
 */
class AgentRegistry {
    /**
     * Construtor da classe AgentRegistry
     * 
     * @param {Object} specialistAgentsConfig - Configuração inicial dos agentes especialistas (opcional)
     */
    constructor(specialistAgentsConfig = {}) {
        // Configurações dos agentes especialistas
        this.specialistAgentsConfig = { ...specialistAgentsConfig };
        
        // Cache para reutilizar instâncias de LLM
        this.llmInstances = {};
        
        // Cache para reutilizar instâncias de agentes
        this.agentInstances = {};
    }
    
    /**
     * Define a configuração completa dos agentes especialistas
     * 
     * @param {Object} config - Objeto com as configurações dos agentes especialistas
     * @returns {AgentRegistry} A própria instância para encadeamento de métodos
     */
    setSpecialistAgentsConfig(config) {
        if (!config || typeof config !== 'object') {
            throw new Error('[AgentRegistry] A configuração deve ser um objeto válido');
        }
        
        // Substitui a configuração atual
        this.specialistAgentsConfig = { ...config };
        
        // Limpa os caches quando a configuração é alterada
        this.llmInstances = {};
        this.agentInstances = {};
        
        return this;
    }
    
    /**
     * Adiciona ou atualiza a configuração de um agente especialista específico
     * 
     * @param {string} role - O papel/identificador do agente especialista
     * @param {Object} config - Configuração do agente especialista
     * @returns {AgentRegistry} A própria instância para encadeamento de métodos
     */
    registerSpecialist(role, config) {
        if (!role || typeof role !== 'string') {
            throw new Error('[AgentRegistry] O papel (role) do especialista deve ser uma string válida');
        }
        
        if (!config || typeof config !== 'object') {
            throw new Error('[AgentRegistry] A configuração do especialista deve ser um objeto válido');
        }
        
        // Validações adicionais
        if (!config.objective) {
            console.warn(`[AgentRegistry] Aviso: Especialista '${role}' registrado sem um objetivo definido`);
        }
        
        if (!config.context) {
            console.warn(`[AgentRegistry] Aviso: Especialista '${role}' registrado sem um contexto definido`);
        }
        
        // Adiciona ou atualiza a configuração do especialista
        this.specialistAgentsConfig[role] = { ...config };
        
        // Limpa os caches específicos deste especialista
        delete this.llmInstances[role];
        delete this.agentInstances[role];
        
        console.log(`[AgentRegistry] Especialista '${role}' registrado com sucesso`);
        
        return this;
    }
    
    /**
     * Remove um agente especialista do registro
     * 
     * @param {string} role - O papel/identificador do agente especialista a ser removido
     * @returns {AgentRegistry} A própria instância para encadeamento de métodos
     */
    unregisterSpecialist(role) {
        if (this.specialistAgentsConfig[role]) {
            delete this.specialistAgentsConfig[role];
            delete this.llmInstances[role];
            delete this.agentInstances[role];
            console.log(`[AgentRegistry] Especialista '${role}' removido com sucesso`);
        } else {
            console.warn(`[AgentRegistry] Especialista '${role}' não encontrado para remoção`);
        }
        
        return this;
    }
    
    /**
     * Obtém a lista de papéis de especialistas disponíveis
     * 
     * @returns {Array<string>} Array com os papéis dos especialistas registrados
     */
    getAvailableSpecialistRoles() {
        return Object.keys(this.specialistAgentsConfig);
    }
    
    /**
     * Obtém a configuração de um especialista específico
     * 
     * @param {string} role - O papel/identificador do agente especialista
     * @returns {Object|null} A configuração do especialista ou null se não encontrado
     */
    getSpecialistConfig(role) {
        return this.specialistAgentsConfig[role] || null;
    }
    
    /**
     * Obtém uma instância do LLM para um especialista específico
     * 
     * @param {string} role - O papel/identificador do agente especialista
     * @returns {Object} Instância do LLM configurada para o especialista
     * @private
     */
    _getSpecialistLLM(role) {
        const config = this.specialistAgentsConfig[role];
        if (!config) {
            throw new Error(`[AgentRegistry] Configuração para o agente especialista com role '${role}' não encontrada.`);
        }
        
        const mode = config.llmMode || 'oneshot';
        const modelName = config.llmModelName || process.env.SPECIALIST_DEFAULT_MODEL || "gemini-2.0-flash-001";
        const llmKey = `${role}-${mode}-${modelName}`;
        
        if (!this.llmInstances[llmKey]) {
            console.log(`[AgentRegistry] Criando nova instância LLM para: ${llmKey}`);
            this.llmInstances[llmKey] = new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                apiKey: process.env.GOOGLE_API_KEY,
                location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
                modelName: modelName,
                mode: mode,
                generationConfig: config.generationConfig || { maxOutputTokens: 2048 }
            });
        }
        
        return this.llmInstances[llmKey];
    }
    
    /**
     * Obtém ou cria uma instância de um agente especialista
     * 
     * @param {string} role - O papel/identificador do agente especialista
     * @param {boolean} forceNew - Se true, força a criação de uma nova instância mesmo que exista no cache
     * @returns {Agent} Instância do agente especialista
     */
    getSpecialistAgent(role, forceNew = false) {
        const config = this.specialistAgentsConfig[role];
        if (!config) {
            throw new Error(`[AgentRegistry] Configuração para o agente especialista com role '${role}' não encontrada.`);
        }
        
        // Se forceNew for true ou não houver instância no cache, cria uma nova
        if (forceNew || !this.agentInstances[role]) {
            const specialistLlm = this._getSpecialistLLM(role);
            
            // Decide qual classe de agente usar (Agent ou outra, se especificado)
            const AgentClass = config.agentClass || Agent;
            
            console.log(`[AgentRegistry] Criando nova instância de ${AgentClass.name} para role: ${role}`);
            
            this.agentInstances[role] = new AgentClass({
                role: role,
                objective: config.objective,
                context: config.context,
                llm: specialistLlm,
                tools: config.tools || [],
                enableGoogleSearch: config.enableGoogleSearch || false,
                taskFormatter: config.taskFormatter || null
            });
        }
        
        return this.agentInstances[role];
    }
    
    /**
     * Limpa o cache de instâncias de LLM e agentes
     * 
     * @returns {AgentRegistry} A própria instância para encadeamento de métodos
     */
    clearCache() {
        this.llmInstances = {};
        this.agentInstances = {};
        console.log('[AgentRegistry] Cache de instâncias limpo');
        return this;
    }
}

// Exporta a classe AgentRegistry
module.exports = AgentRegistry;
