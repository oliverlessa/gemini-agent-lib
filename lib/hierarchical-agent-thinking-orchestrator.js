// hierarchical-agent-thinking-orchestrator.js
const debug = require('./debug').create('gemini-agent-lib:orchestrator:thinking');
const HierarchicalAgentOrchestrator = require('./hierarchical-agent-orchestrator');
const GenerativeAILLM = require('./generative-ai-llm');

/**
 * @class HierarchicalAgentThinkingOrchestrator
 * @description Orquestrador hierárquico que utiliza o modelo "thinking" para coordenar múltiplos agentes especialistas.
 * Esta classe estende HierarchicalAgentOrchestrator e é configurada especificamente para trabalhar
 * com o modelo gemini-2.0-flash-thinking-exp-01-21, que possui características específicas de resposta
 * com raciocínio passo a passo, permitindo extrair tanto o processo de pensamento quanto a resposta final.
 * @extends HierarchicalAgentOrchestrator
 */
class HierarchicalAgentThinkingOrchestrator extends HierarchicalAgentOrchestrator {
    /**
     * Cria uma instância do orquestrador hierárquico de agentes com modelo thinking.
     * 
     * @param {Array} agents - Array de objetos de agentes especialistas. Cada agente deve ter propriedades 'role' e 'objective'.
     * @param {Object} config - Objeto de configuração para o orquestrador thinking
     * @param {string} config.apiKey - Chave de API para acessar o modelo Gemini
     * @param {boolean} [config.useVertexAI=true] - Define se deve usar a Vertex AI (true) ou a API Gemini direta (false)
     * @param {Object} [config.vertexConfig={}] - Configurações específicas para Vertex AI
     * @param {string} [config.vertexConfig.credentialsPath] - Caminho para o arquivo de credenciais da Vertex AI
     * @param {string} [config.vertexConfig.projectId] - ID do projeto na Google Cloud
     * @param {string} [config.vertexConfig.location='us-central1'] - Região da Vertex AI
     * @throws {Error} Se o array de agentes estiver vazio ou não for um array (herdado da classe pai)
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
     * Orquestra a execução de uma tarefa utilizando agentes especialistas com modelo thinking.
     * 
     * O processo de orquestração segue três etapas principais, semelhantes à classe pai, mas com
     * diferenças no processamento das respostas:
     * 1. Determinar quais agentes especialistas são mais adequados para a tarefa usando o modelo thinking
     * 2. Acionar cada agente selecionado e coletar suas respostas
     * 3. Sintetizar as respostas dos especialistas em uma resposta final que inclui o raciocínio passo a passo
     * 
     * A principal diferença em relação à classe pai é que este método retorna a resposta bruta do modelo
     * thinking, que inclui tanto o processo de raciocínio quanto a resposta final.
     * 
     * @param {string} task - A descrição da tarefa a ser executada
     * @returns {Promise<string>} Uma promessa que resolve para a resposta final bruta, incluindo o raciocínio
     * @override
     */
    async orchestrate(task) {
        debug("--- Iniciando Orquestração Hierárquica de Agentes com Modelo Thinking ---");
        debug(`Tarefa Principal: ${task}`);

        // Passo 1: Agente Orquestrador analisa a tarefa e decide quais especialistas acionar
        const agentsToEngage = await this.determineAgentsForTask(task);
        debug("Agentes Selecionados para a Tarefa: %o", agentsToEngage.map(agent => agent.role));

        if (agentsToEngage.length === 0) {
            debug("Nenhum agente especialista adequado encontrado para a tarefa.");
            return "Nenhum agente especialista adequado encontrado para a tarefa.";
        }

        let expertResponses = {}; // Para armazenar as respostas dos agentes especialistas

        // Passo 2: Acionar agentes especialistas e coletar respostas
        for (const agent of agentsToEngage) {
            debug(`**Agente Especialista: ${agent.role} - Iniciando tarefa... **`);
            
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
                debug(`**Agente Especialista: ${agent.role} - Tarefa Concluída.**`);
                debug(`Resposta do Agente ${agent.role}: %o`, response);
                expertResponses[agent.role] = response; // Armazena a resposta, indexada pelo papel do agente

            } catch (error) {
                console.error(`Erro ao executar Agente Especialista ${agent.role}:`, error);
                expertResponses[agent.role] = `Erro ao executar tarefa: ${error.message}`;
            }
        }

        // Passo 3: Agente Orquestrador processa as respostas dos especialistas e gera a resposta final
        const finalResponse = await this.generateFinalResponse(task, expertResponses);
        debug("--- Orquestração Hierárquica com Modelo Thinking Concluída ---");
        debug("Resposta Final Orquestrada (Bruta): %o", finalResponse);
        
