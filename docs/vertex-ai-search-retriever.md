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
2. `VERTEX_CREDENTIALS_PATH`: Caminho para o arquivo de credenciais do Google Cloud
3. `GOOGLE_APPLICATION_CREDENTIALS`: Caminho para o arquivo de credenciais (pode ser o mesmo que `VERTEX_CREDENTIALS_PATH`)

Exemplo de configuração no arquivo `.env`:

```
VERTEX_PROJECT_ID=789802124107
VERTEX_CREDENTIALS_PATH=./gcp-fainor-vertex-all-07acd8705b36.json
GOOGLE_APPLICATION_CREDENTIALS=./gcp-fainor-vertex-all-07acd8705b36.json
```

## Parâmetros

A ferramenta aceita os seguintes parâmetros:

| Parâmetro | Tipo | Obrigatório | Descrição | Valor Padrão |
|-----------|------|-------------|-----------|--------------|
| query | string | Sim | Consulta de busca | - |
| projectId | string | Não | ID do projeto Google Cloud | Valor de `VERTEX_PROJECT_ID` |
| location | string | Não | Localização do serviço (global, us, eu) | "global" |
| collectionId | string | Não | ID da coleção | "default_collection" |
| dataStoreId | string | Sim | ID do data store | - |
| servingConfigId | string | Não | ID da configuração de serviço | "default_config" |
| maxResults | number | Não | Número máximo de resultados | 10 |

## Uso Básico

### Uso Direto da Ferramenta

```javascript
const vertexSearchRetrieverTool = require('./gemini-chain-lib/tools/vertex-ai-search-retriever-tool');

async function testarBusca() {
    try {
        const resultado = await vertexSearchRetrieverTool.function({
            query: "Vestibular Fainor",
            dataStoreId: "site-fainor_1714866492522",
            maxResults: 5
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
        credentialsPath: process.env.VERTEX_CREDENTIALS_PATH,
        projectId: process.env.VERTEX_PROJECT_ID,
        location: "us-central1",
        modelName: "gemini-1.0-pro",
        mode: "oneshot"
    });
    
    // Criar o agente com a ferramenta Vertex AI Search Retriever
    const agente = new Agent({
        role: "Assistente de Pesquisa",
        objective: "Fornecer informações precisas usando o Vertex AI Search",
        context: `Você é um assistente de IA avançado com acesso ao Vertex AI Search.
                 Use a ferramenta search para buscar informações relevantes.
                 Forneça respostas completas e precisas baseadas nas informações encontradas.`,
        task: "Busque informações sobre vestibular na Fainor",
        llm: vertexLLM,
        tools: [vertexSearchRetrieverTool]
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
