const Agent = require('./agent');
const VertexAILLM = require('./vertex-ai-llm');

/**
 * Classe ChatAgent - Agente especializado em manter conversas com histórico
 * 
 * Esta classe estende a classe Agent base e adiciona funcionalidades para
 * manter o histórico de conversa entre interações com o usuário.
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
     */
    constructor({
        role,
        objective,
        context,
        llm,
        tools = [],
        enableGoogleSearch = false
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

        // Chama o construtor da classe pai (Agent)
        super({
            role,
            objective,
            context,
            task: "", // Inicialmente vazio, será preenchido a cada interação
            llm: llmInstance,
            tools,
            enableGoogleSearch
        });
        
        // Verifica se o LLM está no modo chat
        if (this.llm.mode !== "chat") {
            console.warn("AVISO: O LLM não está configurado no modo 'chat'. O histórico de conversa pode não funcionar corretamente.");
        }
        
        // Histórico de conversas
        this.conversationHistory = [];
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
            let functionResult;
            try {
                const functionArgs = functionCall.args || {};
                console.log(`[ChatAgent] Executando função '${functionCall.name}' com argumentos:`, functionArgs);
                functionResult = await functionToExecute(functionArgs);
                console.log(`[ChatAgent] Resultado da Function Call '${functionCall.name}':`, JSON.stringify(functionResult, null, 2));
            } catch (error) {
                console.error(`[ChatAgent] Erro ao executar a função '${functionCall.name}':`, error);
                functionResult = `Erro ao executar a função '${functionCall.name}': ${error.message}`;
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
    
    // O método executeTool foi removido pois duplicava a funcionalidade
    // já existente na classe base Agent através do método findToolFunction.
    // Use chatAgent.findToolFunction(functionCall.name) para obter a função da ferramenta
    // e depois execute-a diretamente com os argumentos.
}

module.exports = ChatAgent;
