# Sistema de Memória para ChatAgent

Este documento descreve o sistema de memória implementado para o `ChatAgent` na biblioteca `gemini-agent-lib`. O sistema permite a persistência de diferentes tipos de informações relacionadas às conversas, como histórico de mensagens, fatos e resumos.

## Visão Geral

O sistema de memória é composto por quatro interfaces principais, cada uma com adaptadores para diferentes soluções de armazenamento:

1.  **ConversationMemory**: Armazena o histórico sequencial de mensagens da conversa (memória episódica).
2.  **FactMemory**: Armazena fatos discretos ou pares chave-valor associados a um contexto (ex: preferências do usuário).
3.  **SummaryMemory**: Armazena resumos de segmentos de conversa (memória resumida).
4.  **SemanticMemory**: Armazena e recupera informações com base no significado (semântica), utilizando embeddings vetoriais. Essencial para RAG.

Adaptadores estão disponíveis para SQLite, MongoDB e ChromaDB (para SemanticMemory), permitindo escolher a solução de persistência mais adequada.

## RAG (Retrieval-Augmented Generation) e Memória Semântica

Uma das aplicações mais poderosas da memória em agentes de IA é a implementação de **RAG (Retrieval-Augmented Generation)**.

**O que é RAG?**
RAG é uma técnica onde um modelo de linguagem grande (LLM), antes de gerar uma resposta, primeiro recupera informações relevantes de uma base de conhecimento externa. Essas informações recuperadas são então fornecidas ao LLM como contexto adicional, permitindo que ele gere respostas mais informadas, precisas e contextualizadas.

**Como a Memória Semântica se encaixa?**
A `SemanticMemory` atua como essa base de conhecimento externa. Ela armazena informações (documentos, trechos de texto, etc.) como vetores de embedding em um banco de dados vetorial (como o ChromaDB). Quando o agente precisa responder a uma pergunta ou executar uma tarefa, ele primeiro consulta a `SemanticMemory` usando a pergunta ou o contexto atual (também convertidos em embeddings). A memória retorna os trechos de informação mais semanticamente similares, que são então usados pelo LLM para "aumentar" sua geração de resposta.

**Benefícios do RAG com Memória Semântica:**

-   **Memória de Longo Prazo:** Permite que o agente "lembre" de grandes volumes de informação de documentos carregados ou interações passadas, superando as limitações da janela de contexto do LLM.
-   **Grounding e Redução de Alucinações:** Baseia as respostas do LLM em fatos e dados concretos recuperados da memória, tornando as respostas mais confiáveis e menos propensas a inventar informações.
-   **Conhecimento Específico de Domínio:** Permite que o agente acesse e utilize conhecimento especializado que não estava presente em seus dados de treinamento originais.
-   **Atualização de Conhecimento:** A base de conhecimento pode ser atualizada independentemente do LLM, permitindo que o agente se mantenha atualizado com novas informações.
-   **Aprendizagem/Aprimoramento Contextual:** O agente pode usar o conteúdo recuperado para refinar suas respostas e "aprender" com as informações disponíveis na memória semântica.
-   **Contextualização:** Fornece contexto altamente relevante para tarefas ou perguntas específicas.

## Características Principais

- **Modular**: Cada tipo de memória é independente e pode ser usado separadamente ou em conjunto.
- **Opcional**: O sistema de memória é totalmente opcional. O `ChatAgent` continua funcionando normalmente com a memória volátil padrão se nenhum adaptador for fornecido.
- **Extensível**: A arquitetura baseada em interfaces facilita a adição de novos adaptadores para outros bancos de dados ou serviços de armazenamento.
- **Transparente**: A integração com o `ChatAgent` é transparente, não exigindo mudanças na forma como as mensagens são processadas.

## Tipos de Memória

### ConversationMemory

Responsável por armazenar o histórico sequencial de mensagens da conversa. Cada mensagem contém:
- `role`: O papel do autor da mensagem ('user' ou 'model').
- `content`: O conteúdo da mensagem.

Métodos principais:
- `loadHistory(chatId)`: Carrega o histórico de mensagens para um determinado ID de chat.
- `appendMessage(chatId, role, content)`: Adiciona uma nova mensagem ao histórico.
- `clearHistory(chatId)`: Limpa o histórico de mensagens para um determinado ID de chat.

### FactMemory

Responsável por armazenar fatos discretos (pares chave-valor) associados a um contexto específico (geralmente um `chatId`). Útil para armazenar preferências do usuário, estado da sessão ou informações pontuais aprendidas durante a conversa. Diferente da `SemanticMemory`, a recuperação é feita por chave exata, não por similaridade semântica.

