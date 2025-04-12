const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require("@google/generative-ai");
const debug = require('./debug').llm; // Assumindo que o debug pode ser útil

class GenerativeAILLM {
    /**
     * Construtor para a classe GenerativeAILLM.
     * @param {object} options - Opções de configuração.
     * @param {string} options.apiKey - Chave da API do Google AI Studio (Gemini). Obrigatório.
     * @param {string} [options.projectId] - ID do Projeto Google Cloud (para compatibilidade de interface com VertexAILLM, não usado).
     * @param {string} [options.location] - Localização do Google Cloud (para compatibilidade de interface com VertexAILLM, não usado).
     * @param {string} [options.modelName="gemini-2.0-flash-001"] - Nome do modelo Gemini a ser usado. Padrão: gemini-2.0-flash-001.
     * @param {string} [options.mode="oneshot"] - Modo de operação: 'oneshot' ou 'chat'.
     * @param {object} [options.generationConfig={}] - Configurações de geração para o modelo.
     * @param {Array} [options.safetySettings] - Configurações de segurança personalizadas. Se não fornecido, usa padrões.
     */
    constructor({ apiKey, projectId, location, modelName = "gemini-2.0-flash-001", mode = "oneshot", generationConfig = {}, safetySettings }) { // CORRIGIDO: modelName padrão
        if (!apiKey) {
            throw new Error("API Key do Gemini não fornecida.");
        }
        // projectId e location são para compatibilidade de interface com VertexAILLM, não usados aqui.
        this.apiKey = apiKey;
        this.modelName = modelName;
        this.mode = mode; // 'oneshot' ou 'chat'
        this.generationConfig = generationConfig;

        // Configurações de segurança padrão (iguais ao VertexAILLM)
        const defaultSafetySettings = [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
        ];
        this.safetySettings = safetySettings || defaultSafetySettings;

        // Inicializa o SDK do GoogleGenerativeAI
        this.genAI = new GoogleGenerativeAI(this.apiKey);

        // Inicializa o modelo generativo com as configurações
        this.model = this.genAI.getGenerativeModel({
            model: this.modelName,
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings // Passa as configurações de segurança
        });

        // Inicializa variáveis de estado para o modo chat
        if (this.mode === 'chat') {
            this.chat = null; // Armazenará a instância do chat do SDK (@google/generative-ai) - Pode não ser usado diretamente se usarmos generateContent
            this._currentTools = null; // Rastreia as ferramentas da sessão atual
            this._currentContext = null; // Rastreia o contexto (systemInstruction) da sessão atual
        }
    }

    /**
     * Verifica se o chat deve ser reinicializado com base em mudanças nas ferramentas ou no contexto.
     * @param {Array|undefined} tools - Ferramentas a serem utilizadas.
     * @param {string|undefined} context - Instruções do sistema (contexto).
     * @returns {boolean} - Verdadeiro se o chat deve ser reinicializado.
     */
    shouldReinitializeChat(tools, context) {
        // Compara a representação JSON das ferramentas atuais e novas
        const toolsChanged = JSON.stringify(tools) !== JSON.stringify(this._currentTools);
        // Compara o contexto (string) atual e novo
        const contextChanged = context !== this._currentContext;
        // Retorna true se qualquer um deles mudou
        return toolsChanged || contextChanged;
    }

