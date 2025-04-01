const Agent = require('./agent');
const VertexAILLM = require('./vertex-ai-llm');
const FunctionDeclarationSchemaType = require('./function-declaration-schema-type');
const AgentRegistry = require('./agent-registry');

/**
 * Classe ChatAgent - Agente especializado em manter conversas com histórico
 * 
 * Esta classe estende a classe Agent base e adiciona funcionalidades para
 * manter o histórico de conversa entre interações com o usuário.
 * Opcionalmente, pode delegar tarefas para agentes especialistas.
 */
class ChatAgent extends Agent {
    /**
     * Construtor da classe ChatAgent
     * 
     * @param {Object} config - Configuração do agente
     * @param {string} config.role - Papel/função do agente (ex: "Assistente Pessoal")
     * @param {string} config.objective - Objetivo principal do agente
     * @param {string} config.context - Contexto ou instruções para o agente
     * @param {Object} [config.llm] - Instância do modelo de linguagem a ser usado (deve estar em modo "chat").
     *                               Se não fornecido, um VertexAILLM padrão será instanciado automaticamente.
     * @param {Array} config.tools - Array de ferramentas disponíveis para o agente
     * @param {boolean} config.enableGoogleSearch - Ativa o Google Search para o agente
     * @param {boolean} config.enableSpecialistDelegation - Ativa a delegação para agentes especialistas
     * @param {AgentRegistry} config.agentRegistry - Instância de AgentRegistry (opcional)
     * @param {Object} config.specialistAgentsConfig - Configuração dos agentes especialistas (opcional)
     */
    constructor({
        role,
        objective,
        context,
        llm,
        tools = [],
        enableGoogleSearch = false,
        enableSpecialistDelegation = false,
        agentRegistry = null,
        specialistAgentsConfig = {}
    }) {
        // Se o LLM não for fornecido, cria uma instância padrão do VertexAILLM no modo chat
        let llmInstance = llm;
        if (!llmInstance) {
            console.log("[ChatAgent] LLM não fornecido. Criando instância padrão do VertexAILLM no modo chat.");
            llmInstance = new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                modelName: "gemini-2.0-flash-001",
                mode: "chat",
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.2
                }
            });
        }

        // Verifica se o LLM está no modo chat
        if (llmInstance.mode !== "chat") {
            console.warn("AVISO: O LLM não está configurado no modo 'chat'. O histórico de conversa pode não funcionar corretamente.");
        }
        
        // Preparar variáveis para configuração de delegação
        let allTools = [...tools];
        let finalContext = context;
        
        // Chama o construtor da classe pai (Agent) PRIMEIRO
        super({
            role,
            objective,
            context: finalContext,
            task: "", // Inicialmente vazio, será preenchido a cada interação
            llm: llmInstance,
            tools: allTools,
            enableGoogleSearch
        });
        
        // Histórico de conversas
        this.conversationHistory = [];
        
        // Configurar delegação para especialistas (se habilitada) DEPOIS do super()
        this.specialistDelegationEnabled = false; // Por padrão, a delegação está desabilitada
        
        if (enableSpecialistDelegation) {
            this._setupSpecialistDelegation(agentRegistry, specialistAgentsConfig, role, objective);
        }
    }
    
    /**
     * Configura a delegação para agentes especialistas
     * @private
     * @param {AgentRegistry} agentRegistry - Instância de AgentRegistry (opcional)
     * @param {Object} specialistAgentsConfig - Configuração dos agentes especialistas
     * @param {string} role - Papel/função do agente
     * @param {string} objective - Objetivo principal do agente
     */
    _setupSpecialistDelegation(agentRegistry, specialistAgentsConfig, role, objective) {
        try {
            // Configurar o registry de agentes especialistas
            if (agentRegistry && agentRegistry instanceof AgentRegistry) {
                this.agentRegistry = agentRegistry;
            } else {
                // Criar uma nova instância com a configuração fornecida
                this.agentRegistry = new AgentRegistry(specialistAgentsConfig);
            }
            
            // Verificar se há especialistas registrados
            const availableRoles = this.agentRegistry.getAvailableSpecialistRoles();
            
            if (availableRoles.length === 0) {
                console.warn('[ChatAgent] Aviso: Delegação de especialistas habilitada, mas nenhum especialista registrado.');
            } else {
                // Se não foi fornecido um contexto personalizado, criar um com informações sobre especialistas
                if (!this.context) {
                    this.context = `Você é um ${role} com o objetivo de ${objective}.
Sua principal função é conversar com o usuário. Responda diretamente sempre que possível.
Você tem acesso aos seguintes especialistas para tarefas específicas:
${availableRoles.map(r => `- ${r}`).join('\n')}

Instruções para delegação:
1. Analise a solicitação do usuário.
2. Se for uma pergunta geral ou algo que você pode responder, FAÇA ISSO DIRETAMENTE.
3. **SOMENTE SE** a solicitação exigir CLARAMENTE uma das especialidades listadas acima, use a ferramenta 'delegate_task_to_specialist'.
4. Ao delegar:
    - Forneça o 'specialist_role' EXATO da lista.
    - Crie uma 'task_for_specialist' CLARA e AUTOCONTIDA, passando TODO o contexto necessário.
5. Após receber a resposta do especialista, integre-a NATURALMENTE na sua resposta final ao usuário.
6. NÃO invente especialistas ou use a ferramenta de delegação para tarefas simples.`;
                }
                
                // Adicionar a ferramenta de delegação
                const delegationTool = this._createDelegationTool(availableRoles);
                this.tools.unshift(delegationTool);
                
                // Habilitar a delegação
                this.specialistDelegationEnabled = true;
                
                console.log(`[ChatAgent] Delegação para especialistas habilitada com ${availableRoles.length} especialistas disponíveis.`);
            }
        } catch (error) {
            console.warn(`[ChatAgent] Aviso: Não foi possível habilitar a delegação para especialistas: ${error.message}`);
        }
    }
    
    /**
     * Cria a ferramenta de delegação para especialistas
     * @private
     * @param {Array<string>} availableRoles - Lista de papéis de especialistas disponíveis
     * @returns {Object} Objeto de configuração da ferramenta de delegação
     */
    _createDelegationTool(availableRoles) {
        return {
            name: "delegate_task_to_specialist",
            description: `Delega uma tarefa específica para um agente especialista quando a pergunta do usuário requer conhecimento ou ação especializada.`,
            parameters: {
                type: FunctionDeclarationSchemaType.OBJECT,
                properties: {
                    specialist_role: {
                        type: FunctionDeclarationSchemaType.STRING,
                        description: `O papel do agente especialista necessário. Deve ser um dos seguintes: ${availableRoles.join(', ')}.`
                    },
                    task_for_specialist: {
                        type: FunctionDeclarationSchemaType.STRING,
                        description: "A descrição clara e completa da tarefa a ser executada pelo agente especialista."
                    }
                },
                required: ["specialist_role", "task_for_specialist"]
            }
        };
    }
    
    /**
     * Processa uma mensagem do usuário e gera uma resposta
     * 
     * @param {string} message - Mensagem do usuário
     * @returns {Promise<Object>} - Resposta do LLM
     */
    async processUserMessage(message) {
        console.log(`\n[ChatAgent] Processando mensagem do usuário: "${message}"`);
        
        // Define a mensagem do usuário como a tarefa atual
        this.task = message;
        
        // Prepara o histórico para o LLM
        const history = this.prepareHistoryForLLM();
        
        console.log(`[ChatAgent] Histórico atual: ${this.conversationHistory.length} mensagens`);
        
        // Adiciona a mensagem do usuário ao histórico
        this.addToHistory("user", message);
        
        // Gera a resposta usando o LLM no modo chat
        let response = await this.llm.generateContent({
            prompt: message,
            context: this.context,
            tools: this.prepareToolsForLLM(),
            history: history
        });
        
        // Loop para lidar com function calls (similar ao método executeTask)
        while (response && response.functionCall) {
            const functionCall = response.functionCall;
            console.log(`\n[ChatAgent] LLM solicitou Function Call: ${functionCall.name}`);
            console.log("Argumentos:", functionCall.args);
            
            // Adiciona a resposta com function call ao histórico
            this.addToHistory("model", response.text || `[Function Call: ${functionCall.name}]`);
            
            let functionResult;
            
            // Verifica se é uma chamada para delegação e se a delegação está habilitada
            if (functionCall.name === "delegate_task_to_specialist" && this.specialistDelegationEnabled) {
                try {
                    const { specialist_role, task_for_specialist } = functionCall.args;
                    
                    if (!specialist_role || !task_for_specialist) {
                        throw new Error("Argumentos 'specialist_role' ou 'task_for_specialist' ausentes ou inválidos.");
                    }
                    
                    const availableRoles = this.agentRegistry.getAvailableSpecialistRoles();
                    if (!availableRoles.includes(specialist_role)) {
                        throw new Error(`Papel de especialista inválido: '${specialist_role}'. Papéis disponíveis: ${availableRoles.join(', ')}`);
                    }
                    
                    console.log(`[ChatAgent] Delegando tarefa para: ${specialist_role}`);
                    console.log(`[ChatAgent] Tarefa para o especialista: ${task_for_specialist}`);
                    
                    const specialistAgent = this.agentRegistry.getSpecialistAgent(specialist_role);
                    
                    // Define a tarefa específica para o especialista
                    specialistAgent.task = task_for_specialist;
                    
                    // Executa a tarefa no agente especialista
                    const specialistResponseText = await specialistAgent.executeTask();
                    
                    console.log(`[ChatAgent] Resposta do especialista ${specialist_role}: ${specialistResponseText.substring(0, 200)}${specialistResponseText.length > 200 ? '...' : ''}`);
                    functionResult = specialistResponseText;
                    
                } catch (error) {
                    console.error(`[ChatAgent] Erro durante delegação:`, error);
                    functionResult = `Erro ao processar delegação: ${error.message}`;
                }
            } else {
                // Lógica existente para outras ferramentas
                const functionToExecute = this.findToolFunction(functionCall.name);
                if (!functionToExecute) {
                    const errorMessage = `Função '${functionCall.name}' não encontrada nas tools do agente.`;
                    console.error(errorMessage);
                    
                    // Adiciona o erro ao histórico
                    this.addToHistory("user", `Erro: ${errorMessage}`);
                    
                    // Gera uma nova resposta com o erro
                    response = await this.llm.generateContent({
                        prompt: `Erro: ${errorMessage}`,
                        context: this.context,
                        tools: this.prepareToolsForLLM(),
                        history: this.prepareHistoryForLLM()
                    });
                    continue;
                }
                
                // Executar a função e obter o resultado
                try {
                    const functionArgs = functionCall.args || {};
                    console.log(`[ChatAgent] Executando função '${functionCall.name}' com argumentos:`, functionArgs);
                    functionResult = await functionToExecute(functionArgs);
                    console.log(`[ChatAgent] Resultado da Function Call '${functionCall.name}':`, JSON.stringify(functionResult, null, 2));
                } catch (error) {
                    console.error(`[ChatAgent] Erro ao executar a função '${functionCall.name}':`, error);
                    functionResult = `Erro ao executar a função '${functionCall.name}': ${error.message}`;
                }
            }
            
            // Formata a mensagem com o resultado da função
            const functionResultMessage = `Resultado da função ${functionCall.name}: ${JSON.stringify(functionResult)}`;
            
            // Adiciona o resultado da função ao histórico
            this.addToHistory("user", functionResultMessage);
            
            // Gera uma nova resposta com base no resultado da função
            response = await this.llm.generateContent({
                prompt: functionResultMessage,
                context: this.context,
                tools: this.prepareToolsForLLM(),
                history: this.prepareHistoryForLLM()
            });
        }
        
        // Adiciona a resposta final ao histórico (se não for uma function call)
        if (response && !response.functionCall) {
            this.addToHistory("model", response.text);
        }
        
        return response;
    }
    
    /**
     * Processa o resultado de uma function call e gera uma nova resposta
     * 
     * @param {string} functionName - Nome da função chamada
     * @param {Object} result - Resultado da função
     * @returns {Promise<Object>} - Nova resposta do LLM
     */
    async processFunctionResult(functionName, result) {
        console.log(`\n[ChatAgent] Processando resultado da função ${functionName}`);
        
        // Formata a mensagem com o resultado da função
        const functionResultMessage = `Resultado da função ${functionName}: ${JSON.stringify(result)}`;
        
        // Adiciona o resultado da função ao histórico como uma mensagem do usuário
        this.addToHistory("user", functionResultMessage);
        
        // Gera uma nova resposta com base no resultado da função
        const response = await this.llm.generateContent({
            prompt: functionResultMessage,
            context: this.context,
            tools: this.prepareToolsForLLM(),
            history: this.prepareHistoryForLLM()
        });
        
        // Adiciona a resposta ao histórico
        this.addToHistory("model", response.text);
        
        return response;
    }
    
    /**
     * Prepara o histórico no formato esperado pelo LLM
     * 
     * @returns {Array} - Histórico formatado para o LLM
     */
    prepareHistoryForLLM() {
        return this.conversationHistory.map(item => ({
            role: item.role,
            parts: [{ text: item.content }]
        }));
    }
    
    /**
     * Adiciona uma mensagem ao histórico de conversa
     * 
     * @param {string} role - Papel (user ou model)
     * @param {string} content - Conteúdo da mensagem
     */
    addToHistory(role, content) {
        this.conversationHistory.push({ role, content });
        console.log(`[ChatAgent] Adicionado ao histórico: ${role} - ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
    }
    
    /**
     * Limpa o histórico de conversa
     */
    clearHistory() {
        console.log(`[ChatAgent] Histórico limpo (${this.conversationHistory.length} mensagens removidas)`);
        this.conversationHistory = [];
    }
    
    /**
     * Configura o registro de agentes especialistas
     * 
     * @param {Object} specialistAgentsConfig - Configuração dos agentes especialistas
     * @returns {ChatAgent} A própria instância para encadeamento de métodos
     */
    setSpecialistAgentsConfig(specialistAgentsConfig) {
        if (!this.specialistDelegationEnabled) {
            console.warn('[ChatAgent] Aviso: Tentativa de configurar especialistas, mas a delegação não está habilitada.');
            return this;
        }
        
        // Atualiza a configuração no registry
        this.agentRegistry.setSpecialistAgentsConfig(specialistAgentsConfig);
        
        // Atualiza a ferramenta de delegação com os novos papéis disponíveis
        const availableRoles = this.agentRegistry.getAvailableSpecialistRoles();
        
        // Encontra e atualiza a ferramenta de delegação na lista de ferramentas
        const delegationToolIndex = this.tools.findIndex(tool => tool.name === 'delegate_task_to_specialist');
        if (delegationToolIndex >= 0) {
            this.tools[delegationToolIndex] = this._createDelegationTool(availableRoles);
        } else {
            // Adiciona a ferramenta se não existir
            this.tools.unshift(this._createDelegationTool(availableRoles));
        }
        
        return this;
    }
    
    /**
     * Registra um novo agente especialista
     * 
     * @param {string} role - O papel/identificador do agente especialista
     * @param {Object} config - Configuração do agente especialista
     * @returns {ChatAgent} A própria instância para encadeamento de métodos
     */
    registerSpecialist(role, config) {
        if (!this.specialistDelegationEnabled) {
            console.warn('[ChatAgent] Aviso: Tentativa de registrar especialista, mas a delegação não está habilitada.');
            return this;
        }
        
        // Registra o especialista no registry
        this.agentRegistry.registerSpecialist(role, config);
        
        // Atualiza a ferramenta de delegação com os novos papéis disponíveis
        const availableRoles = this.agentRegistry.getAvailableSpecialistRoles();
        
        // Encontra e atualiza a ferramenta de delegação na lista de ferramentas
        const delegationToolIndex = this.tools.findIndex(tool => tool.name === 'delegate_task_to_specialist');
        if (delegationToolIndex >= 0) {
            this.tools[delegationToolIndex] = this._createDelegationTool(availableRoles);
        }
        
        return this;
    }
    
    /**
     * Remove um agente especialista do registro
     * 
     * @param {string} role - O papel/identificador do agente especialista a ser removido
     * @returns {ChatAgent} A própria instância para encadeamento de métodos
     */
    unregisterSpecialist(role) {
        if (!this.specialistDelegationEnabled) {
            console.warn('[ChatAgent] Aviso: Tentativa de remover especialista, mas a delegação não está habilitada.');
            return this;
        }
        
        // Remove o especialista do registry
        this.agentRegistry.unregisterSpecialist(role);
        
        // Atualiza a ferramenta de delegação com os papéis disponíveis atualizados
        const availableRoles = this.agentRegistry.getAvailableSpecialistRoles();
        
        // Encontra e atualiza a ferramenta de delegação na lista de ferramentas
        const delegationToolIndex = this.tools.findIndex(tool => tool.name === 'delegate_task_to_specialist');
        if (delegationToolIndex >= 0) {
            this.tools[delegationToolIndex] = this._createDelegationTool(availableRoles);
        }
        
        return this;
    }
    
    /**
     * Obtém a lista de papéis de especialistas disponíveis
     * 
     * @returns {Array<string>} Array com os papéis dos especialistas registrados
     */
    getAvailableSpecialistRoles() {
        if (!this.specialistDelegationEnabled || !this.agentRegistry) {
            return [];
        }
        
        return this.agentRegistry.getAvailableSpecialistRoles();
    }
    
    /**
     * Obtém a configuração de um especialista específico
     * 
     * @param {string} role - O papel/identificador do agente especialista
     * @returns {Object|null} A configuração do especialista ou null se não encontrado
     */
    getSpecialistConfig(role) {
        if (!this.specialistDelegationEnabled || !this.agentRegistry) {
            return null;
        }
        
        return this.agentRegistry.getSpecialistConfig(role);
    }
    
    /**
     * Habilita a delegação para especialistas
     * 
     * @param {Object} specialistAgentsConfig - Configuração dos agentes especialistas (opcional)
     * @returns {ChatAgent} A própria instância para encadeamento de métodos
     */
    enableSpecialistDelegation(specialistAgentsConfig = null) {
        if (this.specialistDelegationEnabled) {
            console.log('[ChatAgent] Delegação para especialistas já está habilitada.');
            
            // Se forneceu nova configuração, atualiza
            if (specialistAgentsConfig) {
                this.setSpecialistAgentsConfig(specialistAgentsConfig);
            }
            
            return this;
        }
        
        try {
            // Criar uma nova instância de AgentRegistry com a configuração fornecida
            this.agentRegistry = new AgentRegistry(specialistAgentsConfig || {});
            
            // Verificar se há especialistas registrados
            const availableRoles = this.agentRegistry.getAvailableSpecialistRoles();
            
            if (availableRoles.length === 0) {
                console.warn('[ChatAgent] Aviso: Delegação de especialistas habilitada, mas nenhum especialista registrado.');
            } else {
                // Adicionar a ferramenta de delegação
                const delegationTool = this._createDelegationTool(availableRoles);
                
                // Verifica se a ferramenta já existe
                const delegationToolIndex = this.tools.findIndex(tool => tool.name === 'delegate_task_to_specialist');
                if (delegationToolIndex >= 0) {
                    this.tools[delegationToolIndex] = delegationTool;
                } else {
                    this.tools.unshift(delegationTool);
                }
                
                console.log(`[ChatAgent] Delegação para especialistas habilitada com ${availableRoles.length} especialistas disponíveis.`);
            }
            
            // Habilitar a delegação
            this.specialistDelegationEnabled = true;
            
        } catch (error) {
            console.warn(`[ChatAgent] Aviso: Não foi possível habilitar a delegação para especialistas: ${error.message}`);
        }
        
        return this;
    }
    
    /**
     * Desabilita a delegação para especialistas
     * 
     * @returns {ChatAgent} A própria instância para encadeamento de métodos
     */
    disableSpecialistDelegation() {
        if (!this.specialistDelegationEnabled) {
            console.log('[ChatAgent] Delegação para especialistas já está desabilitada.');
            return this;
        }
        
        // Remove a ferramenta de delegação
        const delegationToolIndex = this.tools.findIndex(tool => tool.name === 'delegate_task_to_specialist');
        if (delegationToolIndex >= 0) {
            this.tools.splice(delegationToolIndex, 1);
        }
        
        // Desabilita a delegação
        this.specialistDelegationEnabled = false;
        
        console.log('[ChatAgent] Delegação para especialistas desabilitada.');
        
        return this;
    }
    
    // O método executeTool foi removido pois duplicava a funcionalidade
    // já existente na classe base Agent através do método findToolFunction.
    // Use chatAgent.findToolFunction(functionCall.name) para obter a função da ferramenta
    // e depois execute-a diretamente com os argumentos.
}

module.exports = ChatAgent;
