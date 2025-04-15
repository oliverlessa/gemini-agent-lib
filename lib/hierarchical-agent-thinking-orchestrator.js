// hierarchical-agent-thinking-orchestrator.js
const debug = require('./debug').create('gemini-agent-lib:orchestrator:thinking');
const HierarchicalAgentOrchestrator = require('./hierarchical-agent-orchestrator');
const GenerativeAILLM = require('./generative-ai-llm');

/**
 * @class HierarchicalAgentThinkingOrchestrator
 * @description Orquestrador hierárquico que utiliza o modelo "thinking" para coordenar múltiplos agentes especialistas.
 * Esta classe estende HierarchicalAgentOrchestrator e é configurada especificamente para trabalhar
 * com o modelo gemini-2.5-pro-preview-03-25, que possui características específicas de resposta
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
     * @param {boolean} [config.includeThinkingSteps=false] - Define se o resultado final deve incluir os passos de raciocínio do LLM. Padrão: false (retorna apenas a resposta final).
     * @throws {Error} Se o array de agentes estiver vazio ou não for um array (herdado da classe pai)
     */
    constructor(agents, {
        apiKey,
        useVertexAI = true,
        vertexConfig = {}, // Para configurações específicas do Vertex AI, se necessário
        includeThinkingSteps = false // Nova opção de configuração
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

        // Chamar o construtor da classe pai
        super(agents, thinkingLLM);
        
        // Propriedades específicas
        this.isThinkingModel = true;
        this.includeThinkingSteps = includeThinkingSteps; // Armazena a opção
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
     * A principal diferença em relação à classe pai é que este método, por padrão, processa a resposta
     * bruta do modelo thinking para retornar apenas a resposta final. Opcionalmente, pode retornar
     * a resposta bruta completa, incluindo o raciocínio, se configurado.
     * 
     * @param {string} task - A descrição da tarefa a ser executada
     * @returns {Promise<string>} Uma promessa que resolve para a resposta final (por padrão) ou a resposta bruta completa (se `includeThinkingSteps` for true).
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
        
        // Processar a resposta final se includeThinkingSteps for false (padrão)
        if (!this.includeThinkingSteps) {
            const processedResponse = this.processThinkingResponse(finalResponse);
            debug("Resposta Final Processada (Apenas Resposta): %o", processedResponse.finalAnswer);
            return processedResponse.finalAnswer;
        } else {
            // Retornar a resposta bruta completa se includeThinkingSteps for true
            debug("Retornando Resposta Bruta Completa (com Raciocínio).");
            return finalResponse;
        }
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
        debug("--- Processando Resposta Thinking ---");
        debug("Resposta Bruta Recebida: %o", rawResponse);
        
        try {
            // Tentativa 1: Verificar se a resposta é um JSON válido
            try {
                const jsonResponse = JSON.parse(rawResponse);
                debug("Resposta detectada como JSON válido.");
                
                if (jsonResponse.final_answer || jsonResponse.answer) {
                    debug("JSON contém campos 'final_answer' ou 'answer'.");
                    return {
                        finalAnswer: jsonResponse.final_answer || jsonResponse.answer,
                        thinkingSteps: JSON.stringify(jsonResponse.thinking_steps || jsonResponse.steps || jsonResponse.reasoning || jsonResponse, null, 2), // Formata o resto como JSON
                        rawResponse: rawResponse
                    };
                }
                debug("JSON não contém campos esperados, retornando JSON completo como resposta final.");
                // Se não encontrar campos específicos, retornar o JSON completo como string na resposta final
                return {
                    finalAnswer: JSON.stringify(jsonResponse, null, 2),
                    thinkingSteps: "",
                    rawResponse: rawResponse
                };
            } catch (jsonError) {
                // Não é JSON, continuar com processamento de texto
                debug("Resposta não é JSON válido, prosseguindo com análise de texto.");
            }

            // Tentativa 2: Processamento baseado em texto (Refatorado)
            // A ideia é encontrar o *último* marcador explícito da resposta final ou um separador '---'
            // e considerar tudo *após* ele como a resposta final.
            let thinkingSteps = rawResponse; // Inicialmente, tudo é considerado raciocínio
            let finalAnswer = "";          // Inicialmente, a resposta final está vazia

            // Padrões para identificar o início da *resposta final*, procurando do fim para o início.
            // Inclui marcadores em markdown (**, ##) e a linha separadora '---'.
            // Os padrões buscam o marcador/separador com quebras de linha antes e depois para maior precisão.
            const finalAnswerMarkers = [
                /\n\*\*(resposta final|conclusão|resultado|análise|summary|conclusion|final answer)\*\*\s*\n/i,
                /\n##\s*(resposta final|conclusão|resultado|análise|summary|conclusion|final answer)\s*\n/i,
                /\n-{3,}\s*\n/i // Linha separadora ---
            ];

            let finalAnswerStartIndex = -1; // O índice no rawResponse onde a resposta final começa

            // Iterar pelos padrões para encontrar a *última* ocorrência de um marcador/separador
            for (const pattern of finalAnswerMarkers) {
                let lastMatch = null;
                let match;
                // Usar regex global para encontrar todas as ocorrências
                const regex = new RegExp(pattern.source, 'gi');
                while ((match = regex.exec(rawResponse)) !== null) {
                    lastMatch = match; // Guarda a última correspondência encontrada
                }

                // Se encontramos uma correspondência para este padrão e ela ocorre *depois*
                // de qualquer outra correspondência já encontrada, atualizamos o índice.
                if (lastMatch && lastMatch.index > finalAnswerStartIndex) {
                    // O índice onde a resposta final começa é *após* o marcador/separador completo.
                    finalAnswerStartIndex = lastMatch.index + lastMatch[0].length;
                    debug(`Último marcador/separador candidato encontrado na posição ${lastMatch.index}: "${lastMatch[0].trim()}"`);
                }
            }

            // Se encontramos um marcador/separador (finalAnswerStartIndex foi atualizado)
            if (finalAnswerStartIndex !== -1 && finalAnswerStartIndex < rawResponse.length) {
                // A resposta final é tudo a partir do índice encontrado.
                finalAnswer = rawResponse.substring(finalAnswerStartIndex).trim();

                // Os passos de raciocínio são tudo *antes* do início do marcador/separador que determinou o finalAnswerStartIndex.
                // Precisamos encontrar o índice exato do *início* desse marcador específico.
                let separatorStartIndex = -1;
                for (const pattern of finalAnswerMarkers) {
                    let lastMatch = null;
                    let match;
                    const regex = new RegExp(pattern.source, 'gi');
                    while ((match = regex.exec(rawResponse)) !== null) {
                        // Verifica se esta correspondência é a que definiu o finalAnswerStartIndex
                        if (match.index + match[0].length === finalAnswerStartIndex) {
                            separatorStartIndex = match.index;
                            break; // Encontramos o marcador exato
                        }
                    }
                    if (separatorStartIndex !== -1) break; // Sai do loop externo se já encontrou
                }

                if (separatorStartIndex !== -1) {
                    // Se encontramos o início do separador, o raciocínio vai até ali.
                    thinkingSteps = rawResponse.substring(0, separatorStartIndex).trim();
                    debug(`Separador encontrado. Thinking steps extraídos até a posição ${separatorStartIndex}.`);
                } else {
                    // Fallback: Se algo deu errado ao encontrar o início do separador (não deveria acontecer),
                    // pegamos tudo até o início da resposta final como raciocínio.
                    thinkingSteps = rawResponse.substring(0, finalAnswerStartIndex).trim();
                    debug(`Separador encontrado, mas índice inicial do separador não localizado (fallback). Thinking steps extraídos até ${finalAnswerStartIndex}.`);
                }
            } else {
                // Nenhum marcador/separador claro foi encontrado.
                // Comportamento seguro: Considerar a resposta inteira como final.
                debug("Nenhum marcador/separador claro encontrado para a resposta final. Retornando resposta bruta como final.");
                finalAnswer = rawResponse;
                thinkingSteps = ""; // Nenhum passo de raciocínio claramente separado
            }

            // Limpeza final: Remover possíveis marcadores que ficaram no início da resposta final
             finalAnswer = finalAnswer.replace(/^\s*(\*\*|##)\s*(resposta final|conclusão|resultado|análise|summary|conclusion|final answer)\s*(\*\*|##)?\s*\n?/i, '').trim();
             finalAnswer = finalAnswer.replace(/^\s*-{3,}\s*\n?/,'').trim(); // Remover linha --- inicial

            debug(`Final Answer extraída:\n---\n${finalAnswer}\n---`);
            debug(`Thinking Steps extraídos:\n---\n${thinkingSteps}\n---`);

            // Verificação de segurança: Se a resposta final extraída estiver vazia, mas havia algo antes (raciocínio),
            // é mais seguro retornar a resposta bruta completa para evitar perder informação.
            if (!finalAnswer && thinkingSteps) {
                debug("AVISO: Resposta final extraída está vazia, mas passos de raciocínio foram encontrados. Retornando resposta bruta como final.");
                return {
                    finalAnswer: rawResponse,
                    thinkingSteps: "", // Limpa os passos para evitar confusão
                    rawResponse: rawResponse
                };
            }

            return {
                finalAnswer: finalAnswer || rawResponse, // Retorna rawResponse se finalAnswer for vazio por algum motivo
                thinkingSteps: thinkingSteps,
                rawResponse: rawResponse
            };

        } catch (error) {
            console.error("Erro crítico ao processar resposta do modelo thinking:", error);
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