    /**
     * Gera conteúdo usando a API Gemini, suportando modos 'oneshot' e 'chat'.
     * @param {object} options - Opções para geração de conteúdo.
     * @param {string} options.prompt - O prompt do usuário.
     * @param {Array} [options.tools] - Ferramentas (function declarations) a serem disponibilizadas para o modelo. Incluir `{ googleSearch: {} }` para ativar grounding.
     * @param {string} [options.context] - Instrução do sistema (system instruction).
     * @param {Array} [options.history] - Histórico da conversa (usado principalmente no modo 'chat').
     * @returns {Promise<object>} - Promessa resolvida com o objeto de resposta { text: string, functionCall?: object }.
     */
    async generateContent({ prompt, tools, context, history }) {
        try {
            // Prepara a requisição base
            const request = {
                safetySettings: this.safetySettings,
                generationConfig: this.generationConfig
            };

            // Adiciona tools se fornecidas (incluindo grounding se presente)
            if (tools && tools.length > 0) {
                request.tools = tools;
                debug("Ferramentas enviadas para Generative AI: %o", tools);
            }

            // Adiciona systemInstruction se context for fornecido
            if (context) {
                request.systemInstruction = { role: 'system', parts: [{ text: context }] };
            }

            // Prepara o conteúdo (prompt e histórico)
            const userMessage = { role: 'user', parts: [{ text: typeof prompt === 'string' ? prompt : JSON.stringify(prompt) }] };
            request.contents = [...(history || []), userMessage];

            // Log para debug
            debug(`[${this.constructor.name}] Enviando request para ${this.modelName} (mode: ${this.mode}): %o`, {
                contentsLength: request.contents.length,
                hasTools: !!request.tools,
                hasSystemInstruction: !!request.systemInstruction
            });

            // Chama a API generateContent (usada tanto para oneshot quanto para chat)
            const result = await this.model.generateContent(request);

            // Log detalhado da resposta bruta para depuração
            debug(`[${this.constructor.name}] Resposta bruta da API Gemini: %o`, result.response);

            // Processa a resposta unificada
            return this._processResponse(result.response);

        } catch (error) {
            console.error(`Erro na chamada à API Gemini (${this.modelName}, mode: ${this.mode}):`, error);
            debug(`Erro na chamada à API Gemini (${this.modelName}, mode: ${this.mode}): %o`, error);
            // Retorna um objeto de resposta similar ao LLMMock em caso de erro
            return { text: `Erro ao comunicar com a API Gemini (${this.modelName}, mode: ${this.mode}): ${error.message}` };
        }
    }

    /**
     * Processa a resposta bruta da API Gemini para o formato esperado.
     * @param {object} response - O objeto response retornado pela API Gemini.
     * @returns {object} - Objeto com { text: string, functionCall?: object }
     * @private
     */
    _processResponse(response) {
        // Validação básica da resposta
        if (!response || !response.candidates || response.candidates.length === 0) {
            console.warn("Resposta da API Gemini vazia ou inválida:", response);
            debug("Resposta da API Gemini vazia ou inválida: %o", response);
            return { text: "Resposta vazia ou inválida da API Gemini." };
        }

        const candidate = response.candidates[0];

        // Extrair texto combinado das partes
        let text = "";
        if (candidate.content && candidate.content.parts) {
            text = candidate.content.parts
                .filter(part => typeof part.text === 'string') // Garante que part.text existe e é string
                .map(part => part.text)
                .join('\n'); // Junta múltiplos textos com nova linha
        } else {
             console.warn("Candidato da API Gemini sem 'content' ou 'parts':", candidate);
             debug("Candidato da API Gemini sem 'content' ou 'parts': %o", candidate);
        }

        // Extrair functionCalls (pode haver múltiplos em paralelo)
        // Nota: Usamos o 'response' bruto da API aqui, não apenas 'candidate'.
        // O SDK @google/generative-ai já coloca functionCalls no nível da resposta.
        const functionCalls = response.functionCalls || undefined;

        // Verificar também se há functionCall no formato do VertexAILLM (para compatibilidade)
        let vertexStyleFunctionCall = null;
        if (candidate.content && candidate.content.parts) {
            const functionCallPart = candidate.content.parts.find(part => part.functionCall);
            if (functionCallPart && functionCallPart.functionCall) {
                vertexStyleFunctionCall = functionCallPart.functionCall;
                debug("Encontrado functionCall no formato VertexAILLM: %o", vertexStyleFunctionCall);
            }
        }

        // --- Início: Tratamento de Grounding ---
        // A ativação é feita incluindo { googleSearch: {} } no array `tools`.
        // A estrutura de `candidate.groundingMetadata` é compatível com VertexAILLM.
        if (candidate.groundingMetadata) {
            debug("GroundingMetadata encontrado: %o", candidate.groundingMetadata);
            try {
                const fontesFormatadas = this._formatGroundingMetadata(candidate.groundingMetadata);
                if (fontesFormatadas) {
                    text += fontesFormatadas;
                }
            } catch (e) {
                console.error("Erro ao formatar metadados de grounding:", e);
                debug("Erro ao formatar metadados de grounding: %o", e);
            }
        }
        // --- Fim: Tratamento de Grounding ---

        // Construir o objeto de resultado final
        const responseResult = { text: text };

        // Priorizar functionCalls do SDK, mas usar vertexStyleFunctionCall como fallback
        if (functionCalls && functionCalls.length > 0) {
            if (functionCalls.length > 1) {
                console.warn(`[${this.constructor.name}] Múltiplas chamadas de função (${functionCalls.length}) recebidas, retornando apenas a primeira:`, functionCalls);
                debug(`[${this.constructor.name}] Múltiplas chamadas de função (${functionCalls.length}) recebidas, retornando apenas a primeira: %o`, functionCalls);
            }
            responseResult.functionCall = functionCalls[0]; // Retorna a primeira chamada
        } else if (vertexStyleFunctionCall) {
            // Usar o formato do VertexAILLM como fallback
            debug(`[${this.constructor.name}] Usando functionCall no formato VertexAILLM como fallback`);
            responseResult.functionCall = vertexStyleFunctionCall;
        }

        debug(`[${this.constructor.name}] Resposta processada: %o`, responseResult);
        return responseResult;
    }