Métodos principais:
- `setFact(contextId, key, value)`: Armazena ou atualiza um fato.
- `getFact(contextId, key)`: Recupera o valor de um fato específico.
- `getAllFacts(contextId)`: Recupera todos os fatos para um contexto.
- `deleteFact(contextId, key)`: Remove um fato específico.
- `deleteAllFacts(contextId)`: Remove todos os fatos para um contexto.

### SummaryMemory

Responsável por armazenar resumos de segmentos da conversa. Útil para manter o contexto em conversas longas sem precisar processar todo o histórico, comprimindo informações passadas.

Métodos principais:
- `addSummary(contextId, summaryContent, timestamp)`: Adiciona um novo resumo.
- `getLatestSummary(contextId)`: Recupera o resumo mais recente.
- `getAllSummaries(contextId, limit)`: Recupera todos os resumos, ordenados do mais recente para o mais antigo.
- `deleteAllSummaries(contextId)`: Remove todos os resumos para um contexto.

### SemanticMemory

Responsável por armazenar e recuperar documentos ou trechos de texto com base na similaridade semântica. Utiliza embeddings vetoriais para representar o significado do texto e bancos de dados vetoriais para busca eficiente. É a base para implementações RAG.

Métodos principais:
- `init()`: Inicializa a conexão com o backend de memória (ex: ChromaDB).
- `add(documents)`: Adiciona uma lista de documentos à memória. Cada documento geralmente tem `id`, `content` e `metadata`. A função de embedding configurada gera os vetores.
- `search(query, k, filter)`: Busca os `k` documentos mais similares à `query` fornecida, opcionalmente aplicando um `filter` nos metadados.
- `delete(ids)`: Remove documentos da memória pelos seus IDs.
- `close()`: Fecha a conexão com o backend.

### Modos de Uso da SemanticMemory

Existem duas maneiras principais de interagir com a `SemanticMemory`:

1.  **RAG Automático Integrado (via `ChatAgent`):**
    *   **Como funciona:** Ao configurar o `ChatAgent` e fornecer uma instância de `SemanticMemory` no construtor, o agente pode realizar RAG automaticamente. Antes de gerar uma resposta, ele consulta a `SemanticMemory` com base na mensagem atual do usuário e injeta os resultados relevantes no contexto do LLM.
    *   **Configuração:** Passar a instância de `SemanticMemory` e parâmetros opcionais como `ragTopK`, `ragContextPrefix`, etc., no construtor do `ChatAgent`.
    *   **Caso de uso:** Ideal para cenários onde se deseja que o agente sempre tente enriquecer suas respostas com informações da base de conhecimento de forma transparente.

2.  **Ferramenta Explícita (`SemanticMemoryTool`):**
    *   **Como funciona:** A `SemanticMemoryTool` encapsula a funcionalidade de busca da `SemanticMemory` em um formato de ferramenta padrão. Qualquer agente (incluindo `Agent` base ou `ChatAgent`) pode ser configurado com esta ferramenta. O LLM decidirá *quando* chamar a ferramenta (`semantic_memory_search`) com base nas instruções do agente e na conversa.
    *   **Configuração:** Instanciar a `SemanticMemoryTool` passando uma instância de `SemanticMemory` e adicionar a ferramenta à lista `tools` do agente.
    *   **Caso de uso:** Oferece controle mais granular sobre quando a busca semântica é realizada. Útil para agentes que precisam decidir explicitamente se devem ou não consultar a base de conhecimento, ou para usar a busca semântica com agentes que não são `ChatAgent`.
    *   **Veja mais detalhes:** [Documentação da SemanticMemoryTool](./semantic-memory-tool.md) (será criada)

Ambas as abordagens utilizam a mesma instância subjacente de `SemanticMemory` e seus adaptadores (como `ChromaDBMemoryAdapter`).

## Adaptadores Disponíveis

### SQLite (Conversation, Fact, Summary)

Adaptadores para armazenamento local em arquivo SQLite:
- `SQLiteConversationMemoryAdapter`
- `SQLiteFactMemoryAdapter`
- `SQLiteSummaryMemoryAdapter`

Configuração:
```javascript
const { memory } = require('gemini-agent-lib');
const path = require('path');

const dbPath = path.join(__dirname, 'chat_memory.db');

const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
    dbConfig: { dbPath }
});
```

### MongoDB (Conversation, Fact, Summary)

Adaptadores para armazenamento em banco de dados MongoDB:
- `MongoDBConversationMemoryAdapter`
- `MongoDBFactMemoryAdapter`
- `MongoDBSummaryMemoryAdapter`

**Importante:** Os adaptadores MongoDB requerem inicialização explícita antes de serem utilizados. Você deve chamar o método `initialize()` e aguardar sua conclusão antes de usar o adaptador.

