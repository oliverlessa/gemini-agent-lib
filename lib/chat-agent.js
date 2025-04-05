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
 * 
 * Permite o uso de um ID de conversa personalizado, facilitando a integração
 * com sistemas externos que já possuem seus próprios identificadores.
 */
class ChatAgent extends Agent {
/**
 * Construtor da classe ChatAgent
 * 
 * @param {Object} config - Configuração do agente
 * @param {string} config.role - Papel/função do agente (ex: "Assistente Pessoal")
 * @param {string} config.objective - Objetivo principal do agente
 * @param {string} config.context - Contexto ou instruções para o agente
 * @param {Object} [config.llm] - Instância do modelo de linguagem a ser usado.
 *                               Se não fornecido, um VertexAILLM padrão será instanciado automaticamente no modo "chat".
 *                               Se fornecido e não estiver no modo "chat", um aviso será emitido, mas o agente continuará funcionando.
 * @param {Array} config.tools - Array de ferramentas disponíveis para o agente
 * @param {boolean} config.enableGoogleSearch - Ativa o Google Search para o agente
 * @param {boolean} config.enableSpecialistDelegation - Ativa a delegação para agentes especialistas
 * @param {AgentRegistry} config.agentRegistry - Instância de AgentRegistry (opcional). Se a delegação estiver habilitada e este parâmetro não for fornecido, 
 *                                              um novo AgentRegistry será criado usando specialistAgentsConfig.
 * @param {Object} config.specialistAgentsConfig - Configuração dos agentes especialistas (opcional). Usado para criar um AgentRegistry 
 *                                                se agentRegistry não for fornecido e a delegação estiver habilitada.
 * @param {Object} [config.conversationMemory=null] - Instância de ConversationMemory para persistência do histórico de conversas
 * @param {Object} [config.factMemory=null] - Instância de FactMemory para persistência de fatos
 * @param {Object} [config.summaryMemory=null] - Instância de SummaryMemory para persistência de resumos
 * @param {boolean} [config.autoManageFactMemory=false] - Ativa o gerenciamento automático de fatos extraídos das conversas
 * @param {boolean} [config.autoManageSummaryMemory=false] - Ativa o gerenciamento automático de resumos das conversas
 * @param {string} [config.chatId=null] - ID opcional para a conversa. Se não fornecido e a memória estiver ativa, um UUID será gerado.
 *                                       Se fornecido, deve ser uma string não vazia, caso contrário um novo UUID será gerado.
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
        summaryMemory = null,
        autoManageFactMemory = false,
        autoManageSummaryMemory = false,
        chatId = null
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
        this.autoManageFactMemory = autoManageFactMemory;
        this.autoManageSummaryMemory = autoManageSummaryMemory;
        
        // Lógica de atribuição do chatId
        const hasMemory = this.conversationMemory || this.factMemory || this.summaryMemory;
        if (chatId && typeof chatId === 'string' && chatId.trim() !== '') {
            // Usa o chatId fornecido se for uma string não vazia
            this.chatId = chatId.trim(); // Usar trim() para remover espaços extras
            console.log(`[ChatAgent] Usando chatId fornecido: ${this.chatId}`);
        } else if (hasMemory) {
            // Gera um novo chatId se a memória estiver ativa e nenhum ID válido foi fornecido
            this.chatId = uuidv4();
            console.log(`[ChatAgent] Gerando novo chatId: ${this.chatId}`);
        } else {
            // Nenhum chatId necessário se não houver memória
            this.chatId = null;
        }
        
        // Inicializa o histórico de conversas como um array vazio PRIMEIRO
        this.conversationHistory = [];
        
        if (this.conversationMemory && this.chatId) {
            // Se tiver memória persistente, carrega o histórico
            this._loadConversationHistory();
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
     * 
     * Este método gerencia todo o ciclo de vida da interação com o usuário:
     * 1. Adiciona a mensagem do usuário ao histórico
     * 2. Gera uma resposta usando o LLM
     * 3. Processa function calls (incluindo delegação para especialistas se a ferramenta delegate_task_to_specialist for chamada)
     * 4. Adiciona a resposta final ao histórico
     * 5. Se o gerenciamento automático de memória estiver ativo (autoManageFactMemory ou autoManageSummaryMemory), 
     *    chama _evaluateAndManageMemories para extrair fatos e/ou gerar resumos
     */
    /**
     * Prepara um contexto enriquecido com informações das memórias de fatos e resumos
     * 
     * @private
     * @returns {Promise<string>} Contexto enriquecido com informações das memórias
     */
    async _prepareEnrichedContext() {
        // Começa com o contexto original
        let enrichedContext = this.context || '';
        
        // Variáveis para armazenar as informações das memórias
        let memoryInfo = '';
        let hasFacts = false;
        let hasSummary = false;
        
        // Recupera fatos da factMemory (se disponível)
        if (this.factMemory && this.chatId) {
            try {
                const facts = await this.getAllFacts();
                if (facts && Object.keys(facts).length > 0) {
                    memoryInfo += '\n\n--- Informações da Memória ---\nFatos Conhecidos:\n';
                    
                    for (const [key, value] of Object.entries(facts)) {
                        memoryInfo += `- ${key}: ${JSON.stringify(value)}\n`;
                    }
                    
                    hasFacts = true;
                }
            } catch (error) {
                console.error(`[ChatAgent] Erro ao recuperar fatos para contexto:`, error);
            }
        }
        
        // Recupera o resumo mais recente da summaryMemory (se disponível)
        if (this.summaryMemory && this.chatId) {
            try {
                const latestSummary = await this.getLatestSummary();
                if (latestSummary) {
                    if (!hasFacts) {
                        memoryInfo += '\n\n--- Informações da Memória ---\n';
                    }
                    
                    memoryInfo += `\nResumo Anterior:\n${latestSummary}\n`;
                    hasSummary = true;
                }
            } catch (error) {
                console.error(`[ChatAgent] Erro ao recuperar resumo para contexto:`, error);
            }
        }
        
        // Adiciona o rodapé das informações da memória se alguma informação foi adicionada
        if (hasFacts || hasSummary) {
            memoryInfo += '--- Fim das Informações da Memória ---\n';
            
            // Adiciona instruções para o LLM sobre como usar as informações da memória
            memoryInfo += `
INSTRUÇÕES PARA USO DAS INFORMAÇÕES DA MEMÓRIA:
1. Use as informações acima como conhecimento de fundo para enriquecer sua resposta.
2. NÃO repita explicitamente esses fatos ou resumos na sua resposta se a informação já estiver clara.
3. Evite redundâncias e informações repetitivas na sua resposta.
4. Sintetize todas as informações relevantes de forma natural e concisa.
5. Priorize a clareza e a fluidez da resposta, integrando o conhecimento das memórias de forma sutil.
`;
            
            // Adiciona as informações da memória ao contexto original
            enrichedContext += memoryInfo;
            
            console.log(`[ChatAgent] Contexto enriquecido com ${hasFacts ? 'fatos' : ''} ${hasFacts && hasSummary ? 'e' : ''} ${hasSummary ? 'resumo' : ''}`);
        }
        
        return enrichedContext;
    }
    
