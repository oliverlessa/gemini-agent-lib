// thinking-agent.js
const Agent = require('./agent');
const GenerativeAILLM = require('./generative-ai-llm');

/**
 * Classe ThinkingAgent - Especializada para utilizar o modelo gemini-2.5-pro-preview-03-25
 * 
 * Esta classe herda da classe Agent e é configurada especificamente para trabalhar
 * com o modelo gemini-2.5-pro-preview-03-25, que possui características
 * específicas de resposta com raciocínio passo a passo.
 */
class ThinkingAgent extends Agent {
    /**
     * Construtor da classe ThinkingAgent
     * 
     * @param {Object} config - Configuração do agente
     * @param {string} config.role - Papel/função do agente
     * @param {string} config.objective - Objetivo principal do agente
     * @param {string} config.context - Contexto/instruções para o agente
     * @param {string} config.task - Tarefa específica a ser executada
     * @param {Array} config.tools - Ferramentas disponíveis para o agente
     * @param {boolean} config.enableGoogleSearch - Habilitar busca no Google
     * @param {string} config.apiKey - Chave de API para o Gemini
     * @param {boolean} config.useVertexAI - Usar Vertex AI em vez da API Gemini direta
     * @param {Object} config.vertexConfig - Configurações específicas para Vertex AI
     */
    constructor({
        role,
        objective,
        context,
        task,
        tools = [],
        enableGoogleSearch = false,
        apiKey,
        useVertexAI = true,
        vertexConfig = {} // Para configurações específicas do Vertex AI, se necessário
    }) {
        // Criar a instância LLM específica para o modelo thinking
        let thinkingLLM;
        
        if (useVertexAI) {
            const VertexAILLM = require('./vertex-ai-llm');
            thinkingLLM = new VertexAILLM({
                apiKey: apiKey,
                credentialsPath: vertexConfig.credentialsPath,
                projectId: vertexConfig.projectId,
                location: vertexConfig.location || 'us-central1',
                modelName: "gemini-2.5-pro-preview-03-25",
                mode: "oneshot"
            });
        } else {
            thinkingLLM = new GenerativeAILLM({
                apiKey: apiKey,
                modelName: "gemini-2.5-pro-preview-03-25",
                mode: "oneshot"
            });
        }

        // Chamar o construtor da classe pai (Agent)
        super({
            role: role,
            objective: objective,
            context: context,
            task: task,
            llm: thinkingLLM,
            tools: tools,
            enableGoogleSearch: enableGoogleSearch
        });
        
        // Propriedades específicas do ThinkingAgent
        this.isThinkingModel = true;
    }

    /**
     * Executa a tarefa do agente e retorna a resposta bruta do modelo thinking
     * 
     * @returns {Promise<string>} Resposta bruta do modelo
     */
    async executeTask() {
        try {
            // Chamar o executeTask da classe pai (Agent)
            const rawResponse = await super.executeTask();
            
            // Exibir a resposta bruta para análise
            console.log("\n--- ThinkingAgent - Resposta Bruta do LLM ---");
            console.log(rawResponse);
            
            // Retornar apenas a resposta bruta, sem processamento
            return rawResponse;
        } catch (error) {
            console.error("Erro ao executar tarefa do ThinkingAgent:", error);
            return `Erro ao executar tarefa do ThinkingAgent: ${error.message}`;
        }
    }