Configuração:
```javascript
const { memory } = require('gemini-agent-lib');

// Criar o adaptador
const conversationMemory = new memory.MongoDBConversationMemoryAdapter({
    dbConfig: {
        connectionUri: 'mongodb://localhost:27017',
        dbName: 'gemini_agent_memory',
        collectionName: 'chat_history' // opcional, padrão é 'chat_history'
    }
});

// Inicializar a conexão (importante!)
await conversationMemory.initialize();

// Agora o adaptador está pronto para uso
```

### ChromaDB (SemanticMemory)

Adaptador para usar o ChromaDB como backend para a `SemanticMemory`.

-   `ChromaDBMemoryAdapter`

**Importante:** Requer a instalação do pacote `chromadb`: `npm install chromadb`.

**Configuração:**

```javascript
const { memory } = require('gemini-agent-lib');
const VertexAIEmbeddingFunction = require('../lib/embedding/vertex-ai-embedding'); // Exemplo com Vertex AI
const { GoogleGenerativeAiEmbeddingFunction } = require('chromadb'); // Exemplo com Google Gemini (via ChromaDB)

// --- Opção 1: Usando VertexAIEmbeddingFunction (customizada) ---
const vertexAIEmbedder = new VertexAIEmbeddingFunction({
    projectId: process.env.VERTEX_PROJECT_ID,
    location: process.env.VERTEX_LOCATION,
    modelId: process.env.VERTEX_EMBEDDING_MODEL_ID || 'text-embedding-005',
});

const semanticMemoryVertex = new memory.ChromaDBMemoryAdapter({
    collectionName: "minha_colecao_vertex",
    embeddingFunction: vertexAIEmbedder, // Passa a instância
    // path: "http://localhost:8000" // Opcional: para servidor ChromaDB externo
});

// --- Opção 2: Usando GoogleGenerativeAiEmbeddingFunction (do ChromaDB) ---
const googleEmbedder = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: process.env.GEMINI_API_KEY, // Ou outra chave API do Google
    // model: "embedding-001" // Opcional
});

const semanticMemoryGoogle = new memory.ChromaDBMemoryAdapter({
    collectionName: "minha_colecao_google",
    embeddingFunction: googleEmbedder, // Passa a instância
    // path: "http://localhost:8000" // Opcional
});

// Inicializar a memória semântica escolhida (importante!)
// await semanticMemoryVertex.init();
// ou
// await semanticMemoryGoogle.init();

// Agora o adaptador está pronto para adicionar e buscar documentos.
// Exemplo de adição:
// await semanticMemoryVertex.add([
//   { id: "doc1", content: "Conteúdo do primeiro documento.", metadata: { tipo: "manual" } },
//   { id: "doc2", content: "Informações sobre o segundo item.", metadata: { tipo: "faq" } }
// ]);

// Exemplo de busca:
// const resultados = await semanticMemoryVertex.search("Qual a informação sobre o segundo item?", 2);
// console.log(resultados);

// Fechar a conexão quando terminar
// await semanticMemoryVertex.close();
```

**Flexibilidade da `embeddingFunction`:**

O `ChromaDBMemoryAdapter` foi projetado para ser flexível com a função de embedding fornecida:

1.  **Se** a `embeddingFunction` possuir um método `generate(texts: string[])`, ela será usada diretamente (padrão esperado pelo `chromadb`). É o caso da `GoogleGenerativeAiEmbeddingFunction` do pacote `chromadb`.
2.  **Se** a `embeddingFunction` possuir um método `embedDocuments(texts: string[])` (como a nossa `VertexAIEmbeddingFunction`), o adaptador criará automaticamente um wrapper para compatibilidade com o ChromaDB.
3.  Se nenhum desses métodos for encontrado, um erro será lançado durante a construção do adaptador.

Para um exemplo completo de uso do `ChromaDBMemoryAdapter` com ambas as funções de embedding, veja: `examples/exemplo-chromadb-multi-embedding.js`.

## Gerenciamento Automático de Memórias (Fact e Summary)

O `ChatAgent` agora suporta o gerenciamento automático de memórias de fatos e resumos. Esta funcionalidade permite que o agente analise automaticamente as conversas e:

1. Extraia fatos relevantes e os armazene na `FactMemory`
2. Gere ou atualize resumos na `SummaryMemory` quando apropriado

### Como Funciona

O gerenciamento automático é implementado através de um mecanismo de avaliação e decisão que:

1. É acionado após cada interação completa (mensagem do usuário + resposta do agente)
2. Utiliza o LLM configurado no `ChatAgent` para analisar a conversa
3. Extrai fatos e/ou gera resumos conforme necessário
4. Armazena as informações nas respectivas memórias

### Configuração

Para habilitar o gerenciamento automático, adicione os parâmetros `autoManageFactMemory` e/ou `autoManageSummaryMemory` ao construtor do `ChatAgent`:

```javascript
const chatAgent = new ChatAgent({
    // Configurações básicas...
    factMemory: factMemory,
    summaryMemory: summaryMemory,
    autoManageFactMemory: true,  // Habilita o gerenciamento automático de fatos
    autoManageSummaryMemory: true  // Habilita o gerenciamento automático de resumos
});
```

