const path = require('path'); // Importa o módulo path
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); // Especifica o caminho para .env na raiz
console.log('DEBUG: GOOGLE_CLOUD_PROJECT_ID from env:', process.env.GOOGLE_CLOUD_PROJECT_ID); // Adiciona log para depuração
console.log('DEBUG: VERTEX_PROJECT_ID from env:', process.env.VERTEX_PROJECT_ID); // Adiciona log para depuração

// Importações necessárias
const { ThinkingAgent, VertexAILLM, FunctionDeclarationSchemaType, Agent } = require('..'); // Importa ThinkingAgent
const OrchestratorRegistry = require('../lib/orchestrator-registry');
const { createOrchestratorTool } = require('../lib/orchestrator-tool-factory');

// --- Configuração de Exemplo (Reutilizada do exemplo do ChatAgent) ---

// 1. Configurar e popular o OrchestratorRegistry
const exampleLlmConfig = {
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001', // Modelo padrão, ThinkingAgent usará o seu específico
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.VERTEX_PROJECT_ID,
    location: process.env.VERTEX_LOCATION || 'us-central1',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
};

// Agentes de exemplo para os orquestradores (com LLM configurado)
// Criamos uma instância de LLM para cada agente interno (pode ser diferente do ThinkingAgent principal)
const dummyLlm1 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm2 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm3 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm4 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});

const dummyAgent1 = new Agent({
    role: 'Analisador de Dados',
    objective: 'Analisar dados brutos',
    llm: dummyLlm1,
    task: 'Analisar dados sobre energia solar residencial'
});
const dummyAgent2 = new Agent({
    role: 'Gerador de Relatórios',
    objective: 'Gerar relatório a partir da análise',
    llm: dummyLlm2,
    task: 'Gerar relatório sobre tendências de energia solar'
});
const dummySupportAgent1 = new Agent({
    role: 'Suporte Nível 1',
    objective: 'Resolver problemas básicos',
    llm: dummyLlm3,
    task: 'Resolver problemas básicos de suporte'
});
const dummySupportAgent2 = new Agent({
    role: 'Suporte Nível 2',
    objective: 'Resolver problemas complexos',
    llm: dummyLlm4,
    task: 'Resolver problemas complexos de suporte'
});

const orchestratorRegistry = new OrchestratorRegistry({
    'sequential_market_research': {
        type: 'SequentialAgentChain',
        agents: [dummyAgent1, dummyAgent2]
    },
    'hierarchical_support_escalation': {
         type: 'HierarchicalAgentOrchestrator',
         agents: [dummySupportAgent1, dummySupportAgent2],
         llmConfig: exampleLlmConfig // LLM para o orquestrador hierárquico
    },
    'autogen_code_generator': {
        type: 'AutoGenOrchestrator',
        llmConfig: exampleLlmConfig // LLM para o AutoGen
    }
});

// 2. Criar as ferramentas usando a fábrica (Reutilizadas do exemplo do ChatAgent)

const marketResearchTool = createOrchestratorTool(
    'sequential_market_research',
    'perform_market_research',
    'Executa um fluxo completo de pesquisa de mercado sequencial (coleta de dados, análise, relatório). Use para solicitações abrangentes de pesquisa de mercado.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            research_topic: { type: FunctionDeclarationSchemaType.STRING, description: "O tópico principal da pesquisa de mercado." }
        },
        required: ["research_topic"]
    },
    orchestratorRegistry
);

const escalationTool = createOrchestratorTool(
    'hierarchical_support_escalation',
    'escalate_complex_support_issue',
    'Inicia um processo hierárquico com múltiplos especialistas para resolver um problema de suporte técnico complexo e não resolvido.',
    {
         type: FunctionDeclarationSchemaType.OBJECT,
         properties: {
             issue_description: { type: FunctionDeclarationSchemaType.STRING, description: "Descrição detalhada do problema de suporte." },
             user_id: { type: FunctionDeclarationSchemaType.STRING, description: "ID do usuário afetado." }
         },
         required: ["issue_description", "user_id"]
    },
    orchestratorRegistry
);

const codeGenTool = createOrchestratorTool(
    'autogen_code_generator',
    'generate_code_snippet',
    'Usa um sistema multi-agente (AutoGen) para gerar um trecho de código com base em uma especificação.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            specification: { type: FunctionDeclarationSchemaType.STRING, description: "Descrição detalhada do código a ser gerado (linguagem, funcionalidade, etc.)." }
        },
        required: ["specification"]
    },
    orchestratorRegistry
);


// 3. Instanciar o ThinkingAgent com as ferramentas e contexto adaptado

