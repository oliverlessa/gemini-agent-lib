class HierarchicalAgentOrchestrator {
    constructor(agents, llm) {
        if (!Array.isArray(agents) || agents.length === 0) {
            throw new Error("HierarchicalAgentOrchestrator precisa de um array de agentes não vazio.");
        }
        this.agents = agents;
        this.llm = llm; // LLM para o agente orquestrador (pode ser o mesmo ou diferente dos agentes especialistas)
    }

    async orchestrate(task) {
        console.log("\n--- Iniciando Orquestração Hierárquica de Agentes ---");
        console.log(`Tarefa Principal: ${task}`);

        // Passo 1: Agente Orquestrador analisa a tarefa e decide quais especialistas acionar
        const agentsToEngage = await this.determineAgentsForTask(task);
        console.log("\nAgentes Selecionados para a Tarefa:", agentsToEngage.map(agent => agent.role));

        if (agentsToEngage.length === 0) {
            console.log("\nNenhum agente especialista adequado encontrado para a tarefa.");
            return "Nenhum agente especialista adequado encontrado para a tarefa."; // Ou usar o LLM para responder diretamente
        }

        let expertResponses = {}; // Para armazenar as respostas dos agentes especialistas

        // Passo 2: Acionar agentes especialistas e coletar respostas
        for (const agent of agentsToEngage) {
            console.log(`\n**Agente Especialista: ${agent.role} - Iniciando tarefa... **`);
            
            // Suporte para formatadores de tarefa personalizados
            let agentTask;
            if (agent.taskFormatter && typeof agent.taskFormatter === 'function') {
                // Usar formatador personalizado se disponível
                agentTask = agent.taskFormatter(task, agent);
            } else if (agent.enableGoogleSearch === true) {
                // Caso especial para Google Search
                agentTask = `"${task}"`;
            } else {
                // Comportamento padrão
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
                expertResponses[agent.role] = `Erro ao executar tarefa: ${error.message}`; // Armazena mensagem de erro
            }
        }

        // Passo 3: Agente Orquestrador processa as respostas dos especialistas e gera a resposta final
        const finalResponse = await this.generateFinalResponse(task, expertResponses);
        console.log("\n--- Orquestração Hierárquica Concluída ---");
        console.log("\nResposta Final Orquestrada:\n", finalResponse);
        return finalResponse;
    }


    async determineAgentsForTask(task) {
        console.log("\n--- Determinando Agentes Especialistas com LLM ---");

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

            Formato de Resposta:
            Liste os roles dos agentes selecionados, um por linha.
            Se nenhum agente for relevante, responda apenas: Nenhum agente relevante encontrado
        `;

        console.log("\nPrompt para Seleção de Agentes:\n", prompt);

        try {
            const response = await this.llm.generateContent({ prompt: prompt });
            const agentSelectionResponse = response.text;
            console.log("\nResposta do LLM para Seleção de Agentes:\n", agentSelectionResponse);

            if (agentSelectionResponse.toLowerCase().includes("nenhum agente relevante encontrado")) {
                return []; // Retorna array vazio se nenhum agente for considerado relevante
            }

            // Extrair roles dos agentes selecionados da resposta do LLM
            const selectedAgentRoles = agentSelectionResponse.split('\n').map(role => role.trim()).filter(role => role !== "");
            console.log("\nRoles de Agentes Selecionados (extraídos da resposta):\n", selectedAgentRoles);

            // Encontrar os objetos Agent correspondentes aos roles selecionados
            const selectedAgents = this.agents.filter(agent => selectedAgentRoles.includes(agent.role));
            console.log("\nAgentes Selecionados (objetos Agent):\n", selectedAgents.map(agent => agent.role));
            return selectedAgents;


        } catch (error) {
            console.error("Erro ao determinar agentes com LLM:", error);
            return []; // Em caso de erro, retorna array vazio (nenhum agente selecionado)
        }
    }


    async generateFinalResponse(task, expertResponses) {
        console.log("\n--- Gerando Resposta Final Orquestrada com LLM ---");

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

            A resposta deve ser clara, concisa e completa, integrando as informações dos especialistas.
        `;

        console.log("\nPrompt para Geração da Resposta Final:\n", prompt);

        try {
            const response = await this.llm.generateContent({ prompt: prompt });
            const finalResponseText = response.text;
            console.log("\nResposta do LLM para Geração da Resposta Final:\n", finalResponseText);
            return finalResponseText;

        } catch (error) {
            console.error("Erro ao gerar resposta final com LLM:", error);
            return "Erro ao gerar resposta final orquestrada."; // Em caso de erro, retorna mensagem de erro genérica
        }
    }
}

module.exports = HierarchicalAgentOrchestrator;