Você pode habilitar o gerenciamento automático para apenas um tipo de memória, se desejar:

```javascript
const chatAgent = new ChatAgent({
    // Configurações básicas...
    factMemory: factMemory,
    summaryMemory: summaryMemory,
    autoManageFactMemory: true,  // Apenas fatos serão gerenciados automaticamente
    autoManageSummaryMemory: false
});
```

### Processo de Extração de Fatos

Quando `autoManageFactMemory` está habilitado:

1. Após cada interação, o sistema analisa a mensagem do usuário e a resposta do agente
2. O LLM identifica fatos relevantes na conversa
3. Cada fato é representado como um par chave-valor
4. Os fatos são automaticamente armazenados na `FactMemory`

Exemplo de fatos que podem ser extraídos:
- `nome_usuario`: "Maria Silva"
- `cidade_residencia`: "São Paulo"
- `preferencia_clima`: "quente"
- `hobby_principal`: "fotografia"

### Processo de Geração de Resumos

Quando `autoManageSummaryMemory` está habilitado:

1. Após cada interação, o sistema avalia se a conversa justifica uma atualização do resumo
2. Se necessário, o LLM gera um novo resumo ou atualiza o existente
3. O resumo é automaticamente armazenado na `SummaryMemory`

### Coexistência com Gerenciamento Manual

O gerenciamento automático não impede o gerenciamento manual. Mesmo com `autoManageFactMemory` e `autoManageSummaryMemory` habilitados, você ainda pode:

- Adicionar fatos manualmente com `setFact()`
- Adicionar resumos manualmente com `addSummary()`
- Recuperar fatos e resumos com os métodos correspondentes

Isso proporciona flexibilidade para combinar a extração automática com a adição manual de informações específicas.

### Considerações sobre o Gerenciamento Automático

1. **Custo de Processamento**: O gerenciamento automático requer chamadas adicionais ao LLM, o que pode aumentar o custo e a latência.
2. **Qualidade da Extração**: A qualidade dos fatos e resumos extraídos depende do LLM utilizado e do contexto fornecido.
3. **Controle**: Você pode desabilitar o gerenciamento automático a qualquer momento se preferir controle total sobre o que é armazenado.

## Uso com ChatAgent

O `ChatAgent` pode ser configurado para usar qualquer combinação dos adaptadores de memória.

### Configuração Básica com SQLite (ConversationMemory)

```javascript
const { ChatAgent, VertexAILLM, memory } = require('gemini-agent-lib');

// Criar adaptadores de memória
const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
    dbConfig: { dbPath: './chat_memory.db' }
});

// Criar instância do ChatAgent com memória persistente
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas tarefas",
    context: "Você é um assistente pessoal amigável e prestativo.",
    llm: new VertexAILLM({ /* configuração do LLM */ }),
    conversationMemory // Apenas ConversationMemory
});

// Processar mensagens normalmente
const resposta = await chatAgent.processUserMessage("Olá, como vai?");
console.log(resposta.text);

// Fechar a conexão quando terminar
await conversationMemory.close();
```

### Configuração com MongoDB (Todos os Tipos Exceto Semântica)

```javascript
const { ChatAgent, VertexAILLM, memory } = require('gemini-agent-lib');

// Configuração do MongoDB
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const MONGODB_DB_NAME = 'gemini_agent_memory';

// Criar instâncias dos adaptadores de memória MongoDB
const conversationMemory = new memory.MongoDBConversationMemoryAdapter({
    dbConfig: {
        connectionUri: MONGODB_URI,
        dbName: MONGODB_DB_NAME,
        collectionName: 'chat_history'
    }
});

const factMemory = new memory.MongoDBFactMemoryAdapter({
    dbConfig: {
        connectionUri: MONGODB_URI,
        dbName: MONGODB_DB_NAME,
        collectionName: 'facts'
    }
});

const summaryMemory = new memory.MongoDBSummaryMemoryAdapter({
    dbConfig: {
        connectionUri: MONGODB_URI,
        dbName: MONGODB_DB_NAME,
        collectionName: 'summaries'
    }
});

// IMPORTANTE: Inicializar as conexões com o MongoDB antes de usar os adaptadores
await conversationMemory.initialize();
await factMemory.initialize();
await summaryMemory.initialize();

// Criar instância do LLM
const llm = new VertexAILLM({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    modelName: "gemini-2.0-flash-001",
    mode: "chat"
});

// Criar instância do ChatAgent com memória MongoDB
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas tarefas",
    context: "Você é um assistente pessoal amigável e prestativo.",
    llm,
    conversationMemory,
    factMemory,
    summaryMemory
});

// Processar mensagens normalmente
const resposta = await chatAgent.processUserMessage("Olá, como vai?");
console.log(resposta.text);

// Fechar as conexões quando terminar
await conversationMemory.close();
await factMemory.close();
await summaryMemory.close();
```

