const { VertexAI, HarmCategory, HarmBlockThreshold } = require('@google-cloud/vertexai');
const debug = require('./debug').llm;

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
                        debug("Ferramentas enviadas para inicialização do chat: %o", tools);
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
                
                // Em vez de usar sendMessage, vamos usar generateContent diretamente
                // Prepara o conteúdo para a API
                const userMessage = {
                    role: 'user',
                    parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }]
                };
                
                // Log para debug
                debug("Enviando mensagem para a API: %o", userMessage);
                
                // Usa generateContent em vez de sendMessage
                const chatResult = await this.model.generateContent({
                    contents: [...(history || []), userMessage],
                    systemInstruction: context ? {
                        role: 'system',
                        parts: [{ text: context }]
                    } : undefined,
                    tools: tools || undefined,
                    safetySettings: this.safetySettings,
                    generationConfig: this.generationConfig
                });
                const response = chatResult.response;
                
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
                
                // Prepara o objeto de resultado
                const responseResult = { text: text };
                
                if (candidate.content.parts.some(part => part.functionCall)) {
                    const functionCallPart = candidate.content.parts.find(part => part.functionCall);
                    responseResult.functionCall = functionCallPart.functionCall;
                }
                
                // Verifica se há metadados de grounding (Google Search)
                if (candidate.groundingMetadata) {
                    // debug("GroundingMetadata encontrado: %o", candidate.groundingMetadata);
                    
                    // Verifica se existem groundingChunks (fontes) e groundingSupports (trechos citados)
                    if (candidate.groundingMetadata.groundingChunks && candidate.groundingMetadata.groundingSupports) {
                        const chunks = candidate.groundingMetadata.groundingChunks;
                        const supports = candidate.groundingMetadata.groundingSupports;
                        
                        // Mapa para armazenar as fontes únicas com seus trechos
                        const fontesMap = new Map();
                        
                        // Processa cada support (trecho citado) e associa à sua fonte
                        supports.forEach(support => {
                            // Obtém o texto do trecho
                            const trechoTexto = support.segment?.text || "";
                            
                            // Para cada índice de chunk referenciado por este trecho
                            support.groundingChunkIndices.forEach(chunkIndex => {
                                if (chunkIndex >= 0 && chunkIndex < chunks.length) {
                                    const chunk = chunks[chunkIndex];
                                    
                                    // Extrai informações da fonte
                                    const uri = chunk.web?.uri || "";
                                    const titulo = chunk.web?.title || "";
                                    const dominio = chunk.web?.domain || "";
                                    
                                    // Cria uma chave única para a fonte
                                    const fonteKey = uri;
                                    
                                    // Adiciona ou atualiza a entrada no mapa
                                    if (!fontesMap.has(fonteKey)) {
                                        fontesMap.set(fonteKey, {
                                            uri: uri,
                                            titulo: titulo,
                                            dominio: dominio,
                                            trechos: []
                                        });
                                    }
                                    
                                    // Adiciona o trecho à fonte correspondente
                                    if (trechoTexto && !fontesMap.get(fonteKey).trechos.includes(trechoTexto)) {
                                        fontesMap.get(fonteKey).trechos.push(trechoTexto);
                                    }
                                }
                            });
                        });
                        
                        // Formata as fontes para exibição
                        if (fontesMap.size > 0) {
                            let fontesFormatadas = "\n\n**Fontes:**\n";
                            
                            // Converte o mapa em array para facilitar a formatação
                            const fontesArray = Array.from(fontesMap.values());
                            
                            // Formata cada fonte com seus trechos
                            fontesArray.forEach((fonte, index) => {
                                fontesFormatadas += `\n[${index + 1}] [${fonte.titulo || fonte.dominio}](${fonte.uri})\n`;
                                
                                // Adiciona os trechos citados desta fonte
                                if (fonte.trechos.length > 0) {
                                    fonte.trechos.forEach(trecho => {
                                        // Limita o tamanho do trecho para não ficar muito extenso
                                        const trechoResumido = trecho.length > 150 
                                            ? trecho.substring(0, 147) + "..." 
                                            : trecho;
                                        fontesFormatadas += `   * ${trechoResumido}\n`;
                                    });
                                }
                            });
                            
                            // Adiciona as fontes formatadas à resposta final
                            responseResult.text += fontesFormatadas;
                        }
                    } 
                    // Fallback para o método antigo se não encontrar a estrutura esperada
                    else if (candidate.groundingMetadata.webSearchRetrievalResults) {
                        // Extrai as fontes dos metadados de grounding (método antigo)
                        const fontes = candidate.groundingMetadata.webSearchRetrievalResults.map((resultItem, index) => {
                            return `[${index + 1}] ${resultItem.uri}: ${resultItem.title}`;
                        });
                        
                        // Adiciona as fontes à resposta final
                        if (fontes.length > 0) {
                            responseResult.text += `\n\n**Fontes:**\n${fontes.join('\n')}`;
                        }
                    }
                }
                
                return responseResult;
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
                    // debug("Ferramentas enviadas para Vertex AI: %o", tools);
                    request.tools = tools;
                }
                
                // Gera conteúdo
                const result = await this.model.generateContent(request);
                const response = result.response;

                // debug("Objeto response completo: %o", response);
                
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
                
                // Prepara o objeto de resultado
                const responseResult = { text: text };
                
                // Verifica se há function call
                if (candidate.content.parts.some(part => part.functionCall)) {
                    const functionCallPart = candidate.content.parts.find(part => part.functionCall);
                    responseResult.functionCall = functionCallPart.functionCall;
                }
                
                // Verifica se há metadados de grounding (Google Search)
                if (candidate.groundingMetadata) {
                    // debug("GroundingMetadata encontrado: %o", candidate.groundingMetadata);
                    
                    // Verifica se existem groundingChunks (fontes) e groundingSupports (trechos citados)
                    if (candidate.groundingMetadata.groundingChunks && candidate.groundingMetadata.groundingSupports) {
                        const chunks = candidate.groundingMetadata.groundingChunks;
                        const supports = candidate.groundingMetadata.groundingSupports;
                        
                        // Mapa para armazenar as fontes únicas com seus trechos
                        const fontesMap = new Map();
                        
                        // Processa cada support (trecho citado) e associa à sua fonte
                        supports.forEach(support => {
                            // Obtém o texto do trecho
                            const trechoTexto = support.segment?.text || "";
                            
                            // Para cada índice de chunk referenciado por este trecho
                            support.groundingChunkIndices.forEach(chunkIndex => {
                                if (chunkIndex >= 0 && chunkIndex < chunks.length) {
                                    const chunk = chunks[chunkIndex];
                                    
                                    // Extrai informações da fonte
                                    const uri = chunk.web?.uri || "";
                                    const titulo = chunk.web?.title || "";
                                    const dominio = chunk.web?.domain || "";
                                    
                                    // Cria uma chave única para a fonte
                                    const fonteKey = uri;
                                    
                                    // Adiciona ou atualiza a entrada no mapa
                                    if (!fontesMap.has(fonteKey)) {
                                        fontesMap.set(fonteKey, {
                                            uri: uri,
                                            titulo: titulo,
                                            dominio: dominio,
                                            trechos: []
                                        });
                                    }
                                    
                                    // Adiciona o trecho à fonte correspondente
                                    if (trechoTexto && !fontesMap.get(fonteKey).trechos.includes(trechoTexto)) {
                                        fontesMap.get(fonteKey).trechos.push(trechoTexto);
                                    }
                                }
                            });
                        });
                        
                        // Formata as fontes para exibição
                        if (fontesMap.size > 0) {
                            let fontesFormatadas = "\n\n**Fontes:**\n";
                            
                            // Converte o mapa em array para facilitar a formatação
                            const fontesArray = Array.from(fontesMap.values());
                            
                            // Formata cada fonte com seus trechos
                            fontesArray.forEach((fonte, index) => {
                                fontesFormatadas += `\n[${index + 1}] [${fonte.titulo || fonte.dominio}](${fonte.uri})\n`;
                                
                                // Adiciona os trechos citados desta fonte
                                if (fonte.trechos.length > 0) {
                                    fonte.trechos.forEach(trecho => {
                                        // Limita o tamanho do trecho para não ficar muito extenso
                                        const trechoResumido = trecho.length > 150 
                                            ? trecho.substring(0, 147) + "..." 
                                            : trecho;
                                        fontesFormatadas += `   * ${trechoResumido}\n`;
                                    });
                                }
                            });
                            
                            // Adiciona as fontes formatadas à resposta final
                            responseResult.text += fontesFormatadas;
                        }
                    } 
                    // Fallback para o método antigo se não encontrar a estrutura esperada
                    else if (candidate.groundingMetadata.webSearchRetrievalResults) {
                        // Extrai as fontes dos metadados de grounding (método antigo)
                        const fontes = candidate.groundingMetadata.webSearchRetrievalResults.map((resultItem, index) => {
                            return `[${index + 1}] ${resultItem.uri}: ${resultItem.title}`;
                        });
                        
                        // Adiciona as fontes à resposta final
                        if (fontes.length > 0) {
                            responseResult.text += `\n\n**Fontes:**\n${fontes.join('\n')}`;
                        }
                    }
                }
                
                return responseResult;
            }
        } catch (error) {
            debug(`Erro na chamada à API Vertex AI (${this.modelName}, mode: ${this.mode}): %o`, error);
            return { text: `Erro ao comunicar com a API Vertex AI (${this.modelName}, mode: ${this.mode}): ${error.message}` };
        }
    }
}

module.exports = VertexAILLM;