        // Retornar a resposta bruta, sem processamento
        return finalResponse;
    }

    /**
     * Determina quais agentes especialistas são mais adequados para uma tarefa específica.
     * Utiliza o modelo thinking para analisar a tarefa e selecionar os agentes mais relevantes,
     * processando a resposta bruta para extrair os roles dos agentes selecionados.
     * 
     * Este método sobrescreve o da classe pai para trabalhar com o modelo thinking, que fornece
     * um raciocínio passo a passo antes de chegar à seleção final de agentes. O método inclui
     * lógica adicional para extrair os roles dos agentes a partir da resposta em formato de texto.
     * 
     * @private
     * @param {string} task - A descrição da tarefa a ser analisada
     * @returns {Promise<Array>} Uma promessa que resolve para um array de objetos de agentes selecionados
     * @override
     */
    async determineAgentsForTask(task) {
        debug("--- Determinando Agentes Especialistas com Modelo Thinking ---");

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

        debug("Prompt para Seleção de Agentes: %o", prompt);

        try {
            // Obter a resposta bruta do modelo thinking
            const response = await this.llm.generateContent({ prompt: prompt });
            const rawResponse = response.text;
            debug("Resposta Bruta do Modelo Thinking para Seleção de Agentes: %o", rawResponse);

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
            
            debug("Roles de Agentes Potencialmente Selecionados: %o", potentialRoles);
            
            // Encontrar os objetos Agent correspondentes aos roles selecionados
            const selectedAgents = this.agents.filter(agent => potentialRoles.includes(agent.role));
            debug("Agentes Selecionados (objetos Agent): %o", selectedAgents.map(agent => agent.role));
            
            return selectedAgents;

        } catch (error) {
            console.error("Erro ao determinar agentes com Modelo Thinking:", error);
            return []; // Em caso de erro, retorna array vazio (nenhum agente selecionado)
        }
    }

    /**
     * Gera uma resposta final sintetizada a partir das respostas dos agentes especialistas.
     * Utiliza o modelo thinking para integrar as diferentes perspectivas em uma resposta coesa,
     * incluindo o raciocínio passo a passo do processo de síntese.
     * 
     * Este método sobrescreve o da classe pai para trabalhar com o modelo thinking, que fornece
     * um raciocínio detalhado sobre como as informações dos especialistas foram analisadas,
     * avaliadas e integradas para formar a resposta final.
     * 
     * @private
     * @param {string} task - A descrição da tarefa original
     * @param {Object} expertResponses - Um objeto contendo as respostas dos agentes especialistas, indexadas por seus roles
     * @returns {Promise<string>} Uma promessa que resolve para a resposta final bruta, incluindo o raciocínio
     * @override
     */
    async generateFinalResponse(task, expertResponses) {
        debug("--- Gerando Resposta Final Orquestrada com Modelo Thinking ---");

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

        debug("Prompt para Geração da Resposta Final: %o", prompt);

        try {
            // Obter a resposta bruta do modelo thinking
            const response = await this.llm.generateContent({ prompt: prompt });
            const rawResponse = response.text;
            debug("Resposta Bruta do Modelo Thinking para Geração da Resposta Final: %o", rawResponse);
            
            // Retornar a resposta bruta, sem processamento
            return rawResponse;

        } catch (error) {
            console.error("Erro ao gerar resposta final com Modelo Thinking:", error);
            return "Erro ao gerar resposta final orquestrada."; // Em caso de erro, retorna mensagem de erro genérica
        }
    }

    /**
     * Processa a resposta bruta do modelo thinking para extrair informações estruturadas.
     * Este método é exclusivo desta classe e não existe na classe pai.
     * 
     * Analisa a resposta bruta do modelo thinking e tenta extrair:
     * 1. A resposta final (conclusão)
     * 2. Os passos de raciocínio que levaram à resposta
     * 
     * O método utiliza várias estratégias para identificar estas partes:
     * - Verifica se a resposta é um JSON válido com campos específicos
     * - Procura por padrões de texto que indicam seções de "resposta final" ou "conclusão"
     * - Identifica indicadores linguísticos de conclusão (como "portanto", "em conclusão", etc.)
     * - Analisa a estrutura de parágrafos para separar o raciocínio da resposta final
     * 
     * @param {string} rawResponse - A resposta bruta do modelo thinking
     * @returns {Object} Um objeto contendo as partes estruturadas da resposta:
     *   - finalAnswer {string} - A resposta/conclusão final extraída
     *   - thinkingSteps {string} - Os passos de raciocínio que levaram à resposta
     *   - rawResponse {string} - A resposta bruta original
     *   - error {string} - Mensagem de erro, se ocorrer algum problema durante o processamento
     */
    processThinkingResponse(rawResponse) {
        try {
            // Tentativa 1: Verificar se a resposta é um JSON válido (improvável, mas possível)
            try {
                const jsonResponse = JSON.parse(rawResponse);
                debug("Resposta detectada como JSON válido");
                
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
                debug("Resposta não é JSON válido, tentando outros formatos");
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