### Uso Completo com SQLite (Conversation, Fact, Summary)

```javascript
const { ChatAgent, VertexAILLM, memory } = require('gemini-agent-lib');

// Criar adaptadores de memória
const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
    dbConfig: { dbPath: './chat_memory.db' }
});

const factMemory = new memory.SQLiteFactMemoryAdapter({
    dbConfig: { dbPath: './chat_memory.db' }
});

const summaryMemory = new memory.SQLiteSummaryMemoryAdapter({
    dbConfig: { dbPath: './chat_memory.db' }
});

// Criar instância do ChatAgent com todos os tipos de memória
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas tarefas",
    context: "Você é um assistente pessoal amigável e prestativo.",
    llm: new VertexAILLM({ /* configuração do LLM */ }),
    conversationMemory,
    factMemory,
    summaryMemory
});

// Processar mensagens
const resposta = await chatAgent.processUserMessage("Meu nome é Carlos.");
console.log(resposta.text);

// Armazenar fatos sobre o usuário
await chatAgent.setFact("nome", "Carlos");
await chatAgent.setFact("interesses", ["programação", "IA"]);

// Recuperar fatos
const nome = await chatAgent.getFact("nome");
console.log(`Nome do usuário: ${nome}`);

// Adicionar um resumo da conversa
await chatAgent.addSummary("O usuário se chama Carlos e está se apresentando.");

// Recuperar o resumo mais recente
const resumo = await chatAgent.getLatestSummary();
console.log(`Resumo: ${resumo}`);

// Fechar as conexões quando terminar
await conversationMemory.close();
await factMemory.close();
await summaryMemory.close();
```

### Uso com Memória Semântica (ChromaDB)

Atualmente, a `SemanticMemory` não é integrada diretamente ao fluxo automático do `ChatAgent` da mesma forma que `ConversationMemory`, `FactMemory` e `SummaryMemory`. Ela é projetada para ser usada programaticamente para implementar lógicas RAG específicas, como:

1.  **Carregar Documentos:** Usar um script separado ou uma ferramenta para popular a `SemanticMemory` com sua base de conhecimento (ex: usando `TextLoader` e `semanticMemory.add()`).
2.  **Recuperação Explícita:** Dentro da lógica do seu agente ou aplicação, antes de chamar o LLM, fazer uma busca na `SemanticMemory` com base na pergunta do usuário ou no contexto atual.
3.  **Injeção de Contexto:** Incluir os resultados da busca da `SemanticMemory` no prompt enviado ao LLM.

```javascript
// Exemplo conceitual de integração RAG com ChatAgent

const { ChatAgent, VertexAILLM, memory } = require('gemini-agent-lib');
const VertexAIEmbeddingFunction = require('../lib/embedding/vertex-ai-embedding');

// Configurar LLM
const llm = new VertexAILLM({ /* ... */ });

// Configurar Memória Semântica
const vertexAIEmbedder = new VertexAIEmbeddingFunction({ /* ... */ });
const semanticMemory = new memory.ChromaDBMemoryAdapter({
    collectionName: "knowledge_base",
    embeddingFunction: vertexAIEmbedder
});
await semanticMemory.init(); // Inicializar

// (Assumindo que a memória já foi populada com documentos relevantes)

// Criar ChatAgent (pode ter outras memórias também)
const chatAgent = new ChatAgent({
    role: "Assistente Especialista",
    objective: "Responder perguntas usando a base de conhecimento",
    context: "Você responde perguntas consultando informações relevantes.",
    llm: llm,
    // conversationMemory: ..., // Opcional
});

// Função para processar mensagem com RAG
async function processarComRAG(perguntaUsuario) {
    // 1. Buscar na Memória Semântica
    const K = 3; // Número de documentos a recuperar
    const resultadosBusca = await semanticMemory.search(perguntaUsuario, K);

    // 2. Preparar o contexto recuperado
    let contextoRecuperado = "Informações relevantes encontradas:\n";
    if (resultadosBusca && resultadosBusca.length > 0) {
        contextoRecuperado += resultadosBusca.map(r => `- ${r.content}`).join("\n");
    } else {
        contextoRecuperado = "Nenhuma informação diretamente relevante encontrada na base de conhecimento.";
    }

    // 3. Criar prompt aumentado
    const promptAumentado = `Contexto:\n${contextoRecuperado}\n\nPergunta do Usuário: ${perguntaUsuario}\n\nResposta:`;

    // 4. Chamar o LLM diretamente ou através de um método do agente que permita prompt customizado
    // (Nota: ChatAgent pode precisar de adaptação ou usar LLM diretamente para este fluxo)
    // Exemplo usando LLM diretamente:
    const respostaLLM = await llm.generateContent(promptAumentado);

    // 5. Registrar a interação (opcional, se usar ConversationMemory)
    // await chatAgent.appendHistory('user', perguntaUsuario);
    // await chatAgent.appendHistory('model', respostaLLM);

    return respostaLLM;
}

// Exemplo de uso
const pergunta = "Qual o procedimento para solicitar férias?";
const respostaFinal = await processarComRAG(pergunta);
console.log("Resposta do Agente:", respostaFinal);

// Fechar conexão da memória semântica
await semanticMemory.close();

```

