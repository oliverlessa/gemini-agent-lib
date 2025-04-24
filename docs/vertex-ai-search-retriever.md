# Documentação da Ferramenta Vertex AI Search Retriever

Esta documentação descreve a ferramenta `Vertex AI Search Retriever` implementada para o projeto GeminiChain, que permite realizar buscas usando o Google Vertex AI Search.

## Visão Geral

A ferramenta `Vertex AI Search Retriever` é uma implementação em Node.js que permite realizar buscas em conteúdos indexados no Google Vertex AI Search (Discovery Engine). Ela é similar à ferramenta do LangChain, mas adaptada para o ambiente Node.js e integrada ao ecossistema GeminiChain.

## Instalação

A ferramenta requer a biblioteca `@google-cloud/discoveryengine` para funcionar. Certifique-se de que ela está instalada no projeto:

```bash
npm install @google-cloud/discoveryengine
```

## Configuração

Para usar a ferramenta, você precisa configurar as seguintes variáveis de ambiente:

1. `VERTEX_PROJECT_ID`: ID do projeto no Google Cloud
2. `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para o arquivo de credenciais do Google Cloud

Exemplo de configuração no arquivo `.env`:

```
VERTEX_PROJECT_ID=789802124107
GOOGLE_APPLICATION_CREDENTIALS=./gcp-fainor-vertex-all-07acd8705b36.json
```

## Parâmetros

### Parâmetros de Execução

Estes são os parâmetros aceitos durante a execução da ferramenta:

| Parâmetro | Tipo | Obrigatório | Descrição | Valor Padrão |
|-----------|------|-------------|-----------|--------------|
| query | string | Sim | Consulta de busca | - |
| projectId | string | Não | ID do projeto Google Cloud | Valor de `VERTEX_PROJECT_ID` |
| location | string | Não | Localização do serviço (global, us, eu) | "global" |
| collectionId | string | Não | ID da coleção | "default_collection" |
| dataStoreId | string | Sim | ID do data store | - |
| servingConfigId | string | Não | ID da configuração de serviço | "default_config" |
| maxResults | number | Não | Número máximo de resultados | 10 |

### Parâmetros de Configuração da Factory

Estes são os parâmetros aceitos ao criar uma instância da ferramenta usando a factory function:

| Parâmetro | Tipo | Obrigatório | Descrição | Valor Padrão |
|-----------|------|-------------|-----------|--------------|
| projectId | string | Não | ID do projeto Google Cloud | Valor de `VERTEX_PROJECT_ID` |
| location | string | Não | Localização do serviço (global, us, eu) | "global" |
| collectionId | string | Não | ID da coleção | "default_collection" |
| dataStoreId | string | Não | ID do data store | - |
| servingConfigId | string | Não | ID da configuração de serviço | "default_config" |
| maxResults | number | Não | Número máximo de resultados | 10 |
| description | string | Não | Descrição personalizada da ferramenta | Descrição padrão |
| name | string | Não | Nome personalizado da ferramenta | "search_private_knowledge_base" |

## Uso Básico

### Criação de Instâncias da Ferramenta

A ferramenta `vertexSearchRetrieverTool` é uma factory function que permite criar instâncias personalizadas:

```javascript
const vertexSearchRetrieverTool = require('./gemini-chain-lib/tools/vertex-ai-search-retriever-tool');

// 1. Instância padrão (sem configurações personalizadas)
const defaultTool = vertexSearchRetrieverTool();

// 2. Instância com configurações específicas
const customTool = vertexSearchRetrieverTool({
    projectId: process.env.VERTEX_PROJECT_ID,
    location: "global",
    dataStoreId: "meu-data-store-id",
    maxResults: 5
});

// 3. Instância com descrição personalizada
const customDescriptionTool = vertexSearchRetrieverTool({
    projectId: process.env.VERTEX_PROJECT_ID,
    dataStoreId: "meu-data-store-id",
    description: "Ferramenta especializada para buscar informações sobre produtos no catálogo da empresa"
});

