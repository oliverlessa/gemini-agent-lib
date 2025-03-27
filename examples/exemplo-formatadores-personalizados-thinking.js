// exemplo-formatadores-personalizados-thinking.js
require('dotenv').config();
const Agent = require('../lib/agent');
const HierarchicalAgentThinkingOrchestrator = require('../lib/hierarchical-agent-thinking-orchestrator');

// Configuração da API
const apiKey = process.env.GEMINI_API_KEY;
const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
const projectId = process.env.GCP_PROJECT_ID;

// Exemplo 1: Agente Resumidor com formatador personalizado
const resumeAgent = new Agent({
    role: "Resumidor",
    objective: "Criar resumos concisos de textos longos",
    // O LLM será configurado pelo orquestrador
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
    // O LLM será configurado pelo orquestrador
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
    // O LLM será configurado pelo orquestrador
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
    // O LLM será configurado pelo orquestrador
    enableGoogleSearch: true
    // Não precisa de formatador personalizado, pois o comportamento para
    // agentes com enableGoogleSearch já está implementado no orquestrador
});

// Criar o orquestrador thinking com os agentes
const thinkingOrchestrator = new HierarchicalAgentThinkingOrchestrator(
    [resumeAgent, translationAgent, analysisAgent, searchAgent],
    {
        apiKey: apiKey,
        useVertexAI: true,
        vertexConfig: {
            credentialsPath: credentialsPath,
            projectId: projectId,
            location: 'us-central1'
        }
    }
);

// Função para executar o exemplo
async function executarExemplo() {
    try {
        console.log("=== Exemplo de Uso de Formatadores de Tarefa Personalizados com Modelo Thinking ===\n");
        
        // Tarefa de exemplo
        const tarefa = `O aquecimento global é um fenômeno de aumento da temperatura média dos oceanos e da atmosfera da Terra causado por emissões de gases do efeito estufa, oriundos principalmente da queima de combustíveis fósseis, que bloqueiam o escape da radiação solar refletida pela superfície terrestre. Este fenômeno está causando mudanças climáticas significativas, como o derretimento das calotas polares, aumento do nível dos oceanos, eventos climáticos extremos e impactos na biodiversidade. Cientistas alertam que precisamos reduzir drasticamente as emissões de carbono para evitar consequências catastróficas nas próximas décadas.`;
        
        console.log("Tarefa Original:");
        console.log(tarefa);
        console.log("\n");
        
        // Executar a orquestração
        const respostaBruta = await thinkingOrchestrator.orchestrate(tarefa);
        
        console.log("\n=== Resposta Final (Bruta) ===\n");
        console.log(respostaBruta);
        
        // Processar a resposta bruta para extrair a resposta final e os passos de raciocínio
        const respostaProcessada = thinkingOrchestrator.processThinkingResponse(respostaBruta);
        
        console.log("\n=== Resposta Final (Processada) ===\n");
        console.log("Resposta Final:", respostaProcessada.finalAnswer);
        
        if (respostaProcessada.thinkingSteps) {
            console.log("\nPassos de Raciocínio:");
            console.log(respostaProcessada.thinkingSteps);
        }
        
    } catch (error) {
        console.error("Erro ao executar exemplo:", error);
    }
}

// Executar o exemplo
executarExemplo();