### Uso sem Memória Persistente

```javascript
const { ChatAgent, VertexAILLM } = require('gemini-agent-lib');

// Criar instância do ChatAgent sem memória persistente
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas tarefas",
    context: "Você é um assistente pessoal amigável e prestativo.",
    llm: new VertexAILLM({ /* configuração do LLM */ })
    // Sem parâmetros de memória
});

// O ChatAgent usará a memória volátil padrão
const resposta = await chatAgent.processUserMessage("Olá!");
console.log(resposta.text);
```

### Uso com ID de Conversa Personalizado

```javascript
const { ChatAgent, VertexAILLM, memory } = require('gemini-agent-lib');

// Criar adaptadores de memória
const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
    dbConfig: { dbPath: './chat_memory.db' }
});

// ID de conversa personalizado (pode ser um ID de usuário, sessão, etc.)
const meuChatId = "usuario_123456";

// Criar instância do ChatAgent com ID personalizado
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas tarefas",
    context: "Você é um assistente pessoal amigável e prestativo.",
    llm: new VertexAILLM({ /* configuração do LLM */ }),
    conversationMemory,
    chatId: meuChatId // Fornecendo um ID personalizado
});

// Processar mensagens normalmente
// O histórico e outros dados serão associados ao ID personalizado
const resposta = await chatAgent.processUserMessage("Olá, como vai?");
console.log(resposta.text);

// Fechar a conexão quando terminar
await conversationMemory.close();
```

## Considerações Importantes

1. **IDs de Conversa (`chatId`)**: Para `ConversationMemory`, `FactMemory` e `SummaryMemory`, o `ChatAgent` associa os dados a um `chatId`. Se não for fornecido na configuração do agente, um UUID é gerado automaticamente. Fornecer um `chatId` explícito (ex: ID de usuário, ID de sessão) permite recuperar o estado da memória entre diferentes instâncias ou execuções. A `SemanticMemory` geralmente opera em um escopo mais amplo (ex: uma base de conhecimento inteira), mas pode usar metadados e filtros para segmentar informações se necessário.

2. **Inicialização de Adaptadores MongoDB**: Os adaptadores MongoDB (`MongoDBConversationMemoryAdapter`, `MongoDBFactMemoryAdapter`, `MongoDBSummaryMemoryAdapter`) requerem inicialização explícita antes de serem utilizados. Você deve chamar o método `initialize()` e aguardar sua conclusão antes de criar o ChatAgent ou usar os adaptadores diretamente. Isso é necessário porque a conexão com o MongoDB é assíncrona e precisa ser estabelecida antes que qualquer operação seja realizada.

3. **Fechamento de Conexões**: Sempre feche as conexões dos adaptadores de memória quando terminar de usá-los, usando o método `close()`. Não fechar as conexões pode levar a:
   - Vazamento de recursos (conexões de banco de dados, handles de arquivo)
   - Possível corrupção de dados, especialmente com SQLite
   - Impedir que a aplicação termine de forma limpa

   **Exemplo de fechamento seguro com try/finally:**
   ```javascript
   // Criar adaptadores
   const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
       dbConfig: { dbPath: './chat_memory.db' }
   });
   
   try {
       // Usar o adaptador normalmente
       const chatAgent = new ChatAgent({
           // ... outras configurações
           conversationMemory
       });
       
       // Processar mensagens
       const resposta = await chatAgent.processUserMessage("Olá!");
       console.log(resposta.text);
   } finally {
       // Garantir que a conexão seja fechada mesmo se ocorrerem erros
       await conversationMemory.close();
   }
   ```

   **Exemplo com múltiplos adaptadores:**
   ```javascript
   // Criar adaptadores
   const conversationMemory = new memory.SQLiteConversationMemoryAdapter({/*...*/});
   const factMemory = new memory.SQLiteFactMemoryAdapter({/*...*/});
   const summaryMemory = new memory.SQLiteSummaryMemoryAdapter({/*...*/});
   
   try {
       // Usar os adaptadores
       // ...
   } finally {
       // Fechar todas as conexões
       await Promise.all([
           conversationMemory.close(),
           factMemory.close(),
           summaryMemory.close()
       ]);
   }
   ```

   **Tratamento de sinais para aplicações de longa duração:**
   ```javascript
   // Criar adaptadores
   const conversationMemory = new memory.MongoDBConversationMemoryAdapter({/*...*/});
   await conversationMemory.initialize();
   
   // Configurar handler para desligamento elegante
   process.on('SIGINT', async () => {
       console.log('Fechando conexões antes de encerrar...');
       try {
           await conversationMemory.close();
           console.log('Conexões fechadas com sucesso');
       } catch (error) {
           console.error('Erro ao fechar conexões:', error);
       }
       process.exit(0);
   });
   
   // Usar o adaptador normalmente
   // ...
   ```

   > **Nota importante:** O evento `process.on('exit')` NÃO é adequado para fechar conexões, pois ele só permite operações síncronas, e o fechamento de conexões é uma operação assíncrona. Use `SIGINT`, `SIGTERM` ou outros sinais apropriados.

