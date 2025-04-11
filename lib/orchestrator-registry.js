const SequentialAgentChain = require('./sequential-agent-chain');
const HierarchicalAgentOrchestrator = require('./hierarchical-agent-orchestrator');
const AutoGenOrchestrator = require('./auto-gen-orchestrator');
// Importar LLM e Agent pode ser necessário se os orquestradores precisarem deles na instanciação
const VertexAILLM = require('./vertex-ai-llm');
const Agent = require('./agent');
// Potencialmente, o AgentRegistry para orquestradores que usam agentes pré-definidos
const AgentRegistry = require('./agent-registry');

class OrchestratorRegistry {
    constructor(orchestratorConfigs = {}) {
        this.configs = orchestratorConfigs;
        // Cache opcional para instâncias, se a criação for custosa e reutilizável
        this.instances = {};
    }

    registerOrchestrator(name, config) {
        if (!config || !config.type) {
            throw new Error(`Configuração para orquestrador '${name}' deve incluir 'type'.`);
        }
        this.configs[name] = config;
        delete this.instances[name]; // Invalida cache se re-registrar
        console.log(`[OrchestratorRegistry] Orquestrador '${name}' registrado/atualizado.`);
    }

    getOrchestratorConfig(name) {
        return this.configs[name];
    }

    getAvailableOrchestratorNames() {
        return Object.keys(this.configs);
    }

    /**
     * Obtém (ou cria) uma instância de um orquestrador com base no nome registrado.
     * @param {string} name - O nome do orquestrador registrado.
     * @returns {Object} Uma instância do orquestrador.
     * @throws {Error} Se o nome do orquestrador não for encontrado ou a instanciação falhar.
     */
    getOrchestrator(name) {
        // Verifica cache (opcional)
        if (this.instances[name]) {
            return this.instances[name];
        }

        const config = this.configs[name];
        if (!config) {
            throw new Error(`[OrchestratorRegistry] Orquestrador com nome '${name}' não encontrado.`);
        }

        let orchestratorInstance;

        try {
            // Lógica para instanciar com base no tipo e configuração
            switch (config.type) {
                case 'SequentialAgentChain':
                    if (!config.agents || !Array.isArray(config.agents)) {
                        throw new Error(`Config para '${name}' (Sequential) requer um array 'agents'.`);
                    }
                    // Assume que config.agents contém instâncias de Agent ou configurações para criar Agents
                    // TODO: Adicionar lógica para instanciar agentes se necessário
                    orchestratorInstance = new SequentialAgentChain(config.agents);
                    break;

                case 'HierarchicalAgentOrchestrator':
                    if (!config.agents || !Array.isArray(config.agents)) {
                        throw new Error(`Config para '${name}' (Hierarchical) requer um array 'agents'.`);
                    }
                    if (!config.llmConfig) {
                         throw new Error(`Config para '${name}' (Hierarchical) requer 'llmConfig'.`);
                    }
                    // TODO: Instanciar LLM e Agentes conforme necessário
                    const hierarchicalLlm = new VertexAILLM(config.llmConfig); // Exemplo
                    orchestratorInstance = new HierarchicalAgentOrchestrator(config.agents, hierarchicalLlm);
                    break;

                case 'AutoGenOrchestrator':
                     if (!config.llmConfig || !config.llmConfig.projectId || !config.llmConfig.credentialsPath) {
                         throw new Error(`Config para '${name}' (AutoGen) requer 'llmConfig' com 'projectId' e 'credentialsPath'.`);
                     }
                    orchestratorInstance = new AutoGenOrchestrator(config.llmConfig);
                    break;

                default:
                    throw new Error(`[OrchestratorRegistry] Tipo de orquestrador desconhecido: '${config.type}' para o nome '${name}'.`);
            }
        } catch(error) {
             console.error(`[OrchestratorRegistry] Erro ao instanciar orquestrador '${name}':`, error);
             throw error; // Re-lança o erro
        }


        // Armazena no cache (opcional)
        // this.instances[name] = orchestratorInstance;

        return orchestratorInstance;
    }
}

module.exports = OrchestratorRegistry;
