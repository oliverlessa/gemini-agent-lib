const path = require('path'); // Importa o módulo path
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); // Especifica o caminho para .env na raiz
console.log('DEBUG: GOOGLE_CLOUD_PROJECT_ID from env:', process.env.GOOGLE_CLOUD_PROJECT_ID); // Adiciona log para depuração
console.log('DEBUG: VERTEX_PROJECT_ID from env:', process.env.VERTEX_PROJECT_ID); // Adiciona log para depuração
// Importações necessárias
const { ChatAgent, VertexAILLM, FunctionDeclarationSchemaType, Agent } = require('..'); // Importa do index.js na raiz
const OrchestratorRegistry = require('../lib/orchestrator-registry');
const { createOrchestratorTool } = require('../lib/orchestrator-tool-factory');

// --- Configuração de Exemplo ---

// 1. Configurar e popular o OrchestratorRegistry
//    (Estas são configurações de exemplo. Em um cenário real, você precisaria
//     de configurações de LLM válidas e definições de agentes completas)

// Configuração de LLM de exemplo (lendo projectId do .env)
const exampleLlmConfig = {
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001', // Modelo (pode vir do .env também)
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.VERTEX_PROJECT_ID, // Lê o Project ID do .env
    location: process.env.VERTEX_LOCATION || 'us-central1', // Lê a localização do .env
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS // Lê o caminho das credenciais do .env
};

// Agentes de exemplo para os orquestradores (com LLM configurado)
// Criamos uma instância de LLM para cada agente
const dummyLlm1 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm2 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm3 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm4 = new VertexAILLM({...exampleLlmConfig, mode: 'oneshot'});

// Agora criamos os agentes com os LLMs configurados
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
        // Em um caso real, instancie ou configure agentes reais aqui
        agents: [dummyAgent1, dummyAgent2]
    },
    'hierarchical_support_escalation': {
         type: 'HierarchicalAgentOrchestrator',
         // Em um caso real, instancie ou configure agentes e LLM reais aqui
         agents: [dummySupportAgent1, dummySupportAgent2],
         llmConfig: exampleLlmConfig // LLM para o orquestrador hierárquico
    },
    'autogen_code_generator': {
        type: 'AutoGenOrchestrator',
        // Configuração específica do AutoGenOrchestrator
        llmConfig: exampleLlmConfig // LLM para o AutoGen
        // Outras configs do AutoGen podem ser necessárias aqui
    }
});

// 2. Criar as ferramentas usando a fábrica

const marketResearchTool = createOrchestratorTool(
    'sequential_market_research',              // Nome no registry
    'perform_market_research',                 // Nome da ferramenta para o LLM
    'Executa um fluxo completo de pesquisa de mercado sequencial (coleta de dados, análise, relatório). Use para solicitações abrangentes de pesquisa de mercado.', // Descrição para o LLM
    {                                          // Esquema de parâmetros de entrada
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            research_topic: { type: FunctionDeclarationSchemaType.STRING, description: "O tópico principal da pesquisa de mercado." }
        },
        required: ["research_topic"]
    },
    orchestratorRegistry                       // Instância do registry
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


// 3. Instanciar o Agente (ex: ChatAgent) com as ferramentas e contexto adaptado

// LLM para o ChatAgent (substitua por uma instância real)
// Certifique-se de que este LLM esteja configurado para o modo Chat e Function Calling
const chatLlm = new VertexAILLM(exampleLlmConfig);

const chatAgentWithOrchestratorTools = new ChatAgent({
    llm: chatLlm,
    role: "Coordenador de Tarefas Complexas",
    objective: "Responder usuários e iniciar fluxos de trabalho complexos usando as ferramentas de orquestração disponíveis quando apropriado.",
    // Passo 3.4: Adaptar o contexto
    context: `Você é um Coordenador de Tarefas Complexas. Sua função é interagir com o usuário e decidir a melhor forma de atender às solicitações.
    Para tarefas simples, responda diretamente.
    Para tarefas que exigem múltiplos passos coordenados ou expertise específica, utilize uma das seguintes ferramentas de orquestração:

    - **perform_market_research**: Use esta ferramenta para realizar pesquisas de mercado detalhadas e abrangentes. Forneça o 'research_topic' como entrada. Exemplo de uso: "Realize uma pesquisa de mercado sobre veículos elétricos."
    - **escalate_complex_support_issue**: Use esta ferramenta APENAS para problemas de suporte técnico muito complexos que não puderam ser resolvidos por meios normais. Forneça 'issue_description' e 'user_id'. Exemplo de uso: "Preciso escalar um problema de login persistente para o usuário 'user123'."
    - **generate_code_snippet**: Use esta ferramenta para gerar trechos de código com base em uma especificação detalhada. Forneça a 'specification'. Exemplo de uso: "Gere um snippet Python para ler um arquivo CSV usando pandas."

    Analise cuidadosamente a solicitação do usuário para determinar se uma ferramenta de orquestração é necessária e qual delas é a mais adequada. Se não tiver certeza, peça mais detalhes ao usuário.`,
    tools: [
        marketResearchTool, // Adiciona a ferramenta de pesquisa de mercado
        escalationTool,     // Adiciona a ferramenta de escalonamento
        codeGenTool         // Adiciona a ferramenta de geração de código
        // ... outras ferramentas que o ChatAgent possa ter ...
    ],
    verbose: true // Habilita logs detalhados para depuração
    // ... outras configurações do ChatAgent (memory, etc.) ...
});

// --- Execução de Exemplo ---

async function runExample() {
    console.log("Iniciando exemplo de ChatAgent com ferramentas de orquestrador...");

    // Simula uma interação do usuário que poderia disparar uma ferramenta
    const userInput = "Preciso de uma pesquisa de mercado completa sobre as tendências de energia solar residencial.";
    // const userInput = "Estou com um problema muito estranho no login da conta 'testuser55', já tentei de tudo.";
    // const userInput = "Gere uma função Javascript simples para calcular o fatorial de um número.";
    // const userInput = "Olá, como você está?"; // Pergunta simples

    console.log(`\nUsuário: ${userInput}`);

    try {
        // IMPORTANTE: A execução real dos orquestradores neste exemplo provavelmente falhará
        //             se as configurações de LLM e agentes em `orchestratorRegistry`
        //             não forem válidas e completas. O objetivo aqui é demonstrar a
        //             configuração e a chamada da ferramenta pelo ChatAgent.
        const response = await chatAgentWithOrchestratorTools.processUserMessage(userInput);
        console.log(`\nAgente: ${response.text}`);

        // Você pode adicionar mais interações aqui
        // const response2 = await chatAgentWithOrchestratorTools.processUserMessage("Obrigado!");
        // console.log(`\nAgente: ${response2.text}`);

    } catch (error) {
        console.error("\nErro durante a execução do exemplo:", error);
    }
}

// Verifica se o script está sendo executado diretamente
if (require.main === module) {
    runExample();
}

module.exports = { chatAgentWithOrchestratorTools, orchestratorRegistry }; // Exporta para possíveis testes