    /**
     * Processa a resposta bruta do modelo thinking para extrair informações estruturadas
     * 
     * Com base nos testes realizados, o modelo gemini-2.0-flash-thinking-exp-01-21
     * retorna respostas em formato de texto estruturado com raciocínio passo a passo,
     * mas não em um formato específico como JSON.
     * 
     * @param {string} rawResponse - Resposta bruta do modelo
     * @returns {Object|string} Resposta processada
     */
    processThinkingResponse(rawResponse) {
        try {
            // Tentativa 1: Verificar se a resposta é um JSON válido (improvável, mas possível)
            try {
                const jsonResponse = JSON.parse(rawResponse);
                console.log("Resposta detectada como JSON válido");
                
                // Se for JSON, verificar campos comuns que podem existir
                if (jsonResponse.final_answer || jsonResponse.answer) {
                    return {
                        finalAnswer: jsonResponse.final_answer || jsonResponse.answer,
                        thinkingSteps: jsonResponse.thinking_steps || jsonResponse.steps || jsonResponse.reasoning || [],
                        rawResponse: rawResponse
                    };
                }
                
                // Se não encontrar campos específicos, retornar o JSON completo
                return jsonResponse;
            } catch (jsonError) {
                // Não é JSON, continuar com outras tentativas
                console.log("Resposta não é JSON válido, tentando outros formatos");
            }
            
            // Tentativa 2: Extrair seções de raciocínio e resposta final
            // Baseado nos padrões observados nos testes
            
            // Dividir a resposta em seções (parágrafos)
            const paragraphs = rawResponse.split('\n\n').filter(p => p.trim());
            
            // Verificar se a resposta contém um título ou cabeçalho que indica um raciocínio passo a passo
            const hasStepByStepTitle = /##.*(?:Raciocínio|Passo a Passo|Explicação|Thinking|Reasoning|Steps)/i.test(rawResponse) || 
                                      /\*\*(?:Raciocínio|Passo a Passo|Explicação|Thinking|Reasoning|Steps)/i.test(rawResponse);
            
            // Indicadores de conclusão/resposta final mais abrangentes
            const conclusionIndicators = [
                /portanto/i,
                /em\s+conclusão/i,
                /concluindo/i,
                /resposta\s+final/i,
                /resultado\s+final/i,
                /assim/i,
                /logo/i,
                /finalmente/i,
                /conclusão/i,
                /resumindo/i,
                /para\s+concluir/i,
                /em\s+suma/i,
                /em\s+síntese/i
            ];
            
            // Padrões para títulos de seção de resposta final
            const finalAnswerTitlePatterns = [
                /\*\*(?:Resposta Final|Conclusão|Resultado|Answer|Final Answer|Response)\*\*:?/i,
                /##\s*(?:Resposta Final|Conclusão|Resultado|Answer|Final Answer|Response)/i,
                /(?:Resposta Final|Conclusão|Resultado|Answer|Final Answer|Response):/i
            ];
            
            // Procurar por seções explícitas de resposta final
            let finalAnswerSection = null;
            let finalAnswerIndex = -1;
            let thinkingStepsSection = [];
            
            // Procurar por seções explícitas de "Resposta Final"
            let explicitFinalAnswerFound = false;
            
            // Primeiro, procurar por seções com títulos explícitos de resposta final
            for (let i = 0; i < paragraphs.length; i++) {
                const paragraph = paragraphs[i];
                
                // Verificar se o parágrafo contém um título de resposta final
                if (finalAnswerTitlePatterns.some(pattern => pattern.test(paragraph))) {
                    // Se encontrou um título de resposta final, a resposta pode estar no mesmo parágrafo
                    // ou nos parágrafos seguintes
                    
                    // Extrair a resposta final do parágrafo atual (removendo o título)
                    const titleMatch = paragraph.match(/(.*?):(.*)/s);
                    if (titleMatch && titleMatch[2].trim()) {
                        // Se a resposta está no mesmo parágrafo após o título
                        finalAnswerSection = titleMatch[2].trim();
                    } else if (i < paragraphs.length - 1) {
                        // Se a resposta está no próximo parágrafo
                        finalAnswerSection = paragraphs[i + 1];
                        i++; // Avançar para não incluir este parágrafo nos passos de raciocínio
                    }
                    
                    finalAnswerIndex = i;
                    explicitFinalAnswerFound = true;
                    break;
                }
            }
            
            // Se encontrou uma seção explícita de "Resposta Final", procurar por mais conteúdo que possa fazer parte dela
            if (explicitFinalAnswerFound && finalAnswerIndex < paragraphs.length - 1) {
                // Verificar se os parágrafos seguintes também fazem parte da resposta final
                // (geralmente após um título "Resposta Final" vem mais de um parágrafo)
                let additionalContent = [];
                for (let i = finalAnswerIndex + 1; i < paragraphs.length; i++) {
                    // Parar se encontrar outro título de seção
                    if (/^#+\s|\*\*[^*]+\*\*:/.test(paragraphs[i])) {
                        break;
                    }
                    additionalContent.push(paragraphs[i]);
                }
                
                if (additionalContent.length > 0) {
                    finalAnswerSection = finalAnswerSection + '\n\n' + additionalContent.join('\n\n');
                }
            }
            
            // Se não encontrou uma seção explícita de "Resposta Final", procurar por uma seção "Conclusão"
            if (!explicitFinalAnswerFound) {
                for (let i = 0; i < paragraphs.length; i++) {
                    const paragraph = paragraphs[i];
                    
                    // Verificar se o parágrafo contém um título de conclusão
                    if (/^#+\s+Conclusão|\*\*Conclusão\*\*:?/i.test(paragraph)) {
                        // Se encontrou um título de conclusão, a resposta pode estar no mesmo parágrafo
                        // ou nos parágrafos seguintes
                        
                        // Extrair a conclusão do parágrafo atual (removendo o título)
                        const titleMatch = paragraph.match(/(.*?):(.*)/s);
                        if (titleMatch && titleMatch[2].trim()) {
                            // Se a conclusão está no mesmo parágrafo após o título
                            finalAnswerSection = titleMatch[2].trim();
                        } else if (i < paragraphs.length - 1) {
                            // Se a conclusão está no próximo parágrafo
                            finalAnswerSection = paragraphs[i + 1];
                            i++; // Avançar para não incluir este parágrafo nos passos de raciocínio
                        }
                        
                        finalAnswerIndex = i;
                        explicitFinalAnswerFound = true;
                        
                        // Verificar se os parágrafos seguintes também fazem parte da conclusão
                        let additionalContent = [];
                        for (let j = finalAnswerIndex + 1; j < paragraphs.length; j++) {
                            // Parar se encontrar outro título de seção
                            if (/^#+\s|\*\*[^*]+\*\*:/.test(paragraphs[j])) {
                                break;
                            }
                            additionalContent.push(paragraphs[j]);
                        }
                        
                        if (additionalContent.length > 0) {
                            finalAnswerSection = finalAnswerSection + '\n\n' + additionalContent.join('\n\n');
                        }
                        
                        break;
                    }
                }
            }
            
            // Procurar por uma seção "Resposta Final" explícita no final do texto
            if (!explicitFinalAnswerFound) {
                // Verificar os últimos parágrafos para uma seção "Resposta Final" explícita
                for (let i = paragraphs.length - 1; i >= Math.max(0, paragraphs.length - 5); i--) {
                    const paragraph = paragraphs[i];
                    
                    // Verificar se o parágrafo contém um título de resposta final
                    if (/^#+\s+Resposta\s+Final|^\*\*Resposta\s+Final\*\*:?/i.test(paragraph)) {
                        // Se encontrou um título de resposta final, a resposta pode estar no mesmo parágrafo
                        // ou nos parágrafos seguintes
                        
                        // Extrair a resposta final do parágrafo atual (removendo o título)
                        const titleMatch = paragraph.match(/(.*?):(.*)/s);
                        if (titleMatch && titleMatch[2].trim()) {
                            // Se a resposta está no mesmo parágrafo após o título
                            finalAnswerSection = titleMatch[2].trim();
                        } else if (i < paragraphs.length - 1) {
                            // Se a resposta está nos parágrafos seguintes
                            let answerParagraphs = [];
                            for (let j = i + 1; j < paragraphs.length; j++) {
                                answerParagraphs.push(paragraphs[j]);
                            }
                            finalAnswerSection = answerParagraphs.join('\n\n');
                        }
                        
                        finalAnswerIndex = i;
                        explicitFinalAnswerFound = true;
                        break;
                    }
                }
            }
            
            // Procurar por uma seção "Resposta Final" em qualquer parte do texto
            if (!explicitFinalAnswerFound) {
                for (let i = 0; i < paragraphs.length; i++) {
                    const paragraph = paragraphs[i];
                    
                    // Verificar se o parágrafo contém um título de resposta final
                    if (/^#+\s+Resposta\s+Final|^\*\*Resposta\s+Final\*\*:?|^Resposta\s+Final:?/i.test(paragraph)) {
                        // Se encontrou um título de resposta final, a resposta pode estar no mesmo parágrafo
                        // ou nos parágrafos seguintes
                        
                        // Extrair a resposta final do parágrafo atual (removendo o título)
                        const titleMatch = paragraph.match(/(.*?):(.*)/s);
                        if (titleMatch && titleMatch[2].trim()) {
                            // Se a resposta está no mesmo parágrafo após o título
                            finalAnswerSection = titleMatch[2].trim();
                        } else if (i < paragraphs.length - 1) {
                            // Se a resposta está nos parágrafos seguintes
                            let answerParagraphs = [];
                            for (let j = i + 1; j < paragraphs.length; j++) {
                                // Parar se encontrar outro título de seção
                                if (/^#+\s|\*\*[^*]+\*\*:/.test(paragraphs[j])) {
                                    break;
                                }
                                answerParagraphs.push(paragraphs[j]);
                            }
                            finalAnswerSection = answerParagraphs.join('\n\n');
                        }
                        
                        finalAnswerIndex = i;
                        explicitFinalAnswerFound = true;
                        break;
                    }
                }
            }
            
            // Se não encontrou uma seção explícita, procurar por parágrafos com indicadores de conclusão
            if (!finalAnswerSection) {
                for (let i = 0; i < paragraphs.length; i++) {
                    const paragraph = paragraphs[i];
                    if (conclusionIndicators.some(indicator => indicator.test(paragraph))) {
                        finalAnswerSection = paragraph;
                        finalAnswerIndex = i;
                        break;
                    }
                }
            }
            
            // Se ainda não encontrou, verificar se há uma seção "Resposta Final" no final do texto
            if (!finalAnswerSection) {
                // Verificar os últimos 3 parágrafos (ou menos se não houver tantos)
                const lastParagraphsToCheck = Math.min(3, paragraphs.length);
                for (let i = paragraphs.length - lastParagraphsToCheck; i < paragraphs.length; i++) {
                    const paragraph = paragraphs[i];
                    
                    // Verificar se o parágrafo parece ser uma conclusão
                    if (conclusionIndicators.some(indicator => indicator.test(paragraph)) || 
                        finalAnswerTitlePatterns.some(pattern => pattern.test(paragraph))) {
                        finalAnswerSection = paragraph;
                        finalAnswerIndex = i;
                        break;
                    }
                }
            }
            
            // Se ainda não encontrou, usar o último parágrafo como resposta final
            // (apenas se tiver mais de um parágrafo e o texto tiver características de raciocínio passo a passo)
            if (!finalAnswerSection && paragraphs.length > 1 && hasStepByStepTitle) {
                finalAnswerSection = paragraphs[paragraphs.length - 1];
                finalAnswerIndex = paragraphs.length - 1;
            }
            
            // Extrair os passos de raciocínio
            if (finalAnswerIndex > 0) {
                // Se identificou uma resposta final, usar todos os parágrafos anteriores como passos de raciocínio
                thinkingStepsSection = paragraphs.slice(0, finalAnswerIndex);
            } else if (hasStepByStepTitle && paragraphs.length > 1) {
                // Se tem características de raciocínio passo a passo mas não identificou uma resposta final específica,
                // usar todos os parágrafos exceto o último como passos de raciocínio
                thinkingStepsSection = paragraphs.slice(0, paragraphs.length - 1);
            }
            
            // Se não encontrou uma resposta final explícita, mas há uma seção "Resposta" no final do texto
            if (!finalAnswerSection) {
                const lastParagraphs = paragraphs.slice(-3); // Pegar os últimos 3 parágrafos
                for (const paragraph of lastParagraphs) {
                    if (/\*\*Resposta:?\*\*|\bResposta:?\b|^Resposta:?\s/i.test(paragraph)) {
                        finalAnswerSection = paragraph;
                        finalAnswerIndex = paragraphs.indexOf(paragraph);
                        break;
                    }
                }
            }
            
            // Se identificou uma resposta final e passos de raciocínio
            if (finalAnswerSection && thinkingStepsSection.length > 0) {
                console.log("Resposta processada: identificada seção de resposta final e passos de raciocínio");
                return {
                    finalAnswer: finalAnswerSection,
                    thinkingSteps: thinkingStepsSection.join('\n\n'),
                    rawResponse: rawResponse
                };
            }
            
            // Se identificou apenas uma resposta final
            if (finalAnswerSection) {
                console.log("Resposta processada: identificada apenas seção de resposta final");
                return {
                    finalAnswer: finalAnswerSection,
                    thinkingSteps: "",
                    rawResponse: rawResponse
                };
            }
            
            // Se identificou apenas passos de raciocínio
            if (thinkingStepsSection.length > 0) {
                console.log("Resposta processada: identificados apenas passos de raciocínio");
                
                // Procurar por uma resposta final explícita no texto completo
                const finalAnswerMatch = rawResponse.match(/(?:Resposta|Resultado|Conclusão)(?:\s+Final)?:?\s*(.*?)(?:\n\n|\n$|$)/is);
                if (finalAnswerMatch && finalAnswerMatch[1].trim()) {
                    finalAnswerSection = finalAnswerMatch[1].trim();
                    return {
                        finalAnswer: finalAnswerSection,
                        thinkingSteps: thinkingStepsSection.join('\n\n'),
                        rawResponse: rawResponse
                    };
                }
                
                // Se não encontrou uma resposta final explícita, usar o último parágrafo dos passos de raciocínio
                const lastThinkingStep = thinkingStepsSection.pop();
                return {
                    finalAnswer: lastThinkingStep,
                    thinkingSteps: thinkingStepsSection.join('\n\n'),
                    rawResponse: rawResponse
                };
            }
            
            // Tentativa 3: Analisar a estrutura do texto para identificar raciocínio e conclusão
            // Verificar se o texto tem uma estrutura de passos numerados ou seções com títulos
            
            // Verificar se há padrões de numeração (1., 2., etc.) ou marcadores (*, -, etc.)
            const hasNumberedSteps = /\n\s*\d+\.\s+/m.test(rawResponse);
            const hasBulletPoints = /\n\s*[\*\-]\s+/m.test(rawResponse);
            
            if ((hasNumberedSteps || hasBulletPoints) && paragraphs.length > 1) {
                console.log("Resposta processada: detectada estrutura com passos numerados ou marcadores");
                // Usar o último parágrafo como resposta final
                const lastParagraph = paragraphs[paragraphs.length - 1];
                return {
                    finalAnswer: lastParagraph,
                    thinkingSteps: paragraphs.slice(0, -1).join('\n\n'),
                    rawResponse: rawResponse
                };
            }
            
            // Tentativa 4: Se não conseguir identificar um formato específico,
            // tentar uma abordagem mais simples
            
            // Se o texto for curto (menos de 5 parágrafos), considerar tudo como resposta final
            if (paragraphs.length <= 5) {
                console.log("Resposta processada: texto curto, considerando tudo como resposta final");
                return {
                    finalAnswer: rawResponse,
                    thinkingSteps: "",
                    rawResponse: rawResponse
                };
            }
            
            // Para textos mais longos sem estrutura clara, dividir em duas partes:
            // - Primeira metade: passos de raciocínio
            // - Segunda metade: resposta final (com ênfase nos últimos parágrafos)
            console.log("Resposta processada: texto longo sem estrutura clara, dividindo em duas partes");
            const midPoint = Math.floor(paragraphs.length / 2);
            const firstHalf = paragraphs.slice(0, midPoint);
            const secondHalf = paragraphs.slice(midPoint);
            
            return {
                finalAnswer: secondHalf.join('\n\n'),
                thinkingSteps: firstHalf.join('\n\n'),
                rawResponse: rawResponse
            };
            
        } catch (error) {
            console.error("Erro ao processar resposta do modelo thinking:", error);
            return {
                finalAnswer: rawResponse,
                thinkingSteps: "",
                rawResponse: rawResponse,
                error: error.message
            };
        }
    }
}

module.exports = ThinkingAgent;
