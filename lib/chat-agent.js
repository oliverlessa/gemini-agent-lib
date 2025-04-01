const Agent = require('./agent');
const VertexAILLM = require('./vertex-ai-llm');
const FunctionDeclarationSchemaType = require('./function-declaration-schema-type');
const AgentRegistry = require('./agent-registry');
const { v4: uuidv4 } = require('uuid');

/**
 * Classe ChatAgent - Agente especializado em manter conversas com histórico
 * 
 * Esta classe estende a classe Agent base e adiciona funcionalidades para
 * manter o histórico de conversa entre interações com o usuário.
 * Opcionalmente, pode delegar tarefas para agentes especialistas e
 * persistir o histórico de conversas, fatos e resumos usando diferentes
 * adaptadores de memória.
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
     * @param {Object} [config.conversationMemory=null] - Instância de ConversationMemory para persistência do histórico de conversas
     * @param {Object} [config.factMemory=null] - Instância de FactMemory para persistência de fatos
     * @param {Object} [config.summaryMemory=null] - Instância de SummaryMemory para persistência de resumos
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
        specialistAgentsConfig = {},
        conversationMemory = null,
        factMemory = null,
        summaryMemory = null
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
        
        // Configuração de memória
        this.conversationMemory = conversationMemory;
        this.factMemory = factMemory;
        this.summaryMemory = summaryMemory;
        
        // Gera um ID único para a conversa se alguma memória persistente estiver configurada
        this.chatId = (this.conversationMemory || this.factMemory || this.summaryMemory) ? uuidv4() : null;
        
        // Inicializa o histórico de conversas
        if (this.conversationMemory) {
            // Se tiver memória persistente, carrega o histórico
            this._loadConversationHistory();
        } else {
            // Caso contrário, inicializa um array vazio para memória volátil
            this.conversationHistory = [];
        }
        
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
     * Carrega o histórico de conversas da memória persistente
     * @private
     */
    async _loadConversationHistory() {
        if (!this.conversationMemory || !this.chatId) {
            this.conversationHistory = [];
            return;
        }
        
        try {
            console.log(`[ChatAgent] Carregando histórico de conversa para chatId: ${this.chatId}`);
            this.conversationHistory = await this.conversationMemory.loadHistory(this.chatId);
            console.log(`[ChatAgent] Histórico carregado: ${this.conversationHistory.length} mensagens`);
        } catch (error) {
            console.error(`[ChatAgent] Erro ao carregar histórico de conversa:`, error);
            // Em caso de erro, inicializa um array vazio
            this.conversationHistory = [];
        }
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
        await this._addToConversationHistory("user", message);
        
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
            await this._addToConversationHistory("model", response.text);
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
        await this._addToConversationHistory("user", functionResultMessage);
        
        // Gera uma nova resposta com base no resultado da função
        const response = await this.llm.generateContent({
            prompt: functionResultMessage,
            context: this.context,
            tools: this.prepareToolsForLLM(),
            history: this.prepareHistoryForLLM()
        });
        
        // Adiciona a resposta ao histórico
        await this._addToConversationHistory("model", response.text);
        
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
     * Adiciona uma mensagem ao histórico de conversa (volátil e persistente)
     * 
     * @param {string} role - Papel (user ou model)
     * @param {string} content - Conteúdo da mensagem
     * @private
     */
    async _addToConversationHistory(role, content) {
        // Adiciona à memória volátil
        this.conversationHistory.push({ role, content });
        console.log(`[ChatAgent] Adicionado ao histórico: ${role} - ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`);
        
        // Se tiver memória persistente configurada, adiciona também lá
        if (this.conversationMemory && this.chatId) {
            try {
                await this.conversationMemory.appendMessage(this.chatId, role, content);
            } catch (error) {
                console.error(`[ChatAgent] Erro ao persistir mensagem:`, error);
                // Continua mesmo se falhar a persistência
            }
        }
    }
    
    /**
     * Limpa o histórico de conversa (volátil e persistente)
     */
    async clearHistory() {
        console.log(`[ChatAgent] Histórico limpo (${this.conversationHistory.length} mensagens removidas)`);
        
        // Limpa a memória volátil
        this.conversationHistory = [];
        
        // Se tiver memória persistente configurada, limpa também lá
        if (this.conversationMemory && this.chatId) {
            try {
                await this.conversationMemory.clearHistory(this.chatId);
            } catch (error) {
                console.error(`[ChatAgent] Erro ao limpar histórico persistente:`, error);
                // Continua mesmo se falhar a limpeza da persistência
            }
        }
    }
    
    /**
     * Define um fato na memória de fatos (se configurada)
     * 
     * @param {string} key - Chave do fato
     * @param {any} value - Valor do fato
     * @returns {Promise<boolean>} - true se o fato foi armazenado, false caso contrário
     */
    async setFact(key, value) {
        if (!this.factMemory || !this.chatId) {
            console.log(`[ChatAgent] Memória de fatos não configurada. Fato '${key}' não armazenado.`);
            return false;
        }
        
        try {
            await this.factMemory.setFact(this.chatId, key, value);
            console.log(`[ChatAgent] Fato armazenado: ${key} = ${JSON.stringify(value)}`);
            return true;
        } catch (error) {
            console.error(`[ChatAgent] Erro ao armazenar fato '${key}':`, error);
            return false;
        }
    }
    
    /**
     * Recupera um fato da memória de fatos (se configurada)
     * 
     * @param {string} key - Chave do fato
     * @returns {Promise<any|null>} - Valor do fato ou null se não encontrado ou se a memória não estiver configurada
     */
    async getFact(key) {
        if (!this.factMemory || !this.chatId) {
            console.log(`[ChatAgent] Memória de fatos não configurada. Não foi possível recuperar '${key}'.`);
            return null;
        }
        
        try {
            const value = await this.factMemory.getFact(this.chatId, key);
            console.log(`[ChatAgent] Fato recuperado: ${key} = ${JSON.stringify(value)}`);
            return value;
        } catch (error) {
            console.error(`[ChatAgent] Erro ao recuperar fato '${key}':`, error);
            return null;
        }
    }
    
    /**
     * Recupera todos os fatos da memória de fatos (se configurada)
     * 
     * @returns {Promise<Object|null>} - Objeto com todos os fatos ou objeto vazio se a memória não estiver configurada
     */
    async getAllFacts() {
        if (!this.factMemory || !this.chatId) {
            console.log(`[ChatAgent] Memória de fatos não configurada. Não foi possível recuperar fatos.`);
            return {};
        }
        
        try {
            const facts = await this.factMemory.getAllFacts(this.chatId);
            console.log(`[ChatAgent] Fatos recuperados: ${Object.keys(facts).length} fatos`);
            return facts;
        } catch (error) {
            console.error(`[ChatAgent] Erro ao recuperar todos os fatos:`, error);
            return {};
        }
    }
    
    /**
     * Adiciona um resumo à memória de resumos (se configurada)
     * 
     * @param {string} summaryContent - Conteúdo do resumo
     * @param {Date} [timestamp=new Date()] - Timestamp do resumo
     * @returns {Promise<boolean>} - true se o resumo foi armazenado, false caso contrário
     */
    async addSummary(summaryContent, timestamp = new Date()) {
        if (!this.summaryMemory || !this.chatId) {
            console.log(`[ChatAgent] Memória de resumos não configurada. Resumo não armazenado.`);
            return false;
        }
        
        try {
            await this.summaryMemory.addSummary(this.chatId, summaryContent, timestamp);
            console.log(`[ChatAgent] Resumo armazenado: ${summaryContent.substring(0, 50)}${summaryContent.length > 50 ? '...' : ''}`);
            return true;
        } catch (error) {
            console.error(`[ChatAgent] Erro ao armazenar resumo:`, error);
            return false;
        }
    }
    
    /**
     * Recupera o resumo mais recente da memória de resumos (se configurada)
     * 
     * @returns {Promise<string|null>} - Conteúdo do resumo mais recente ou null se não encontrado ou se a memória não estiver configurada
     */
    async getLatestSummary() {
        if (!this.summaryMemory || !this.chatId) {
            console.log(`[ChatAgent] Memória de resumos não configurada. Não foi possível recuperar o resumo mais recente.`);
            return null;
        }
        
        try {
            const summary = await this.summaryMemory.getLatestSummary(this.chatId);
            if (summary) {
                console.log(`[ChatAgent] Resumo mais recente recuperado: ${summary.substring(0, 50)}${summary.length > 50 ? '...' : ''}`);
            } else {
                console.log(`[ChatAgent] Nenhum resumo encontrado.`);
            }
            return summary;
        } catch (error) {
            console.error(`[ChatAgent] Erro ao recuperar resumo mais recente:`, error);
            return null;
        }
    }
    
    /**
     * Recupera todos os resumos da memória de resumos (se configurada)
     * 
     * @param {number} [limit] - Número máximo de resumos a serem retornados
     * @returns {Promise<Array<{summaryContent: string, timestamp: Date}>|[]>} - Array de resumos ou array vazio se a memória não estiver configurada
     */
    async getAllSummaries(limit) {
        if (!this.summaryMemory || !this.chatId) {
            console.log(`[ChatAgent] Memória de resumos não configurada. Não foi possível recuperar resumos.`);
            return [];
        }
        
        try {
            const summaries = await this.summaryMemory.getAllSummaries(this.chatId, limit);
            console.log(`[ChatAgent] Resumos recuperados: ${summaries.length} resumos`);
            return summaries;
        } catch (error) {
            console.error(`[ChatAgent] Erro ao recuperar todos os resumos:`, error);
            return [];
        }
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
