// exemplo-formatadores-personalizados.js
require('dotenv').config();
const Agent = require('../lib/agent');
const GenerativeAILLM = require('../lib/generative-ai-llm');
const HierarchicalAgentOrchestrator = require('../lib/hierarchical-agent-orchestrator');

// Configuração da API
const apiKey = process.env.GEMINI_API_KEY;

// Criar instâncias LLM para os agentes
const llm = new GenerativeAILLM({
    apiKey: apiKey,
    modelName: "gemini-1.5-pro",
    mode: "oneshot"
});

// Exemplo 1: Agente Resumidor com formatador personalizado
const resumeAgent = new Agent({
    role: "Resumidor",
    objective: "Criar resumos concisos de textos longos",
    llm: llm,
    // Formatador personalizado para tarefas de resumo
    taskFormatter: (task, agent) => {
        return `Crie um resumo conciso do seguinte texto, em no máximo 3 parágrafos:
        
        "${task}"
        
        Use seu conhecimento como ${agent.role} para destacar apenas os pontos mais importantes.`;
    }
});

// Exemplo 2: Agente Tradutor com formatador personalizado
const translationAgent = new Agent({
    role: "Tradutor",
    objective: "Traduzir textos para diferentes idiomas",
    llm: llm,
    // Formatador personalizado para tarefas de tradução
    taskFormatter: (task, agent) => {
        return `Traduza o seguinte texto para o inglês:
        
        "${task}"
        
        Mantenha o tom e o estilo do texto original.`;
    }
});

// Exemplo 3: Agente Analista com formatador personalizado
const analysisAgent = new Agent({
    role: "Analista",
    objective: "Analisar criticamente textos e identificar pontos fortes e fracos",
    llm: llm,
    // Formatador personalizado para tarefas de análise
    taskFormatter: (task, agent) => {
        return `Analise criticamente o seguinte texto:
        
        "${task}"
        
        Identifique:
        1. Principais argumentos apresentados
        2. Pontos fortes da argumentação
        3. Possíveis falhas ou lacunas
        4. Sugestões de melhoria`;
    }
});

// Exemplo 4: Agente de Pesquisa com Google Search habilitado
const searchAgent = new Agent({
    role: "Pesquisador",
    objective: "Realizar pesquisas na web para encontrar informações atualizadas",
    llm: llm,
    enableGoogleSearch: true
    // Não precisa de formatador personalizado, pois o comportamento para
    // agentes com enableGoogleSearch já está implementado no orquestrador
});

// Criar o orquestrador com os agentes
const orchestrator = new HierarchicalAgentOrchestrator(
    [resumeAgent, translationAgent, analysisAgent, searchAgent],
    llm
);

// Função para executar o exemplo
async function executarExemplo() {
    try {
        console.log("=== Exemplo de Uso de Formatadores de Tarefa Personalizados ===\n");
        
        // Tarefa de exemplo
        const tarefa = `O aquecimento global é um fenômeno de aumento da temperatura média dos oceanos e da atmosfera da Terra causado por emissões de gases do efeito estufa, oriundos principalmente da queima de combustíveis fósseis, que bloqueiam o escape da radiação solar refletida pela superfície terrestre. Este fenômeno está causando mudanças climáticas significativas, como o derretimento das calotas polares, aumento do nível dos oceanos, eventos climáticos extremos e impactos na biodiversidade. Cientistas alertam que precisamos reduzir drasticamente as emissões de carbono para evitar consequências catastróficas nas próximas décadas.`;
        
        console.log("Tarefa Original:");
        console.log(tarefa);
        console.log("\n");
        
        // Executar a orquestração
        const resposta = await orchestrator.orchestrate(tarefa);
        
        console.log("\n=== Resposta Final ===\n");
        console.log(resposta);
        
    } catch (error) {
        console.error("Erro ao executar exemplo:", error);
    }
}

// Executar o exemplo
executarExemplo();
