const FunctionDeclarationSchemaType = require('./function-declaration-schema-type');
const SequentialAgentChain = require('./sequential-agent-chain'); // Necessário para instanceof
const HierarchicalAgentOrchestrator = require('./hierarchical-agent-orchestrator'); // Necessário para instanceof
const AutoGenOrchestrator = require('./auto-gen-orchestrator'); // Necessário para instanceof

/**
 * Cria uma definição de ferramenta para invocar um orquestrador específico.
 * @param {string} orchestratorName - Nome do orquestrador registrado no registry.
 * @param {string} toolName - Nome desejado para a ferramenta (ex: 'run_sequential_analysis').
 * @param {string} toolDescription - Descrição para o LLM sobre quando usar a ferramenta.
 * @param {Object} inputParametersSchema - Esquema de parâmetros no formato FunctionDeclarationSchemaType para a entrada do orquestrador.
 * @param {OrchestratorRegistry} orchestratorRegistry - Instância do registry.
 * @returns {Object} A definição completa da ferramenta.
 */
function createOrchestratorTool(orchestratorName, toolName, toolDescription, inputParametersSchema, orchestratorRegistry) {
    if (!orchestratorRegistry || typeof orchestratorRegistry.getOrchestrator !== 'function') {
        throw new Error("Um OrchestratorRegistry válido é necessário.");
    }
     if (!orchestratorRegistry.getOrchestratorConfig(orchestratorName)){
         console.warn(`[ToolFactory] Configuração para orquestrador '${orchestratorName}' não encontrada no registry ao criar a ferramenta '${toolName}'. A ferramenta pode falhar em tempo de execução.`);
         // Poderia lançar erro, mas aviso permite definição flexível
     }

    return {
        name: toolName,
        description: toolDescription,
        parameters: inputParametersSchema, // Esquema definido pelo usuário
        /**
         * Função que será executada pelo agente quando a ferramenta for chamada pelo LLM.
         * @param {Object} args - Argumentos fornecidos pelo LLM, correspondendo ao inputParametersSchema.
         * @returns {Promise<any>} O resultado da execução do orquestrador.
         */
        function: async (args) => {
            console.log(`[Tool Execution] Tentando executar orquestrador '${orchestratorName}' via ferramenta '${toolName}' com args:`, args);
            try {
                const orchestrator = orchestratorRegistry.getOrchestrator(orchestratorName);
                let result;
                // Chama o método correto com base no tipo inferido ou conhecido
                if (orchestrator instanceof SequentialAgentChain) {
                    // Assumindo que o parâmetro principal é o input inicial
                    const initialInputKey = Object.keys(inputParametersSchema.properties)[0]; // Pega a primeira chave como input
                    const initialInput = args[initialInputKey];
                    if (initialInput === undefined) {
                        throw new Error(`Argumento esperado '${initialInputKey}' não fornecido para o orquestrador '${orchestratorName}'.`);
                    }
                    result = await orchestrator.run(initialInput);
                } else if (orchestrator instanceof HierarchicalAgentOrchestrator) {
                    const initialInputKey = Object.keys(inputParametersSchema.properties)[0];
                    const initialInput = args[initialInputKey];
                     if (initialInput === undefined) {
                        throw new Error(`Argumento esperado '${initialInputKey}' não fornecido para o orquestrador '${orchestratorName}'.`);
                     }
                    result = await orchestrator.orchestrate(initialInput);
                } else if (orchestrator instanceof AutoGenOrchestrator) {
                    // AutoGenOrchestrator pode ter uma lógica diferente, talvez precise de 'task' ou 'objective'
                    // Ajuste conforme a implementação real do AutoGenOrchestrator.run ou método similar
                    const initialInputKey = Object.keys(inputParametersSchema.properties)[0];
                    const initialInput = args[initialInputKey];
                    if (initialInput === undefined) {
                        throw new Error(`Argumento esperado '${initialInputKey}' não fornecido para o orquestrador '${orchestratorName}'.`);
                    }
                    // Supondo que AutoGenOrchestrator tenha um método 'run' ou 'orchestrateTask'
                    if (typeof orchestrator.orchestrateTask === 'function') {
                        result = await orchestrator.orchestrateTask(initialInput);
                    } else if (typeof orchestrator.run === 'function') {
                        result = await orchestrator.run(initialInput);
                    } else {
                         throw new Error(`Método de execução não encontrado para AutoGenOrchestrator '${orchestratorName}'.`);
                    }
                }
                else {
                    throw new Error(`Tipo de orquestrador não suportado ou não reconhecido para '${orchestratorName}'.`);
                }
                console.log(`[Tool Execution] Resultado do orquestrador '${orchestratorName}':`, result);
                // Retorna o resultado final do orquestrador. Pode ser necessário formatar.
                // Se o resultado for um objeto complexo, pode ser útil serializar para string
                // ou retornar apenas a parte mais relevante para o LLM.
                if (typeof result === 'object') {
                    return JSON.stringify(result, null, 2); // Exemplo: serializa para JSON
                }
                return result;
            } catch (error) {
                console.error(`[Tool Execution] Erro ao executar orquestrador '${orchestratorName}' via ferramenta '${toolName}':`, error);
                // Retorna uma string de erro para o LLM saber que falhou
                return `Erro ao executar orquestrador ${orchestratorName}: ${error.message}`;
            }
        }
    };
}

module.exports = { createOrchestratorTool };
