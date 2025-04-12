const path = require('path'); // Importa o módulo path
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') }); // Especifica o caminho para .env na raiz
console.log('DEBUG: GEMINI_API_KEY loaded:', !!process.env.GEMINI_API_KEY); // Adiciona log para depuração da API Key

// Importações necessárias - Trocando VertexAILLM por GenerativeAILLM
const { ChatAgent, GenerativeAILLM, FunctionDeclarationSchemaType, Agent } = require('..'); // Importa GenerativeAILLM
const OrchestratorRegistry = require('../lib/orchestrator-registry');
const { createOrchestratorTool } = require('../lib/orchestrator-tool-factory');

// --- Configuração de Exemplo ---

// 1. Configurar e popular o OrchestratorRegistry

// Configuração de LLM de exemplo usando GenerativeAILLM
const exampleLlmConfig = {
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001', // Modelo Gemini
    apiKey: process.env.GEMINI_API_KEY, // API Key do Gemini
    // projectId, location, credentialsPath não são necessários para GenerativeAILLM
};

// Verifica se a API Key foi carregada
if (!exampleLlmConfig.apiKey) {
    throw new Error("A variável de ambiente GEMINI_API_KEY não está definida. Por favor, defina-a no seu arquivo .env na raiz do projeto.");
}

// Agentes de exemplo para os orquestradores (com LLM GenerativeAILLM configurado)
// Criamos uma instância de LLM para cada agente
const dummyLlm1 = new GenerativeAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm2 = new GenerativeAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm3 = new GenerativeAILLM({...exampleLlmConfig, mode: 'oneshot'});
const dummyLlm4 = new GenerativeAILLM({...exampleLlmConfig, mode: 'oneshot'});

// Agora criamos os agentes com os LLMs configurados
const dummyAgent1 = new Agent({
    role: 'Analisador de Dados (Gemini)',
    objective: 'Analisar dados brutos usando Gemini',
    llm: dummyLlm1,
    task: 'Analisar dados sobre energia solar residencial'
});
const dummyAgent2 = new Agent({
    role: 'Gerador de Relatórios (Gemini)',
    objective: 'Gerar relatório a partir da análise usando Gemini',
    llm: dummyLlm2,
    task: 'Gerar relatório sobre tendências de energia solar'
});
const dummySupportAgent1 = new Agent({
    role: 'Suporte Nível 1 (Gemini)',
    objective: 'Resolver problemas básicos usando Gemini',
    llm: dummyLlm3,
    task: 'Resolver problemas básicos de suporte'
});
const dummySupportAgent2 = new Agent({
    role: 'Suporte Nível 2 (Gemini)',
    objective: 'Resolver problemas complexos usando Gemini',
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
         llmConfig: exampleLlmConfig // LLM GenerativeAILLM para o orquestrador hierárquico
    },
    'autogen_code_generator': {
        type: 'AutoGenOrchestrator',
        llmConfig: exampleLlmConfig // LLM GenerativeAILLM para o AutoGen
        // Outras configs do AutoGen podem ser necessárias aqui
    }
});

// 2. Criar as ferramentas usando a fábrica (a lógica permanece a mesma)

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

// LLM GenerativeAILLM para o ChatAgent
const chatLlm = new GenerativeAILLM({...exampleLlmConfig, mode: 'chat'}); // Modo chat para o agente principal

const chatAgentWithOrchestratorTools = new ChatAgent({
    llm: chatLlm,
    role: "Coordenador de Tarefas Complexas (Gemini)",
    objective: "Responder usuários e iniciar fluxos de trabalho complexos usando as ferramentas de orquestração disponíveis quando apropriado, utilizando Gemini.",
    context: `Você é um Coordenador de Tarefas Complexas baseado no Gemini. Sua função é interagir com o usuário e decidir a melhor forma de atender às solicitações.
    Para tarefas simples, responda diretamente.
    Para tarefas que exigem múltiplos passos coordenados ou expertise específica, utilize uma das seguintes ferramentas de orquestração:

    - **perform_market_research**: Use esta ferramenta para realizar pesquisas de mercado detalhadas e abrangentes. Forneça o 'research_topic' como entrada. Exemplo de uso: "Realize uma pesquisa de mercado sobre veículos elétricos."
    - **escalate_complex_support_issue**: Use esta ferramenta APENAS para problemas de suporte técnico muito complexos que não puderam ser resolvidos por meios normais. Forneça 'issue_description' e 'user_id'. Exemplo de uso: "Preciso escalar um problema de login persistente para o usuário 'user123'."
    - **generate_code_snippet**: Use esta ferramenta para gerar trechos de código com base em uma especificação detalhada. Forneça a 'specification'. Exemplo de uso: "Gere um snippet Python para ler um arquivo CSV usando pandas."

    Analise cuidadosamente a solicitação do usuário para determinar se uma ferramenta de orquestração é necessária e qual delas é a mais adequada. Se não tiver certeza, peça mais detalhes ao usuário.`,
    tools: [
        marketResearchTool,
        escalationTool,
        codeGenTool
    ],
    verbose: true // Habilita logs detalhados para depuração
});

// --- Execução de Exemplo ---

async function runExample() {
    console.log("Iniciando exemplo de ChatAgent com ferramentas de orquestrador (Generative AI)...");

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
        //             configuração e a chamada da ferramenta pelo ChatAgent usando GenerativeAILLM.
        const response = await chatAgentWithOrchestratorTools.processUserMessage(userInput);
        console.log(`\nAgente (Gemini): ${response.text}`);

    } catch (error) {
        console.error("\nErro durante a execução do exemplo (Generative AI):", error);
    }
}

// Verifica se o script está sendo executado diretamente
if (require.main === module) {
    runExample();
}

module.exports = { chatAgentWithOrchestratorTools, orchestratorRegistry }; // Exporta para possíveis testes
