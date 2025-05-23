# GeminiAgentLib

Uma biblioteca Node.js flexível para construir, gerenciar e orquestrar agentes de Inteligência Artificial. Integre facilmente os modelos Gemini do Google (incluindo Generative AI e Vertex AI) em suas aplicações, criando desde assistentes simples até sistemas multi-agentes complexos com memória e ferramentas personalizadas.

## Instalação

### A paritir do repositório NPM:

```bash
npm install @oliverlessa/gemini-agent-lib
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
GOOGLE_APPLICATION_CREDENTIALS=./caminho_para_arquivo_credenciais.json
```

**⚠️ IMPORTANTE**: O arquivo `.env` é essencial para o funcionamento da biblioteca. Sem ele, você não conseguirá se conectar aos modelos de IA.

Para uma explicação detalhada de cada variável e como obtê-las, consulte a [documentação de configuração](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/configuracao.md).

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
- **Sistema de Memória**: Inclui memória de conversação, fatos e **Memória Semântica** (com adaptador `ChromaDBMemoryAdapter` flexível para diferentes embeddings, além de SQLite e MongoDB). Essencial para **RAG (Retrieval-Augmented Generation)**, permitindo que agentes acessem conhecimento externo e possuam memória de longo prazo.

## Documentação

Para documentação detalhada sobre cada componente, consulte os links abaixo (apontando para o repositório GitHub):

- [Chat Agent](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/chat-agent.md)
- [Chat Manager](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/chat-manager.md)
- [Routing Chat Manager](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/routing-chat-manager.md)
- [Thinking Agent](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/thinking-agent.md)
- [Sequential Agent Chain](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/sequential-agent-chain.md)
- [Hierarchical Agent Orchestrator](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/hierarchical-agent-orchestrator.md)
- [Hierarchical Agent Thinking Orchestrator](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/hierarchical-agent-thinking-orchestrator.md)
- [Auto Gen Orchestrator](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/auto-gen-orchestrator.md)
- [Vertex AI Search Retriever](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/vertex-ai-search-retriever.md)
- [Tool Factory](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/tool-factory.md)
- [Modo Chat Vertex AI](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/modo-chat-vertex-ai.md)
- [Formatadores Personalizados](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/formatadores-personalizados.md)
- [Dependências de Agentes](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/dependencias-agentes.md)
- [Sistema de Debug](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/sistema-de-debug.md)
- [Sistema de Memória](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/sistema-de-memoria.md)

## Debug e Logs

A biblioteca utiliza o pacote `debug` para gerenciar mensagens de depuração. Por padrão, nenhuma mensagem de debug é exibida. Para ativar:

```bash
# Ativar todos os logs da biblioteca
DEBUG=gemini-agent-lib:* node seu-script.js

# Ativar apenas logs específicos
DEBUG=gemini-agent-lib:agent,gemini-agent-lib:chat-agent node seu-script.js
```

Para mais detalhes, consulte a [documentação do sistema de debug](https://github.com/oliverlessa/gemini-agent-lib/blob/master/docs/sistema-de-debug.md).

## Exemplos

Veja exemplos de uso na pasta [examples](https://github.com/oliverlessa/gemini-agent-lib/tree/master/examples).

## Licença

MIT
