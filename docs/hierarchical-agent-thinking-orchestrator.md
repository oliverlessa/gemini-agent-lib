# Hierarchical Agent Thinking Orchestrator

O `HierarchicalAgentThinkingOrchestrator` é uma extensão do `HierarchicalAgentOrchestrator` que utiliza o modelo "thinking" `gemini-2.5-pro-preview-03-25` para orquestrar agentes especialistas de forma mais eficiente.

## Visão Geral

Este orquestrador permite a coordenação de múltiplos agentes especialistas, utilizando o modelo de "pensamento" (thinking) para melhorar a tomada de decisões e a distribuição de tarefas. Ele é especialmente útil para tarefas complexas que requerem diferentes tipos de expertise. O modelo utilizado suporta function calling, permitindo o uso de ferramentas durante o processo de orquestração.

## Características

- Orquestração hierárquica de agentes especialistas
- Utiliza o modelo "thinking" `gemini-2.5-pro-preview-03-25` para melhorar o processo de tomada de decisão
- Suporte para function calling, permitindo o uso de ferramentas
- Suporte para agentes com Google Search habilitado
- Compatibilidade com modelos Gemini e Vertex AI
- Capacidade de distribuir subtarefas específicas para agentes especialistas

## Uso Básico

```javascript
const { 
    ThinkingAgent, 
    Agent, 
    GenerativeAILLM,
    VertexAILLM,
    HierarchicalAgentThinkingOrchestrator 
} = require('gemini-agent-lib');

// Criar instância do LLM para os agentes especialistas
const geminiLLM = new GenerativeAILLM({ 
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "gemini-2.0-flash" 
});

const vertexLLM = new VertexAILLM({
    apiKey: process.env.VERTEX_API_KEY,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    projectId: process.env.VERTEX_PROJECT_ID,
    location: process.env.VERTEX_LOCATION || "us-central1",
    modelName: "gemini-2.0-flash-001",
    mode: "oneshot"
});

// Criar agentes especialistas
const marketResearchAgent = new Agent({
    role: "Agente de Pesquisa de Mercado",
    objective: "Realizar pesquisa de mercado e identificar tendências.",
    context: "Você é um agente de pesquisa de mercado experiente...",
    task: "", // Tarefa definida pelo orquestrador
    llm: vertexLLM,
    enableGoogleSearch: true,
    tools: []
});

const financialAnalystAgent = new Agent({
    role: "Agente de Análise Financeira",
    objective: "Analisar dados financeiros e fornecer insights.",
    context: "Você é um analista financeiro experiente...",
    task: "", // Tarefa definida pelo orquestrador
    llm: geminiLLM,
    tools: []
});

// Array de agentes especialistas
const specialistAgents = [
    marketResearchAgent,
    financialAnalystAgent,
    // Outros agentes especialistas...
];

// Criar o HierarchicalAgentThinkingOrchestrator
const orchestrator = new HierarchicalAgentThinkingOrchestrator(
    specialistAgents, 
    {
        apiKey: process.env.GEMINI_API_KEY,
        useVertexAI: process.env.USE_VERTEX_AI === 'true',
        vertexConfig: {
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.GOOGLE_CLOUD_PROJECT,
            location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1'
        }
    }
);

// Executar a orquestração com uma tarefa principal
const mainTask = "Investigar o potencial de mercado para um novo produto...";
const result = await orchestrator.orchestrate(mainTask);
console.log(result);
```

## Configuração

### Parâmetros do Construtor

O construtor do `HierarchicalAgentThinkingOrchestrator` aceita dois parâmetros:

1. `specialistAgents`: Array de agentes especialistas que serão orquestrados
2. `config`: Objeto de configuração com as seguintes propriedades:
   - `apiKey`: Chave de API do Gemini
   - `useVertexAI`: Booleano indicando se deve usar Vertex AI
   - `vertexConfig`: Configurações para Vertex AI (se useVertexAI for true)
      - `credentialsPath`: Caminho para o arquivo de credenciais
      - `projectId`: ID do projeto Google Cloud
      - `location`: Localização do Vertex AI (padrão: 'us-central1')
   - `includeThinkingSteps` (opcional, booleano): Define se o resultado final deve incluir os passos de raciocínio do LLM. Padrão: `false` (retorna apenas a resposta final processada). Se `true`, retorna a resposta bruta completa do LLM, incluindo o raciocínio.

## Método Principal

### orchestrate(mainTask)

Executa a orquestração dos agentes especialistas para resolver uma tarefa principal.

- **Parâmetros**:
  - `mainTask` (string): A tarefa principal a ser resolvida
 - **Retorno**:
   - Promise que resolve para uma string contendo:
     - A resposta final processada (sem os passos de raciocínio), por padrão (`includeThinkingSteps: false`).
     - A resposta bruta completa do LLM (incluindo os passos de raciocínio), se `includeThinkingSteps: true`.

## Casos de Uso

O `HierarchicalAgentThinkingOrchestrator` é ideal para cenários como:

- Análise de mercado multidisciplinar
- Pesquisa e desenvolvimento de produtos
- Análise de dados complexos que requerem diferentes especialidades
- Geração de relatórios abrangentes com múltiplas perspectivas
- Tarefas que se beneficiam de pesquisas na web em tempo real (com agentes habilitados para Google Search)

## Diferenças em Relação ao HierarchicalAgentOrchestrator

O `HierarchicalAgentThinkingOrchestrator` se diferencia do `HierarchicalAgentOrchestrator` padrão por:

1. Utilizar o modelo "thinking" `gemini-2.5-pro-preview-03-25` para melhorar o processo de tomada de decisão
2. Suportar function calling, permitindo o uso de ferramentas durante a orquestração
3. Oferecer melhor integração com agentes que possuem Google Search habilitado
4. Proporcionar uma distribuição de tarefas mais inteligente entre os agentes especialistas
5. Melhorar a síntese dos resultados obtidos dos diferentes agentes

## Exemplo Completo

Para um exemplo completo de implementação, consulte o arquivo de teste [test-hierarchical-agent-thinking-orchestrator.js](../test/test-hierarchical-agent-thinking-orchestrator.js).

## Uso como Ferramenta em Outros Agentes

O `HierarchicalAgentThinkingOrchestrator` pode ser utilizado como uma ferramenta por outros agentes, como `ChatAgent` e `ThinkingAgent`. Isso permite que um agente principal delegue tarefas complexas para o orquestrador, que por sua vez coordenará múltiplos agentes especialistas.

Para utilizar o `HierarchicalAgentThinkingOrchestrator` como uma ferramenta:

1. Registre o orquestrador no `OrchestratorRegistry`
2. Use a função `createOrchestratorTool` para transformá-lo em uma ferramenta
3. Adicione a ferramenta ao agente principal

```javascript
// Registrar o orquestrador
const orchestratorRegistry = new OrchestratorRegistry({
    'hierarchical_thinking': {
        type: 'HierarchicalAgentThinkingOrchestrator',
        agents: [specialistAgent1, specialistAgent2],
        llmConfig: llmConfig
    }
});

// Criar a ferramenta
const thinkingOrchestratorTool = createOrchestratorTool(
    'hierarchical_thinking',
    'solve_complex_problem',
    'Resolve problemas complexos utilizando múltiplos agentes especialistas coordenados por um orquestrador hierárquico com capacidade de raciocínio passo a passo.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            problem_description: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "Descrição detalhada do problema a ser resolvido." 
            }
        },
        required: ["problem_description"]
    },
    orchestratorRegistry
);

// Adicionar a ferramenta ao agente principal
chatAgent.tools = [thinkingOrchestratorTool];
```

Para mais detalhes sobre como utilizar orquestradores como ferramentas, consulte a [documentação específica](./orchestrator-tool-factory.md).