4. **Tratamento de Erros**: Os métodos de memória do `ChatAgent` tratam erros internamente e não falham completamente se a persistência falhar. Isso garante que o agente continue funcionando mesmo se houver problemas com o banco de dados.

5. **Uso Independente**: Você pode usar apenas um ou dois tipos de memória, dependendo das suas necessidades. Por exemplo, você pode usar apenas `ConversationMemory` para persistir o histórico de mensagens, sem usar `FactMemory` ou `SummaryMemory`.

6. **Prevenção de Vazamento de Recursos**: Para ajudar a prevenir problemas relacionados ao não fechamento de conexões, considere as seguintes estratégias:
   
   - **Padrão de Wrapper**: Crie uma função ou classe wrapper que gerencie o ciclo de vida dos adaptadores:
     ```javascript
     class MemoryManager {
       constructor() {
         this.adapters = [];
       }
     
       addAdapter(adapter) {
         this.adapters.push(adapter);
         return adapter;
       }
     
       async closeAll() {
         await Promise.all(this.adapters.map(adapter => adapter.close()));
       }
     }
     
     // Uso
     const memoryManager = new MemoryManager();
     const conversationMemory = memoryManager.addAdapter(
       new memory.SQLiteConversationMemoryAdapter({/*...*/})
     );
     
     // No final da aplicação
     await memoryManager.closeAll();
     ```
   
   - **Middleware para Express/Koa**: Em aplicações web, implemente um middleware que rastreie e feche conexões no final do ciclo de vida da aplicação:
     ```javascript
     // Express middleware exemplo
     app.use((req, res, next) => {
       // Registrar adaptadores criados durante a requisição
       req.memoryAdapters = [];
       
       // Adicionar método helper
       req.registerAdapter = (adapter) => {
         req.memoryAdapters.push(adapter);
         return adapter;
       };
       
       // Fechar conexões após a resposta ser enviada
       res.on('finish', async () => {
         if (req.memoryAdapters.length > 0) {
           await Promise.all(req.memoryAdapters.map(adapter => adapter.close()));
         }
       });
       
       next();
     });
     ```
   
   - **Classe de Gerenciamento Automático**: Implemente uma classe auxiliar que registre e gerencie automaticamente os adaptadores de memória:
     ```javascript
     // memory-manager.js
     class MemoryManager {
       static instance;
       
       constructor() {
         if (MemoryManager.instance) {
           return MemoryManager.instance;
         }
         
         this.adapters = new Set();
         this._setupShutdownHandlers();
         MemoryManager.instance = this;
       }
       
       register(adapter) {
         this.adapters.add(adapter);
         return adapter;
       }
       
       async closeAll() {
         const closePromises = [];
         for (const adapter of this.adapters) {
           closePromises.push(adapter.close().catch(err => {
             console.error('Erro ao fechar adaptador:', err);
           }));
         }
         await Promise.all(closePromises);
         this.adapters.clear();
       }
       
       _setupShutdownHandlers() {
         // Capturar sinais de término
         ['SIGINT', 'SIGTERM'].forEach(signal => {
           process.on(signal, async () => {
             console.log(`Sinal ${signal} recebido. Fechando conexões...`);
             await this.closeAll();
             process.exit(0);
           });
         });
         
         // Capturar exceções não tratadas
         process.on('uncaughtException', async (err) => {
           console.error('Exceção não tratada:', err);
           await this.closeAll();
           process.exit(1);
         });
       }
     }
     
     // Uso na aplicação
     const manager = new MemoryManager();
     
     // Ao criar adaptadores
     const conversationMemory = manager.register(
       new memory.SQLiteConversationMemoryAdapter({/*...*/})
     );
     
     // Não é necessário chamar close() manualmente para desligamento normal
     // O gerenciador cuidará disso quando a aplicação for encerrada
     ```

## Implementação de Proteção na Biblioteca