// O ThinkingAgent usará seu próprio LLM configurado internamente (gemini-2.5-pro-preview-03-25)
// Passamos as configurações gerais que ele pode precisar (apiKey, vertexConfig)
const thinkingAgentWithOrchestratorTools = new ThinkingAgent({
    // Não passamos 'llm' aqui, o ThinkingAgent cria o seu próprio
    apiKey: process.env.GEMINI_API_KEY, // Necessário se não usar Vertex
    useVertexAI: true, // Assumindo Vertex AI
    vertexConfig: { // Passa as configs do Vertex
        projectId: exampleLlmConfig.projectId,
        location: exampleLlmConfig.location,
        credentialsPath: exampleLlmConfig.credentialsPath
    },
    role: "Analista Estratégico",
    objective: "Analisar solicitações, raciocinar sobre a melhor abordagem e executar tarefas complexas, delegando para orquestradores quando necessário.",
    // Contexto adaptado para o ThinkingAgent
    context: `Você é um Analista Estratégico. Sua função é analisar cuidadosamente a solicitação do usuário, raciocinar passo a passo sobre a melhor forma de atendê-la e, se necessário, utilizar ferramentas de orquestração para tarefas complexas.
    Seu processo de pensamento deve ser explícito.

    Ferramentas de Orquestração Disponíveis:
    - **perform_market_research**: Para pesquisas de mercado detalhadas. Entrada: 'research_topic'.
    - **escalate_complex_support_issue**: APENAS para problemas de suporte técnico complexos não resolvidos. Entradas: 'issue_description', 'user_id'.
    - **generate_code_snippet**: Para gerar trechos de código a partir de uma especificação. Entrada: 'specification'.

    Ao receber uma tarefa:
    1.  Analise a solicitação.
    2.  Raciocine passo a passo sobre como resolvê-la.
    3.  Determine se uma das ferramentas de orquestração é a mais adequada.
    4.  Se sim, explique por que escolheu a ferramenta e quais parâmetros usará. Em seguida, invoque a ferramenta.
    5.  Se não, explique por que não usará uma ferramenta e como procederá.
    6.  Apresente a resposta final ou o resultado da ferramenta.`,
    tools: [
        marketResearchTool,
        escalationTool,
        codeGenTool
    ],
    verbose: true // Habilita logs detalhados para depuração
    // O ThinkingAgent não gerencia memória de conversação como o ChatAgent
});

// --- Execução de Exemplo ---

async function runExample() {
    console.log("Iniciando exemplo de ThinkingAgent com ferramentas de orquestrador...");

    // Simula uma tarefa para o ThinkingAgent
    const taskInput = "Preciso de uma análise de mercado sobre as últimas inovações em baterias de estado sólido para veículos elétricos.";
    // const taskInput = "Um cliente ('user456') reportou um erro crítico no módulo de pagamento que impede qualquer transação. Nossas equipes iniciais não conseguiram resolver.";
    // const taskInput = "Gere um script Python que use a biblioteca 'requests' para fazer uma requisição GET a uma API e imprimir a resposta JSON.";
    // const taskInput = "Qual a capital da França?"; // Tarefa simples

    console.log(`\nTarefa para o Agente: ${taskInput}`);

    // Define a tarefa diretamente na propriedade task do agente
    thinkingAgentWithOrchestratorTools.task = taskInput;

    try {
        // IMPORTANTE: A execução real dos orquestradores neste exemplo provavelmente falhará
        //             se as configurações de LLM e agentes em `orchestratorRegistry`
        //             não forem válidas e completas. O objetivo é testar a chamada da ferramenta.

        // Executa a tarefa com o ThinkingAgent
        const rawResponse = await thinkingAgentWithOrchestratorTools.executeTask(); // Retorna a resposta bruta

        console.log("\n--- Resposta Bruta do ThinkingAgent ---");
        console.log(rawResponse);

        // Processa a resposta para tentar extrair estrutura (se houver)
        const processedResponse = thinkingAgentWithOrchestratorTools.processThinkingResponse(rawResponse);

        console.log("\n--- Resposta Processada do ThinkingAgent ---");
        // Verifica se a resposta processada é um objeto com 'finalAnswer'
        if (typeof processedResponse === 'object' && processedResponse !== null && processedResponse.finalAnswer) {
            console.log("Raciocínio:\n", processedResponse.thinkingSteps || "(Não extraído)");
            console.log("\nResposta Final:\n", processedResponse.finalAnswer);
        } else {
            // Se não for o formato esperado, imprime o que foi retornado
            console.log(processedResponse);
        }

    } catch (error) {
        console.error("\nErro durante a execução do exemplo:", error);
    }
}

// Verifica se o script está sendo executado diretamente
if (require.main === module) {
    runExample();
}

module.exports = { thinkingAgentWithOrchestratorTools, orchestratorRegistry }; // Exporta para possíveis testes
