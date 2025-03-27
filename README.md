# GeminiAgentLib

Uma biblioteca Node.js para criar e orquestrar agentes de IA usando os modelos Gemini do Google.

## Instalação

```bash
npm install gemini-agent-lib
```

## Uso Básico

```javascript
const { Agent, GenerativeAILLM } = require('gemini-agent-lib');

// Configurar o LLM
const llm = new GenerativeAILLM({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "gemini-1.0-pro"
});

// Criar um agente
const agent = new Agent({
    role: "Assistente",
    objective: "Ajudar o usuário",
    context: "Você é um assistente útil",
    task: "Responda à pergunta do usuário",
    llm: llm
});

// Executar o agente
const resposta = await agent.executeTask();
console.log(resposta);
```

## Componentes Principais

- **Agent**: Agente básico para executar tarefas
- **ChatAgent**: Agente com capacidade de manter conversas
- **ThinkingAgent**: Agente com capacidade de "pensar" antes de responder
- **SequentialAgentChain**: Executa uma cadeia de agentes em sequência
- **HierarchicalAgentOrchestrator**: Orquestra múltiplos agentes de forma hierárquica
- **ToolBuilder**: Facilita a criação de ferramentas para os agentes

## Documentação

Para documentação detalhada sobre cada componente, consulte a pasta [docs](./docs):

- [Chat Agent](./docs/chat-agent.md)
- [Thinking Agent](./docs/thinking-agent.md)
- [Auto Gen Orchestrator](./docs/auto-gen-orchestrator.md)
- [Vertex AI Search Retriever](./docs/vertex-ai-search-retriever.md)
- [Tool Factory](./docs/tool-factory.md)
- [Modo Chat Vertex AI](./docs/modo-chat-vertex-ai.md)
- [Formatadores Personalizados](./docs/formatadores-personalizados.md)
- [Dependências de Agentes](./docs/dependencias-agentes.md)

## Exemplos

Veja exemplos de uso na pasta [examples](./examples).

## Testes

Para executar os testes:

```bash
npm test          # Executa o teste principal
npm run test:all  # Executa todos os testes
```

## Licença

MIT