Para ajudar a prevenir problemas relacionados ao não fechamento de conexões, a biblioteca poderia implementar mecanismos de proteção internos. Abaixo está um exemplo conceitual de como isso poderia ser implementado:

```javascript
// Exemplo conceitual de implementação na biblioteca
class BaseMemoryAdapter {
  constructor() {
    // Registrar o adaptador no registro global
    MemoryAdapterRegistry.register(this);
  }
  
  async close() {
    // Implementação específica de fechamento
    // ...
    
    // Remover do registro após fechar
    MemoryAdapterRegistry.unregister(this);
  }
}

// Registro global de adaptadores
class MemoryAdapterRegistry {
  static adapters = new WeakSet();
  static initialized = false;
  
  static initialize() {
    if (this.initialized) return;
    
    // Configurar handlers de desligamento
    ['SIGINT', 'SIGTERM'].forEach(signal => {
      process.on(signal, async () => {
        console.log(`[gemini-agent-lib] Sinal ${signal} recebido. Fechando conexões de memória...`);
        await MemoryAdapterRegistry.closeAll();
        // Não chamamos process.exit() aqui para permitir que a aplicação
        // faça seu próprio tratamento de desligamento
      });
    });
    
    // Aviso de finalização
    process.on('exit', () => {
      const count = MemoryAdapterRegistry.getActiveCount();
      if (count > 0) {
        console.warn(`[gemini-agent-lib] Aviso: ${count} conexões de adaptadores de memória não foram fechadas explicitamente.`);
      }
    });
    
    this.initialized = true;
  }
  
  static register(adapter) {
    this.initialize();
    this.adapters.add(adapter);
  }
  
  static unregister(adapter) {
    this.adapters.delete(adapter);
  }
  
  static getActiveCount() {
    // WeakSet não tem método size, esta é uma aproximação conceitual
    // Na implementação real, precisaríamos rastrear o contador separadamente
    return [...this.adapters].length;
  }
  
  static async closeAll() {
    const closePromises = [];
    for (const adapter of this.adapters) {
      closePromises.push(adapter.close().catch(err => {
        console.error('[gemini-agent-lib] Erro ao fechar adaptador:', err);
      }));
    }
    await Promise.all(closePromises);
  }
}

// Implementação nos adaptadores específicos
class SQLiteConversationMemoryAdapter extends BaseMemoryAdapter {
  // ...implementação existente
}

class MongoDBConversationMemoryAdapter extends BaseMemoryAdapter {
  // ...implementação existente
}
```

> **Nota importante:** Esta implementação é conceitual e ilustrativa. A implementação real precisaria lidar com várias complexidades adicionais, como evitar fechamentos duplicados, gerenciar o ciclo de vida dos adaptadores de forma thread-safe, e garantir que o registro não impeça a coleta de lixo dos adaptadores não utilizados (daí o uso de WeakSet).

### Considerações sobre a Implementação na Biblioteca

1. **Prós:**
   - Fornece uma rede de segurança para desenvolvedores que esquecem de fechar conexões
   - Reduz a probabilidade de vazamentos de recursos em aplicações de produção
   - Simplifica o código do cliente, que não precisa se preocupar tanto com o gerenciamento de conexões

2. **Contras:**
   - Pode criar comportamentos inesperados se a aplicação tiver sua própria lógica de gerenciamento de desligamento
   - Adiciona complexidade à biblioteca
   - Pode dar aos desenvolvedores uma falsa sensação de segurança, levando a práticas de codificação menos rigorosas

3. **Recomendação:**
   - Mesmo com mecanismos de proteção na biblioteca, os desenvolvedores devem sempre fechar explicitamente as conexões quando possível
   - Considere os mecanismos automáticos como uma rede de segurança, não como a abordagem principal

## Exemplos

Veja exemplos completos de uso do sistema de memória nos arquivos:
- `examples/exemplo-chat-agent-com-memoria.js`: Uso com SQLite e todos os tipos de memória.
- `examples/exemplo-chat-agent-com-mongodb.js`: Uso com MongoDB e todos os tipos de memória.
- `examples/exemplo-chat-agent-com-memoria-parcial.js`: Uso com apenas um tipo de memória.
- `examples/exemplo-chat-agent-sem-memoria.js`: Uso sem memória persistente.
- `examples/exemplo-chat-agent-com-memoria-automatica.js`: Uso com gerenciamento automático de memórias de fatos e resumos.
- `examples/exemplo-chromadb-multi-embedding.js`: Demonstra o uso do `ChromaDBMemoryAdapter` com diferentes funções de embedding.
- `examples/exemplo-ingestao-semantic-memory.js`: Mostra como popular a `SemanticMemory` (ChromaDB) a partir de arquivos de texto.

## Testes

Você pode executar os testes do sistema de memória com:

```bash
node test/test-memory-system.js
```

Este teste verifica o funcionamento básico dos diferentes tipos de memória e seus adaptadores.
