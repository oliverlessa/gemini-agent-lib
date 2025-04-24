# Ferramenta: SemanticMemoryTool

Esta ferramenta permite que agentes interajam explicitamente com uma instância de `SemanticMemory` para realizar buscas semânticas em uma base de conhecimento vetorial.

## Propósito

Enquanto o `ChatAgent` pode ser configurado para usar `SemanticMemory` para RAG (Retrieval-Augmented Generation) de forma automática, a `SemanticMemoryTool` oferece um controle mais granular. Ela permite que qualquer agente (incluindo o `Agent` base) decida *quando* e *como* consultar a memória semântica, tratando a busca como uma ação explícita.

Casos de uso incluem:
- Agentes que precisam de controle fino sobre o processo de recuperação de informação.
- Uso da busca semântica por agentes que não são `ChatAgent`.
- Cenários onde a consulta à memória não deve ocorrer automaticamente em todas as interações.

## Instanciação

Para usar a ferramenta, você precisa primeiro instanciar um adaptador de `SemanticMemory` (como `ChromaDBMemoryAdapter`) e, em seguida, passar essa instância para o construtor da `SemanticMemoryTool`.

```javascript
const { memory, embedding, tools } = require('gemini-agent-lib');

// 1. Configurar e instanciar o adaptador de memória
const embeddingFunction = new embedding.VertexAIEmbeddingFunction({ /* ... config ... */ });
const semanticMemoryAdapter = new memory.ChromaDBMemoryAdapter({
    path: 'http://localhost:8000', // Ou omitir para in-memory
    collectionName: 'minha_base_conhecimento',
    embeddingFunction: embeddingFunction,
});

// Nota: Não é estritamente necessário chamar semanticMemoryAdapter.init() aqui,
// pois a ferramenta possui lógica de inicialização preguiçosa (lazy initialization).
// No entanto, chamar init() explicitamente pode ser útil para capturar erros de conexão mais cedo.
// await semanticMemoryAdapter.init();

// 2. Instanciar a ferramenta
const semanticMemoryTool = new tools.SemanticMemoryTool({
    semanticMemory: semanticMemoryAdapter
});
```

## Declaração da Ferramenta

A ferramenta expõe a seguinte declaração para o LLM (acessível via `semanticMemoryTool.getToolDeclaration()`):

```json
{
  "name": "semantic_memory_search",
  "description": "Busca na memória semântica por informações relevantes para uma consulta específica. Use esta ferramenta para encontrar documentos, trechos de texto ou dados previamente armazenados que possam responder à pergunta do usuário ou fornecer contexto adicional.",
  "parameters": {
    "type": "OBJECT",
    "properties": {
      "query": {
        "type": "STRING",
        "description": "O texto da consulta ou pergunta a ser usado na busca semântica."
      },
      "k": {
        "type": "NUMBER",
        "description": "O número máximo de resultados semanticamente similares a retornar. O padrão é 3 se não especificado."
      },
      "filter": {
        "type": "OBJECT",
        "description": "Um filtro opcional baseado em metadados para refinar a busca. A estrutura exata do filtro depende do banco de dados vetorial subjacente (ex: ChromaDB). Consulte a documentação do adaptador de memória para detalhes sobre a sintaxe do filtro."
      }
    },
    "required": ["query"]
  }
}
```

## Execução

Quando o LLM decide usar a ferramenta, ele chama a função `semantic_memory_search` com os parâmetros definidos. A ferramenta então executa o método `execute({ query, k, filter })`.

-   `query` (string, **obrigatório**): A string de busca.
-   `k` (number, opcional, padrão: 3): Quantos resultados retornar.
-   `filter` (object, opcional): Filtro de metadados. A sintaxe depende do adaptador (`ChromaDBMemoryAdapter` usa a sintaxe `where` do ChromaDB).

A ferramenta retorna uma string formatada contendo os resultados da busca (incluindo conteúdo, score de similaridade e metadados, se disponíveis) ou uma mensagem indicando que nenhum resultado foi encontrado ou que ocorreu um erro.

## Exemplo de Uso com Agente

```javascript
const { Agent, VertexAILLM, memory, embedding, tools } = require('../index');

// ... (instanciar llm, embeddingFunction, semanticMemoryAdapter como antes) ...

// Instanciar a ferramenta
const semanticMemoryTool = new tools.SemanticMemoryTool({
    semanticMemory: semanticMemoryAdapter
});

// Instanciar o Agente
const agent = new Agent({
    role: "Assistente de Base de Conhecimento",
    objective: "Responder perguntas usando a ferramenta de busca semântica.",
    context: `Você responde perguntas consultando uma base de conhecimento. Use a ferramenta 'semantic_memory_search' quando a pergunta do usuário exigir informações específicas da base. Formule a 'query' cuidadosamente.`,
    llm: llm,
    tools: [semanticMemoryTool], // Adiciona a instância da ferramenta
});

// Executar uma tarefa que deve acionar a ferramenta
agent.task = "Como funciona o sistema de memória do ChatAgent?";
const resposta = await agent.executeTask();

console.log(resposta);
// A resposta deve conter a informação recuperada pela ferramenta semantic_memory_search
```

## Considerações

-   **Inicialização:** A ferramenta tenta inicializar o adaptador de memória (`semanticMemory.init()`) automaticamente na primeira vez que `execute` é chamado, se o método `init` existir e ainda não tiver sido chamado. No entanto, para robustez, especialmente em produção, pode ser preferível chamar `init()` no adaptador explicitamente após a instanciação.
-   **Formatação da Saída:** A string retornada pela ferramenta é projetada para ser informativa para o LLM, incluindo scores e metadados para ajudar o modelo a avaliar a relevância dos resultados.
-   **Tratamento de Erros:** Erros durante a inicialização ou busca são capturados, logados no console (`console.error`) e uma mensagem de erro genérica é retornada ao LLM.
