# GeminiAgentLib

Uma biblioteca Node.js para criar e orquestrar agentes de IA usando os modelos Gemini do Google.

## Instalação

### A paritir do repositório NPM:

```bash
npm install gemini-agent-lib
```

### A partir de um diretório/pasta local:

```bash
npm install /caminho/gemini-agent-lib --install-links
```

## Configuração Essencial (.env)

Esta biblioteca requer um arquivo `.env` na raiz do projeto para funcionar corretamente. Este arquivo contém as chaves de API e configurações necessárias para acessar os serviços do Google AI e Vertex AI.

### Configuração Rápida

1. Instale o pacote dotenv:
   ```bash
   npm install dotenv
   ```

2. Crie um arquivo `.env` na raiz do seu projeto
3. Adicione suas variáveis de ambiente (no mínimo a chave do Gemini):
   ```
   GEMINI_API_KEY=sua_chave_api_gemini
   ```
4. Carregue o dotenv no início do seu aplicativo:
   ```javascript
   require('dotenv').config();
   ```
5. Adicione o arquivo `.env` ao seu `.gitignore`

### Exemplo Completo do .env

```
# Chave de API do Gemini
GEMINI_API_KEY=sua_chave_api_gemini

# Configurações do Google Cloud e Vertex AI
VERTEX_API_KEY=sua_chave_api_vertex
GOOGLE_CLOUD_PROJECT_ID=seu_id_projeto_gcp
VERTEX_PROJECT_ID=seu_id_projeto_vertex
VERTEX_LOCATION=regiao_vertex
VERTEX_CREDENTIALS_PATH=./caminho_para_arquivo_credenciais.json
GOOGLE_APPLICATION_CREDENTIALS=./caminho_para_arquivo_credenciais.json
```

**⚠️ IMPORTANTE**: O arquivo `.env` é essencial para o funcionamento da biblioteca. Sem ele, você não conseguirá se conectar aos modelos de IA.

Para uma explicação detalhada de cada variável e como obtê-las, consulte a [documentação de configuração](./docs/configuracao.md).

## Uso Básico

```javascript
const { Agent, GenerativeAILLM } = require('gemini-agent-lib');

// Configurar o LLM
const llm = new GenerativeAILLM({
    apiKey: process.env.GEMINI_API_KEY,
    modelName: "gemini-2.0-flash-001"
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
- **AutoGenOrchestrator**: Orquestra autonomamente múltiplos agentes para resolver tarefas complexas (requer Vertex AI)
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

## Licença

MIT
