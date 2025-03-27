class SequentialAgentChain {
    constructor(agents) {
        if (!Array.isArray(agents) || agents.length === 0) {
            throw new Error("SequentialAgentChain precisa de um array de agentes não vazio.");
        }
        this.agents = agents;
    }

    async run(initialInput) {
        let currentInput = initialInput;
        let stepResults = []; // Para armazenar os resultados de cada agente (opcional, para debug ou logging)

        console.log("\n--- Iniciando Cadeia Sequencial de Agentes ---");

        for (let i = 0; i < this.agents.length; i++) {
            const agent = this.agents[i];
            console.log(`\n**Agente ${i + 1}: ${agent.role} - Iniciando tarefa... **`);
            
            // Suporte para formatadores de tarefa personalizados
            let agentTask;
            if (agent.taskFormatter && typeof agent.taskFormatter === 'function') {
                // Usar formatador personalizado se disponível
                agentTask = agent.taskFormatter(currentInput, agent);
            } else if (agent.enableGoogleSearch === true) {
                // Caso especial para Google Search
                agentTask = `"${currentInput}"`;
            } else {
                // Comportamento padrão - manter o comportamento original
                agentTask = currentInput;
            }
            agent.task = agentTask; // Define a tarefa formatada para o agente

            try {
                const output = await agent.executeTask();
                console.log(`**Agente ${i + 1}: ${agent.role} - Tarefa Concluída.**`);
                console.log(`Saída do Agente ${i + 1}:\n`, output);

                stepResults.push({
                    agentRole: agent.role,
                    input: currentInput,
                    output: output
                }); // Armazena o resultado do passo

                currentInput = output; // A saída do agente atual se torna a entrada para o próximo agente

            } catch (error) {
                console.error(`Erro ao executar Agente ${i + 1} (${agent.role}) na cadeia sequencial:`, error);
                return `Erro na cadeia de agentes no Agente ${i + 1} (${agent.role}): ${error.message}`; // Propaga o erro
            }
        }

        console.log("\n--- Cadeia Sequencial de Agentes Concluída ---");
        return currentInput; // Retorna a saída final do último agente da cadeia
    }
}

module.exports = SequentialAgentChain;
