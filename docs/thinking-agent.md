# ThinkingAgent

## Visão Geral

`ThinkingAgent` é uma classe especializada que herda da classe `Agent` e é configurada especificamente para utilizar o modelo `gemini-2.5-pro-preview-03-25`. Este modelo é projetado para fornecer respostas com raciocínio passo a passo, tornando-o ideal para tarefas que exigem pensamento estruturado e explicações detalhadas. Além disso, suporta function calling, permitindo o uso de ferramentas.

## Características

- **Modelo Especializado**: Utiliza o modelo `gemini-2.5-pro-preview-03-25` que é otimizado para raciocínio passo a passo e suporta function calling.
- **Processamento Adaptativo**: Detecta automaticamente diferentes formatos de resposta (JSON, texto com marcadores, etc.).
- **Flexibilidade de API**: Suporta tanto a API Gemini direta quanto a Vertex AI do Google Cloud.
- **Integração com Orquestração**: Pode ser usado como um agente orquestrador em uma arquitetura hierárquica.

## Instalação

A classe `ThinkingAgent` faz parte da biblioteca `gemini-chain-lib`. Não é necessária instalação adicional além das dependências da biblioteca principal.

## Uso Básico

```javascript
const { ThinkingAgent } = require('./gemini-chain-lib');

// Criar uma instância do ThinkingAgent
const thinkingAgent = new ThinkingAgent({
    role: "Agente Pensante",
    objective: "Resolver problemas com raciocínio passo a passo",
    context: "Você é um agente especializado em resolver problemas complexos. Explique seu raciocínio de forma clara e estruturada.",
    task: "Quanto é 27 x 34?",
    apiKey: process.env.GEMINI_API_KEY
});

// Executar a tarefa
async function runTask() {
    const response = await thinkingAgent.executeTask();
    console.log(response);
}

runTask();
```

## Uso com Vertex AI

```javascript
const { ThinkingAgent } = require('./gemini-chain-lib');

// Criar uma instância do ThinkingAgent com Vertex AI
const thinkingAgent = new ThinkingAgent({
    role: "Agente Pensante",
    objective: "Resolver problemas com raciocínio passo a passo",
    context: "Você é um agente especializado em resolver problemas complexos. Explique seu raciocínio de forma clara e estruturada.",
    task: "Quanto é 27 x 34?",
    useVertexAI: true,
    vertexConfig: {
        projectId: process.env.VERTEX_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        location: process.env.VERTEX_LOCATION || 'us-central1'
    }
});

// Executar a tarefa
async function runTask() {
    const response = await thinkingAgent.executeTask();
    console.log(response);
}

runTask();
```

## Uso como Orquestrador

O `ThinkingAgent` pode ser usado como um agente orquestrador que coordena outros agentes especialistas:

```javascript
const { ThinkingAgent, Agent, GenerativeAILLM } = require('./gemini-chain-lib');

// Criar agentes especialistas
const specialistAgent1 = new Agent({
    role: "Especialista 1",
    // ... outras configurações
});

const specialistAgent2 = new Agent({
    role: "Especialista 2",
    // ... outras configurações
});

// Criar o ThinkingAgent como orquestrador
const orchestratorAgent = new ThinkingAgent({
    role: "Orquestrador",
    objective: "Coordenar agentes especialistas",
    context: `Você é um agente orquestrador que coordena especialistas.
             Você tem acesso aos seguintes agentes:
             1. Especialista 1: ...
             2. Especialista 2: ...`,
    task: "Resolver um problema complexo",
    apiKey: process.env.GEMINI_API_KEY
});

// Implementar a lógica de orquestração
// ...
```

## Uso com Orquestradores como Ferramentas

O `ThinkingAgent` também pode utilizar orquestradores (como `SequentialAgentChain`, `HierarchicalAgentOrchestrator` e `AutoGenOrchestrator`) como ferramentas, permitindo delegar tarefas complexas para sistemas de orquestração especializados.

```javascript
// Importações necessárias
const { createOrchestratorTool } = require('gemini-agent-lib/lib/orchestrator-tool-factory');
const OrchestratorRegistry = require('gemini-agent-lib/lib/orchestrator-registry');

// Configurar o OrchestratorRegistry
const orchestratorRegistry = new OrchestratorRegistry({
    'sequential_market_research': {
        type: 'SequentialAgentChain',
        agents: [marketAnalystAgent, reportGeneratorAgent]
    }
});

// Criar a ferramenta de orquestração
const marketResearchTool = createOrchestratorTool(
    'sequential_market_research',
    'perform_market_research',
    'Executa uma pesquisa de mercado completa sobre um tópico específico.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            research_topic: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "O tópico principal da pesquisa de mercado." 
            }
        },
        required: ["research_topic"]
    },
    orchestratorRegistry
);

// Criar o ThinkingAgent com a ferramenta de orquestração
const thinkingAgent = new ThinkingAgent({
    role: "Analista Estratégico",
    objective: "Analisar solicitações e executar tarefas complexas, delegando quando necessário",
    context: `Você é um Analista Estratégico. Sua função é analisar cuidadosamente a solicitação do usuário...`,
    tools: [marketResearchTool],
    apiKey: process.env.GEMINI_API_KEY,
    useVertexAI: true
});

// Definir a tarefa e executar
thinkingAgent.task = "Preciso de uma análise de mercado sobre baterias de estado sólido para veículos elétricos.";
const response = await thinkingAgent.executeTask();
```

Para mais detalhes sobre como utilizar orquestradores como ferramentas, consulte a [documentação específica](./orchestrator-tool-factory.md).

## Formato de Resposta

O método `processThinkingResponse()` tenta detectar diferentes formatos de resposta:

1. **JSON Estruturado**: Se a resposta for um JSON válido, procura por campos como `final_answer`, `thinking_steps`, etc.
2. **Texto com Marcadores**: Procura por seções delimitadas por marcadores como "Thinking:", "Answer:", etc.
3. **Texto Livre**: Se nenhum formato específico for detectado, retorna a resposta bruta.

A resposta processada pode ter a seguinte estrutura:

```javascript
{
    finalAnswer: "A resposta final para a pergunta",
    thinkingSteps: "O raciocínio passo a passo que levou à resposta",
    rawResponse: "A resposta bruta completa do modelo"
}
```

## Testes

Dois arquivos de teste estão disponíveis para demonstrar o uso do `ThinkingAgent`:

1. **test-thinking-agent.js**: Testa o uso básico do `ThinkingAgent` com diferentes tipos de tarefas.
2. **test-thinking-agent-orchestration.js**: Demonstra como usar o `ThinkingAgent` como um orquestrador que coordena outros agentes especialistas.

Para executar os testes:

```bash
node test-thinking-agent.js
node test-thinking-agent-orchestration.js
```

## Limitações e Considerações

- O modelo `gemini-2.5-pro-preview-03-25` é uma versão preview e seu formato de resposta pode mudar.
- Diferente do modelo anterior, este modelo suporta function calling, permitindo o uso de ferramentas.
- A detecção de formato é adaptativa e pode precisar ser refinada com base nos resultados dos testes.
- Para usar o `ThinkingAgent` com Vertex AI, é necessário ter as credenciais e configurações apropriadas do Google Cloud.

## Próximos Passos

- Refinar o método `processThinkingResponse()` com base nos resultados dos testes.
- Implementar uma integração mais profunda com o `HierarchicalAgentOrchestrator`.
- Adicionar suporte para mais formatos de resposta conforme necessário.
