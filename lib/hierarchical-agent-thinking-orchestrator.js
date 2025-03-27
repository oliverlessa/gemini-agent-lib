// hierarchical-agent-thinking-orchestrator.js
const HierarchicalAgentOrchestrator = require('./hierarchical-agent-orchestrator');
const GenerativeAILLM = require('./generative-ai-llm');

/**
 * Classe HierarchicalAgentThinkingOrchestrator - Orquestrador hierárquico que utiliza o modelo thinking
 * 
 * Esta classe estende HierarchicalAgentOrchestrator e é configurada especificamente para trabalhar
 * com o modelo gemini-2.0-flash-thinking-exp-01-21, que possui características
 * específicas de resposta com raciocínio passo a passo.
 */
class HierarchicalAgentThinkingOrchestrator extends HierarchicalAgentOrchestrator {
    /**
     * Construtor da classe HierarchicalAgentThinkingOrchestrator
     * 
     * @param {Array} agents - Array de agentes especialistas
     * @param {Object} config - Configurações adicionais
     * @param {string} config.apiKey - Chave de API para o Gemini
     * @param {boolean} config.useVertexAI - Usar Vertex AI em vez da API Gemini direta
     * @param {Object} config.vertexConfig - Configurações específicas para Vertex AI
     */
    constructor(agents, {
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
                modelName: "gemini-2.0-flash-thinking-exp-01-21",
                mode: "oneshot"
            });
        } else {
            thinkingLLM = new GenerativeAILLM({
                apiKey: apiKey,
                modelName: "gemini-2.0-flash-thinking-exp-01-21",
                mode: "oneshot"
            });
        }

        // Chamar o construtor da classe pai
        super(agents, thinkingLLM);
        
        // Propriedades específicas
        this.isThinkingModel = true;
    }

    /**
     * Orquestra os agentes especialistas para resolver uma tarefa
     * Sobrescreve o método da classe pai para usar o processamento de respostas brutas
     * 
     * @param {string} task - A tarefa principal a ser resolvida
     * @returns {Promise<string>} - A resposta final orquestrada
     */
    async orchestrate(task) {
        console.log("\n--- Iniciando Orquestração Hierárquica de Agentes com Modelo Thinking ---");
        console.log(`Tarefa Principal: ${task}`);

        // Passo 1: Agente Orquestrador analisa a tarefa e decide quais especialistas acionar
        const agentsToEngage = await this.determineAgentsForTask(task);
        console.log("\nAgentes Selecionados para a Tarefa:", agentsToEngage.map(agent => agent.role));

        if (agentsToEngage.length === 0) {
            console.log("\nNenhum agente especialista adequado encontrado para a tarefa.");
            return "Nenhum agente especialista adequado encontrado para a tarefa.";
        }

        let expertResponses = {}; // Para armazenar as respostas dos agentes especialistas

        // Passo 2: Acionar agentes especialistas e coletar respostas
        for (const agent of agentsToEngage) {
            console.log(`\n**Agente Especialista: ${agent.role} - Iniciando tarefa... **`);
            
            let agentTask;
            if (agent.taskFormatter && typeof agent.taskFormatter === 'function') {
                // Usar formatador personalizado se disponível
                agentTask = agent.taskFormatter(task, agent);
            } else if (agent.enableGoogleSearch === true) {
                // Tarefa específica para agentes com Google Search habilitado
                agentTask = `"${task}"`;
                // agentTask = `Realize uma pesquisa no Google sobre: "${task}". 
                // Retorne apenas os resultados relevantes da pesquisa com suas respectivas fontes. 
                // Não elabore ou adicione informações além dos resultados encontrados.`;
            } else {
                // Comportamento padrão para outros agentes
                agentTask = `
Como especialista no papel de ${agent.role} com o objetivo de "${agent.objective}", sua missão é contribuir para a seguinte tarefa principal:

"${task}"

Instruções específicas:
1. Analise a tarefa principal sob a perspectiva específica da sua expertise
2. Concentre-se nos aspectos da tarefa que mais se relacionam com seu papel e objetivo
3. Forneça insights, análises ou soluções que apenas um especialista em ${agent.role} poderia oferecer
4. Evite abordar aspectos que estejam fora do escopo da sua especialidade

Formato da resposta:
- Inicie com uma breve análise da tarefa sob sua perspectiva especializada
- Apresente sua contribuição principal de forma estruturada e objetiva
- Se aplicável, inclua recomendações específicas ou próximos passos
- Mantenha sua resposta concisa, direta e focada na sua área de expertise

Lembre-se: Sua resposta será integrada com as de outros especialistas para formar uma solução completa.
`;
            }
            
            agent.task = agentTask; // Define a tarefa específica para o agente especialista

            try {
                const response = await agent.executeTask();
                console.log(`**Agente Especialista: ${agent.role} - Tarefa Concluída.**`);
                console.log(`Resposta do Agente ${agent.role}:\n`, response);
                expertResponses[agent.role] = response; // Armazena a resposta, indexada pelo papel do agente

            } catch (error) {
                console.error(`Erro ao executar Agente Especialista ${agent.role}:`, error);
                expertResponses[agent.role] = `Erro ao executar tarefa: ${error.message}`;
            }
        }

        // Passo 3: Agente Orquestrador processa as respostas dos especialistas e gera a resposta final
        const finalResponse = await this.generateFinalResponse(task, expertResponses);
        console.log("\n--- Orquestração Hierárquica com Modelo Thinking Concluída ---");
        console.log("\nResposta Final Orquestrada (Bruta):\n", finalResponse);
        
        // Retornar a resposta bruta, sem processamento
        return finalResponse;
    }

    /**
     * Determina quais agentes especialistas devem ser acionados para a tarefa
     * Sobrescreve o método da classe pai para retornar a resposta bruta
     * 
     * @param {string} task - A tarefa principal
     * @returns {Promise<Array>} - Array de agentes selecionados
     */
    async determineAgentsForTask(task) {
        console.log("\n--- Determinando Agentes Especialistas com Modelo Thinking ---");

        const agentDescriptions = this.agents.map(agent => `- Role: ${agent.role}, Objective: ${agent.objective}`).join('\n');

        const prompt = `
            Você é um agente orquestrador hierárquico avançado, responsável por planejar e coordenar a execução de tarefas complexas através da seleção estratégica de agentes especialistas.

            Tarefa Principal: "${task}"

            Agentes Especialistas Disponíveis:
            ${agentDescriptions}

            Instruções para Análise da Tarefa:
            1. Decomponha a tarefa principal em subtarefas ou componentes essenciais
            2. Identifique quais habilidades e conhecimentos são necessários para cada componente
            3. Avalie cada agente especialista considerando:
               - Relevância direta para componentes específicos da tarefa
               - Capacidade de fornecer informações ou perspectivas únicas
               - Complementaridade com outros agentes (evitando redundâncias)
               - Potencial para resolver aspectos críticos da tarefa

            Critérios de Seleção:
            - Selecione APENAS agentes que contribuirão significativamente para o resultado
            - Evite selecionar agentes com funções redundantes
            - Considere a eficiência do conjunto (máximo valor com mínimo de agentes)
            - Priorize agentes com expertise diretamente relacionada aos aspectos centrais da tarefa

            Processo de Raciocínio:
            1. Analise a tarefa principal e identifique seus componentes essenciais
            2. Examine cada agente disponível e avalie sua relevância para cada componente
            3. Considere as possíveis interações e complementaridades entre agentes
            4. Selecione o conjunto ideal de agentes para maximizar a qualidade da resposta

            Formato de Resposta:
            Liste os roles dos agentes selecionados, um por linha.
            Se nenhum agente for relevante, responda apenas: Nenhum agente relevante encontrado
            
            Pense passo a passo, explicando seu raciocínio para cada decisão antes de fornecer a lista final de agentes selecionados.
        `;

        console.log("\nPrompt para Seleção de Agentes:\n", prompt);

        try {
            // Obter a resposta bruta do modelo thinking
            const response = await this.llm.generateContent({ prompt: prompt });
            const rawResponse = response.text;
            console.log("\nResposta Bruta do Modelo Thinking para Seleção de Agentes:\n", rawResponse);

            // Processar a resposta bruta para extrair os roles dos agentes selecionados
            if (rawResponse.toLowerCase().includes("nenhum agente relevante encontrado")) {
                return []; // Retorna array vazio se nenhum agente for considerado relevante
            }

            // Extrair roles dos agentes selecionados da resposta do LLM
            // Procurar por linhas que contenham apenas o nome do role, sem números ou marcadores
            const lines = rawResponse.split('\n');
            const potentialRoles = [];
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                // Verificar se a linha contém apenas o nome de um role (sem números, marcadores, etc.)
                if (trimmedLine && !trimmedLine.match(/^[\d\.\-\*\#]/)) {
                    // Verificar se a linha corresponde exatamente a um dos roles disponíveis
                    const matchingAgent = this.agents.find(agent => 
                        trimmedLine === agent.role || 
                        trimmedLine.includes(agent.role)
                    );
                    
                    if (matchingAgent) {
                        potentialRoles.push(matchingAgent.role);
                    }
                }
            }
            
            // Se não encontrou roles usando o método acima, tentar extrair de forma mais agressiva
            if (potentialRoles.length === 0) {
                for (const agent of this.agents) {
                    if (rawResponse.includes(agent.role)) {
                        potentialRoles.push(agent.role);
                    }
                }
            }
            
            console.log("\nRoles de Agentes Potencialmente Selecionados:\n", potentialRoles);
            
            // Encontrar os objetos Agent correspondentes aos roles selecionados
            const selectedAgents = this.agents.filter(agent => potentialRoles.includes(agent.role));
            console.log("\nAgentes Selecionados (objetos Agent):\n", selectedAgents.map(agent => agent.role));
            
            return selectedAgents;

        } catch (error) {
            console.error("Erro ao determinar agentes com Modelo Thinking:", error);
            return []; // Em caso de erro, retorna array vazio (nenhum agente selecionado)
        }
    }

    /**
     * Gera a resposta final com base nas respostas dos agentes especialistas
     * Sobrescreve o método da classe pai para retornar a resposta bruta
     * 
     * @param {string} task - A tarefa principal
     * @param {Object} expertResponses - Objeto com as respostas dos agentes especialistas
     * @returns {Promise<string>} - A resposta final orquestrada
     */
    async generateFinalResponse(task, expertResponses) {
        console.log("\n--- Gerando Resposta Final Orquestrada com Modelo Thinking ---");

        const responsesText = Object.entries(expertResponses)
            .map(([role, response]) => `- Agente ${role}: ${response}`)
            .join('\n');

        const prompt = `
            Você é um agente orquestrador hierárquico avançado, responsável por sintetizar informações de múltiplas fontes especializadas em uma resposta coesa, precisa e abrangente.

            Tarefa Principal: "${task}"

            Respostas dos Agentes Especialistas:
            ${responsesText}

            Instruções para Síntese:
            1. Identifique os principais componentes/aspectos da tarefa que precisam ser abordados
            2. Mapeie as contribuições de cada agente para esses componentes
            3. Avalie a qualidade, relevância e confiabilidade de cada contribuição
            4. Identifique padrões, conexões e insights que emergem do conjunto de respostas
            5. Resolva contradições e preencha lacunas de informação quando possível

            Princípios para Estruturação da Resposta:
            - Priorize informações por relevância e confiabilidade
            - Organize o conteúdo de forma lógica e progressiva
            - Elimine redundâncias e informações tangenciais
            - Mantenha um tom consistente e apropriado ao contexto da tarefa
            - Apresente perspectivas alternativas quando relevante, com indicação clara das diferenças

            Formato da Resposta Final:
            - Introdução: Contextualize brevemente o problema/tarefa
            - Corpo: Apresente as informações organizadas por tópicos ou aspectos relevantes
            - Conclusão: Sintetize os principais pontos e forneça uma resposta direta à tarefa original
            - (Quando aplicável) Recomendações ou próximos passos

            Processo de Raciocínio:
            1. Analise cada resposta de especialista e extraia os pontos-chave
            2. Identifique áreas de concordância, complementaridade e contradição
            3. Avalie a qualidade e relevância de cada contribuição
            4. Desenvolva uma estrutura lógica para integrar as informações
            5. Refine a resposta para garantir clareza, concisão e completude

            A resposta final deve ser clara, concisa e completa, integrando as informações dos especialistas sem mencionar explicitamente os agentes.
            
            Pense passo a passo, explicando seu processo de síntese antes de fornecer a resposta final.
        `;

        console.log("\nPrompt para Geração da Resposta Final:\n", prompt);

        try {
            // Obter a resposta bruta do modelo thinking
            const response = await this.llm.generateContent({ prompt: prompt });
            const rawResponse = response.text;
            console.log("\nResposta Bruta do Modelo Thinking para Geração da Resposta Final:\n", rawResponse);
            
            // Retornar a resposta bruta, sem processamento
            return rawResponse;

        } catch (error) {
            console.error("Erro ao gerar resposta final com Modelo Thinking:", error);
            return "Erro ao gerar resposta final orquestrada."; // Em caso de erro, retorna mensagem de erro genérica
        }
    }

    /**
     * Processa a resposta bruta do modelo thinking para extrair informações estruturadas
     * Método adicional, não presente na classe pai
     * 
     * @param {string} rawResponse - Resposta bruta do modelo
     * @returns {Object} - Resposta processada
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
            
            // Dividir a resposta em seções (parágrafos)
            const paragraphs = rawResponse.split('\n\n').filter(p => p.trim());
            
            // Verificar se a resposta contém um título ou cabeçalho que indica um raciocínio passo a passo
            const hasStepByStepTitle = /##.*(?:Raciocínio|Passo a Passo|Explicação|Thinking|Reasoning|Steps)/i.test(rawResponse) || 
                                      /\*\*(?:Raciocínio|Passo a Passo|Explicação|Thinking|Reasoning|Steps)/i.test(rawResponse);
            
            // Indicadores de conclusão/resposta final
            const conclusionIndicators = [
                /portanto/i, /em\s+conclusão/i, /concluindo/i, /resposta\s+final/i,
                /resultado\s+final/i, /assim/i, /logo/i, /finalmente/i, /conclusão/i,
                /resumindo/i, /para\s+concluir/i, /em\s+suma/i, /em\s+síntese/i
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
            
            // Se ainda não encontrou, usar o último parágrafo como resposta final
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
            
            // Se identificou uma resposta final e passos de raciocínio
            if (finalAnswerSection && thinkingStepsSection.length > 0) {
                return {
                    finalAnswer: finalAnswerSection,
                    thinkingSteps: thinkingStepsSection.join('\n\n'),
                    rawResponse: rawResponse
                };
            }
            
            // Se identificou apenas uma resposta final
            if (finalAnswerSection) {
                return {
                    finalAnswer: finalAnswerSection,
                    thinkingSteps: "",
                    rawResponse: rawResponse
                };
            }
            
            // Se não conseguir identificar um formato específico, retornar a resposta bruta
            return {
                finalAnswer: rawResponse,
                thinkingSteps: "",
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

module.exports = HierarchicalAgentThinkingOrchestrator;