    /**
     * Formata os metadados de grounding para exibição.
     * (Lógica adaptada de VertexAILLM)
     * @param {object} groundingMetadata - O objeto groundingMetadata da resposta.
     * @returns {string|null} - String formatada das fontes ou null.
     * @private
     */
    _formatGroundingMetadata(groundingMetadata) {
        // Verifica se existem groundingChunks (fontes) e groundingSupports (trechos citados)
        if (groundingMetadata && groundingMetadata.groundingChunks && groundingMetadata.groundingSupports) {
            const chunks = groundingMetadata.groundingChunks;
            const supports = groundingMetadata.groundingSupports;

            // Mapa para armazenar as fontes únicas com seus trechos
            const fontesMap = new Map();

            // Processa cada support (trecho citado) e associa à sua fonte
            supports.forEach(support => {
                // Obtém o texto do trecho
                const trechoTexto = support.segment?.text || "";

                // Para cada índice de chunk referenciado por este trecho
                if (support.groundingChunkIndices) {
                    support.groundingChunkIndices.forEach(chunkIndex => {
                        if (chunkIndex >= 0 && chunkIndex < chunks.length) {
                            const chunk = chunks[chunkIndex];

                            // Extrai informações da fonte (web ou retrievedContext)
                            const uri = chunk.web?.uri || chunk.retrievedContext?.uri || "";
                            const titulo = chunk.web?.title || chunk.retrievedContext?.title || "";
                            // Tenta obter um domínio se for web
                            const dominio = uri.startsWith('http') ? new URL(uri).hostname : "";

                            // Cria uma chave única para a fonte
                            const fonteKey = uri;

                            if (uri) { // Só adiciona se tiver uma URI
                                // Adiciona ou atualiza a entrada no mapa
                                if (!fontesMap.has(fonteKey)) {
                                    fontesMap.set(fonteKey, {
                                        uri: uri,
                                        titulo: titulo,
                                        dominio: dominio,
                                        trechos: new Set() // Usa Set para evitar trechos duplicados por fonte
                                    });
                                }

                                // Adiciona o trecho à fonte correspondente se não for vazio
                                if (trechoTexto) {
                                    fontesMap.get(fonteKey).trechos.add(trechoTexto);
                                }
                            }
                        }
                    });
                }
            });

            // Formata as fontes para exibição
            if (fontesMap.size > 0) {
                let fontesFormatadas = "\n\n**Fontes:**\n";

                // Converte o mapa em array para facilitar a formatação
                const fontesArray = Array.from(fontesMap.values());

                // Formata cada fonte com seus trechos
                fontesArray.forEach((fonte, index) => {
                    fontesFormatadas += `\n[${index + 1}] [${fonte.titulo || fonte.dominio || 'Fonte Desconhecida'}](${fonte.uri})\n`;

                    // Adiciona os trechos citados desta fonte
                    if (fonte.trechos.size > 0) {
                        fonte.trechos.forEach(trecho => {
                            // Limita o tamanho do trecho para não ficar muito extenso
                            const trechoResumido = trecho.length > 150
                                ? trecho.substring(0, 147) + "..."
                                : trecho;
                            fontesFormatadas += `   * "${trechoResumido}"\n`; // Adiciona aspas para clareza
                        });
                    }
                });

                return fontesFormatadas;
            }
        }
        // Fallback para o método antigo se não encontrar a estrutura esperada (menos provável com @google/generative-ai)
        else if (groundingMetadata && groundingMetadata.webSearchRetrievalResults) {
             debug("Usando fallback para webSearchRetrievalResults em groundingMetadata.");
            // Extrai as fontes dos metadados de grounding (método antigo)
            const fontes = groundingMetadata.webSearchRetrievalResults.map((resultItem, index) => {
                return `[${index + 1}] ${resultItem.uri}: ${resultItem.title}`;
            });

            // Adiciona as fontes à resposta final
            if (fontes.length > 0) {
                return `\n\n**Fontes:**\n${fontes.join('\n')}`;
            }
        }

        return null; // Retorna null se não houver metadados válidos para formatar
    }
}

module.exports = GenerativeAILLM;
