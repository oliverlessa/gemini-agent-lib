const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');

class VertexAILLM {
    constructor({ apiKey, credentialsPath, projectId, location = 'us-central1', modelName = "gemini-1.0-pro", mode = "oneshot", generationConfig = { maxOutputTokens: 8192 } }) {
        if (!projectId) {
            throw new Error("Project ID do Google Cloud não fornecido.");
        }

        // Verifica se pelo menos um método de autenticação foi fornecido
        if (!apiKey && !credentialsPath) {
            throw new Error("Método de autenticação não fornecido. Forneça apiKey ou credentialsPath.");
        }

        this.projectId = projectId;
        this.location = location;
        this.modelName = modelName;
        this.mode = mode; // 'oneshot' ou 'chat'

        // Configura a autenticação por arquivo de credenciais se fornecido
        if (credentialsPath) {
            process.env['GOOGLE_APPLICATION_CREDENTIALS'] = credentialsPath;
        }

        // Inicializa o Vertex AI SDK
        const authOptions = {};
        if (apiKey) {
            authOptions.apiKey = apiKey;
        }

        this.vertexAI = new VertexAI({
            project: this.projectId,
            location: this.location,
            ...authOptions
        });

        // Configurações de segurança padrão
        this.safetySettings = [
            {
                category: HarmCategory.HARM_CATEGORY_HARASSMENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
            {
                category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
                threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE
            },
        ];

        // // Carrega o modelo generativo
        // this.model = this.vertexAI.getGenerativeModel({
        //     model: this.modelName,
        //     safetySettings: this.safetySettings,
        //     generationConfig: {
        //         // Configurações de geração padrão
        //         maxOutputTokens: 1024,
        //     }
        // });

        // Armazena a configuração de geração
        this.generationConfig = generationConfig;

        // Carrega o modelo generativo versão PREVIEW
        this.model = this.vertexAI.preview.getGenerativeModel({
            model: this.modelName,
            safetySettings: this.safetySettings,
            generationConfig: this.generationConfig
        });

        // No modo chat, não inicializamos o chat imediatamente
        // Será inicializado sob demanda com todos os parâmetros necessários
        if (this.mode === 'chat') {
            this.chat = null;
            // Variáveis para controlar quando o chat precisa ser reinicializado
            this._currentTools = null;
            this._currentContext = null;
        }
    }

    /**
     * Verifica se o chat deve ser reinicializado com base em mudanças nas ferramentas ou no contexto
     * @param {Array} tools - Ferramentas a serem utilizadas
     * @param {string} context - Instruções do sistema
     * @returns {boolean} - Verdadeiro se o chat deve ser reinicializado
     */
    shouldReinitializeChat(tools, context) {
        // Verifica se as ferramentas ou o contexto mudaram
        const toolsChanged = JSON.stringify(tools) !== JSON.stringify(this._currentTools);
        const contextChanged = context !== this._currentContext;
        
        return toolsChanged || contextChanged;
    }

    async generateContent({ prompt, tools, context, history }) {
        try {
            let request = {};
            
            // Tratamento de histórico para modo chat
            if (this.mode === 'chat') {
                // Inicializa o chat com todos os parâmetros relevantes se ainda não existir
                // ou se precisar ser reinicializado com novo contexto/ferramentas
                if (!this.chat || this.shouldReinitializeChat(tools, context)) {
                    const chatParams = {};
                    
                    // Adiciona histórico se disponível
                    if (history && Array.isArray(history)) {
                        chatParams.history = history;
                    }
                    
                    // Adiciona configurações de segurança
                    chatParams.safetySettings = this.safetySettings;
                    
                    // Adiciona configuração de geração
                    chatParams.generationConfig = this.generationConfig;
                    
                    // Adiciona ferramentas se disponíveis
                    if (tools && tools.length > 0) {
                        chatParams.tools = tools;
                        console.log("Ferramentas enviadas para inicialização do chat:", JSON.stringify(tools, null, 2));
                    }
                    
                    // Adiciona instrução do sistema se disponível
                    if (context) {
                        chatParams.systemInstruction = {
                            role: 'system',
                            parts: [{ text: context }]
                        };
                    }
                    
                    // Inicializa o chat com todos os parâmetros
                    this.chat = this.model.startChat(chatParams);
                    
                    // Armazena as configurações atuais para comparação futura
                    this._currentTools = tools;
                    this._currentContext = context;
                }
                
                // Envia a mensagem para o chat
                const result = await this.chat.sendMessage(prompt);
                const response = result.response;
                
                // Processa a resposta
                if (!response || !response.candidates || response.candidates.length === 0) {
                    return { text: "Resposta vazia ou inválida da API Vertex AI." };
                }
                
                const candidate = response.candidates[0];
                const content = candidate.content;
                
                if (!content || !content.parts || content.parts.length === 0) {
                    return { text: "Resposta de texto vazia da API Vertex AI." };
                }
                
                // Combina o texto de todos os elementos do array parts que possuem a propriedade text
                const text = content.parts
                    .filter(part => part.text !== undefined)
                    .map(part => part.text)
                    .join('\n');
                
                // Verifica se há function call
                if (candidate.content.parts.some(part => part.functionCall)) {
                    const functionCallPart = candidate.content.parts.find(part => part.functionCall);
                    return { 
                        functionCall: functionCallPart.functionCall, 
                        text: text 
                    };
                } else {
                    return { text: text };
                }
            } else {
                // Modo oneshot (não chat)
                let contents = [];
                
                // Adiciona histórico se existir
                if (history && Array.isArray(history)) {
                    contents = [...history];
                }
                
                // Adiciona o prompt do usuário
                contents.push({ 
                    role: "user", 
                    parts: [{ text: prompt }] 
                });
                
                request.contents = contents;
                
                // Adiciona system instruction se fornecido
                if (context) {
                    request.systemInstruction = {
                        role: 'system',
                        parts: [{ text: context }]
                    };
                }
                
                // Adiciona tools se fornecidas
                if (tools && tools.length > 0) {
                    console.log("Ferramentas enviadas para Vertex AI:", JSON.stringify(tools, null, 2));
                    request.tools = tools;
                }
                
                // Gera conteúdo
                const result = await this.model.generateContent(request);
                const response = result.response;
                
                // Processa a resposta
                if (!response || !response.candidates || response.candidates.length === 0) {
                    return { text: "Resposta vazia ou inválida da API Vertex AI." };
                }
                
                const candidate = response.candidates[0];
                const content = candidate.content;
                
                if (!content || !content.parts || content.parts.length === 0) {
                    return { text: "Resposta de texto vazia da API Vertex AI." };
                }
                
                // Combina o texto de todos os elementos do array parts que possuem a propriedade text
                const text = content.parts
                    .filter(part => part.text !== undefined)
                    .map(part => part.text)
                    .join('\n');
                
                // Verifica se há function call
                if (candidate.content.parts.some(part => part.functionCall)) {
                    const functionCallPart = candidate.content.parts.find(part => part.functionCall);
                    return { 
                        functionCall: functionCallPart.functionCall, 
                        text: text 
                    };
                } else {
                    return { text: text };
                }
            }
        } catch (error) {
            console.error(`Erro na chamada à API Vertex AI (${this.modelName}, mode: ${this.mode}):`, error);
            return { text: `Erro ao comunicar com a API Vertex AI (${this.modelName}, mode: ${this.mode}): ${error.message}` };
        }
    }
}

module.exports = VertexAILLM;