    async processUserMessage(message) {
        console.log(`\n[ChatAgent] Processando mensagem do usuário: "${message}"`);
        
        // Define a mensagem do usuário como a tarefa atual
        this.task = message;
        
        // Prepara o histórico para o LLM
        const history = this.prepareHistoryForLLM();
        
        console.log(`[ChatAgent] Histórico atual: ${this.conversationHistory.length} mensagens`);
        
        // Adiciona a mensagem do usuário ao histórico
        await this._addToConversationHistory("user", message);
        
        // Prepara o contexto enriquecido com informações das memórias
        const enrichedContext = await this._prepareEnrichedContext();
        
        // Gera a resposta usando o LLM no modo chat
        let response = await this.llm.generateContent({
            prompt: message,
            context: enrichedContext,
            tools: this.prepareToolsForLLM(),
            history: history
        });
        
        // Loop para lidar com function calls (similar ao método executeTask)
        while (response && response.functionCall) {
            const functionCall = response.functionCall;
            console.log(`\n[ChatAgent] LLM solicitou Function Call: ${functionCall.name}`);
            console.log("Argumentos:", functionCall.args);
            
            // Adiciona a resposta com function call ao histórico
            await this._addToConversationHistory("model", response.text || `[Function Call: ${functionCall.name}]`);
            
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
                    await this._addToConversationHistory("user", `Erro: ${errorMessage}`);
                    
                    // Prepara o contexto enriquecido com informações das memórias
                    const enrichedContext = await this._prepareEnrichedContext();
                    
                    // Gera uma nova resposta com o erro
                    response = await this.llm.generateContent({
                        prompt: `Erro: ${errorMessage}`,
                        context: enrichedContext,
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
            await this._addToConversationHistory("user", functionResultMessage);
            
            // Prepara o contexto enriquecido com informações das memórias
            const enrichedContext = await this._prepareEnrichedContext();
            
            // Gera uma nova resposta com base no resultado da função
            response = await this.llm.generateContent({
                prompt: functionResultMessage,
                context: enrichedContext,
                tools: this.prepareToolsForLLM(),
                history: this.prepareHistoryForLLM()
            });
        }
        
        // Adiciona a resposta final ao histórico (se não for uma function call)
        if (response && !response.functionCall) {
            await this._addToConversationHistory("model", response.text);
            
            // Após adicionar a resposta ao histórico, avalia a conversa para gerenciar memórias
            if ((this.autoManageFactMemory && this.factMemory) || 
                (this.autoManageSummaryMemory && this.summaryMemory)) {
                await this._evaluateAndManageMemories(message, response.text);
            }
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
        
        // Prepara o contexto enriquecido com informações das memórias
        const enrichedContext = await this._prepareEnrichedContext();
        
        // Gera uma nova resposta com base no resultado da função
        const response = await this.llm.generateContent({
            prompt: functionResultMessage,
            context: enrichedContext,
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
    
    /**
     * Avalia a última interação da conversa e gerencia automaticamente as memórias de fatos e resumos
     * 
     * @param {string} userMessage - Mensagem do usuário
     * @param {string} agentResponse - Resposta do agente
     * @private
     * 
     * Este método é chamado automaticamente após cada interação completa quando autoManageFactMemory 
     * ou autoManageSummaryMemory estão habilitados. Ele usa o LLM para:
     * 
     * 1. Analisar a interação entre usuário e agente
     * 2. Extrair fatos relevantes e armazená-los na factMemory (se autoManageFactMemory=true)
     * 3. Gerar ou atualizar resumos da conversa na summaryMemory (se autoManageSummaryMemory=true)
     * 
     * O método envia um prompt específico para o LLM que solicita a extração de fatos e/ou geração de resumo,
     * dependendo de quais sistemas de memória automática estão habilitados.
     */
    async _evaluateAndManageMemories(userMessage, agentResponse) {
        console.log(`[ChatAgent] Avaliando conversa para gerenciamento automático de memórias...`);
        
        try {
            // Prepara o prompt para o LLM
            let prompt = `Analise a seguinte interação entre um usuário e um assistente:

Usuário: "${userMessage}"

Assistente: "${agentResponse}"

`;

            // Adiciona instruções específicas para extração de fatos se necessário
            if (this.autoManageFactMemory && this.factMemory) {
                prompt += `
EXTRAÇÃO DE FATOS:
Identifique fatos importantes mencionados nesta interação. Um fato é uma informação discreta e específica que pode ser útil para referência futura.
Para cada fato identificado, forneça:
1. Uma chave única e descritiva (sem espaços, use_underscores)
2. O valor do fato (pode ser string, número, booleano ou objeto JSON simples)

Formato de resposta para fatos:
{
  "fatos": [
    {"chave": "nome_do_usuario", "valor": "João Silva"},
    {"chave": "preferencia_cor", "valor": "azul"},
    ...
  ]
}

Se não houver fatos relevantes para extrair, retorne um array vazio: {"fatos": []}.
`;
            }

            // Adiciona instruções específicas para geração de resumo se necessário
            if (this.autoManageSummaryMemory && this.summaryMemory) {
                prompt += `
GERAÇÃO DE RESUMO:
Com base nesta interação, decida se é necessário gerar ou atualizar um resumo da conversa.
Um resumo deve capturar os pontos principais da conversa de forma concisa.

Formato de resposta para resumo:
{
  "resumo": "Texto do resumo aqui, ou null se não for necessário atualizar"
}
`;
            }

            // Finaliza o prompt com instruções de formato
            prompt += `
Responda APENAS com um objeto JSON contendo os campos solicitados, sem texto adicional.`;

            // Chama o LLM para avaliar a conversa
            const response = await this.llm.generateContent({
                prompt,
                context: "Você é um sistema de gerenciamento de memória que analisa conversas para extrair fatos e gerar resumos.",
                tools: [], // Sem ferramentas para esta chamada
                history: [] // Sem histórico para esta chamada
            });

            if (!response || !response.text) {
                console.warn(`[ChatAgent] Avaliação de memória: resposta vazia do LLM.`);
                return;
            }

            // Tenta extrair o JSON da resposta
            let jsonMatch = response.text.match(/\{[\s\S]*\}/);
            if (!jsonMatch) {
                console.warn(`[ChatAgent] Avaliação de memória: não foi possível extrair JSON da resposta.`);
                return;
            }

            const jsonStr = jsonMatch[0];
            let memoryData;
            
            try {
                memoryData = JSON.parse(jsonStr);
            } catch (error) {
                console.error(`[ChatAgent] Erro ao analisar JSON da resposta de avaliação de memória:`, error);
                return;
            }

            // Processa fatos extraídos
            if (this.autoManageFactMemory && this.factMemory && memoryData.fatos) {
                for (const fato of memoryData.fatos) {
                    if (fato.chave && fato.valor !== undefined) {
                        await this.setFact(fato.chave, fato.valor);
                    }
                }
                console.log(`[ChatAgent] Avaliação de memória: ${memoryData.fatos.length} fatos extraídos e armazenados.`);
            }

            // Processa resumo gerado
            if (this.autoManageSummaryMemory && this.summaryMemory && memoryData.resumo) {
                if (memoryData.resumo !== null) {
                    await this.addSummary(memoryData.resumo);
                    console.log(`[ChatAgent] Avaliação de memória: resumo atualizado.`);
                } else {
                    console.log(`[ChatAgent] Avaliação de memória: não foi necessário atualizar o resumo.`);
                }
            }

        } catch (error) {
            console.error(`[ChatAgent] Erro durante avaliação e gerenciamento de memórias:`, error);
        }
    }
}

module.exports = ChatAgent;