// 4. Instância com nome e descrição personalizados
const customNameAndDescriptionTool = vertexSearchRetrieverTool({
    dataStoreId: "meu-data-store-id",
    name: "buscar_produtos",
    description: "Busca produtos no catálogo da empresa usando Vertex AI Search"
});
```

### Uso Direto da Ferramenta

```javascript
const vertexSearchRetrieverTool = require('./gemini-chain-lib/tools/vertex-ai-search-retriever-tool');

async function testarBusca() {
    try {
        // Criar uma instância da ferramenta
        const searchTool = vertexSearchRetrieverTool({
            dataStoreId: "site-fainor_1714866492522",
            maxResults: 5
        });
        
        // Executar a busca
        const resultado = await searchTool.function({
            query: "Vestibular Fainor"
        });
        
        console.log("Resultados da busca:", JSON.stringify(resultado, null, 2));
    } catch (error) {
        console.error("Erro na busca:", error);
    }
}

testarBusca();
```

### Uso com um Agente

```javascript
const VertexAILLM = require('./gemini-chain-lib/vertex-ai-llm');
const Agent = require('./gemini-chain-lib/agent');
const vertexSearchRetrieverTool = require('./gemini-chain-lib/tools/vertex-ai-search-retriever-tool');

async function testarAgenteComBusca() {
    // Criar instância do VertexAILLM
    const vertexLLM = new VertexAILLM({
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        projectId: process.env.VERTEX_PROJECT_ID,
        location: "us-central1",
        modelName: "gemini-2.0-flash-001",
        mode: "oneshot"
    });
    
    // Criar uma instância personalizada da ferramenta
    const fainorSearchTool = vertexSearchRetrieverTool({
        projectId: process.env.VERTEX_PROJECT_ID,
        location: "global",
        dataStoreId: "site-fainor_1714866492522",
        maxResults: 5,
        description: "Ferramenta especializada para buscar informações sobre a Fainor no Vertex AI Search"
    });
    
    // Criar o agente com a ferramenta personalizada
    const agente = new Agent({
        role: "Assistente de Pesquisa",
        objective: "Fornecer informações precisas usando o Vertex AI Search",
        context: `Você é um assistente de IA avançado com acesso ao Vertex AI Search.
                 Use a ferramenta search_private_knowledge_base para buscar informações relevantes.
                 Forneça respostas completas e precisas baseadas nas informações encontradas.`,
        task: "Busque informações sobre vestibular na Fainor",
        llm: vertexLLM,
        tools: [fainorSearchTool]
    });
    
    // Executar a tarefa
    const resposta = await agente.executeTask();
    console.log(`Resposta do Agente:\n${resposta}`);
}

testarAgenteComBusca();
```

## Formato de Resposta

A ferramenta retorna um objeto com a seguinte estrutura:

```javascript
{
  "query": "Consulta original",
  "totalResults": 5, // Número de resultados encontrados
  "results": [
    {
      "id": "ID do documento",
      "title": "Título do documento",
      "url": "URL do documento",
      "extractiveSegments": [
        {
          "content": "Conteúdo extraído",
          "pageContent": "Conteúdo da página",
          "score": 0.95 // Pontuação de relevância
        }
      ],
      "snippets": [
        {
          "snippet": "Trecho do documento",
          "source": "Fonte do trecho"
        }
      ]
    }
    // Mais resultados...
  ]
}
```

## Exemplo de Teste

Um arquivo de teste completo está disponível em `test-vertex-ai-search-retriever.js`. Para executá-lo:

```bash
node test-vertex-ai-search-retriever.js
```

## Limitações

- A ferramenta requer credenciais válidas do Google Cloud com acesso ao Vertex AI Search
- O data store deve estar previamente configurado no Google Cloud
- A ferramenta depende da disponibilidade da API do Google Vertex AI Search

## Referências

- [Documentação da Discovery Engine API para Node.js](https://www.npmjs.com/package/@google-cloud/discoveryengine)
- [Documentação do Google Vertex AI Search](https://cloud.google.com/generative-ai-app-builder/docs/locations)
