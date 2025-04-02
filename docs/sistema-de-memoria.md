# Sistema de Memória para ChatAgent

Este documento descreve o sistema de memória implementado para o `ChatAgent` na biblioteca `gemini-agent-lib`. O sistema permite a persistência de diferentes tipos de informações relacionadas às conversas, como histórico de mensagens, fatos e resumos.

## Visão Geral

O sistema de memória é composto por três interfaces principais, cada uma com adaptadores para diferentes bancos de dados:

1. **ConversationMemory**: Armazena o histórico sequencial de mensagens da conversa (memória episódica).
2. **FactMemory**: Armazena fatos discretos, preferências ou pares chave-valor associados a um contexto (memória semântica/perfil).
3. **SummaryMemory**: Armazena resumos de segmentos de conversa (memória resumida).

Cada interface possui adaptadores para SQLite e MongoDB, permitindo escolher a solução de persistência mais adequada para cada caso de uso.

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

Responsável por armazenar fatos discretos (pares chave-valor) associados a um contexto. Útil para armazenar preferências do usuário, informações aprendidas durante a conversa, etc.

Métodos principais:
- `setFact(contextId, key, value)`: Armazena ou atualiza um fato.
- `getFact(contextId, key)`: Recupera o valor de um fato específico.
- `getAllFacts(contextId)`: Recupera todos os fatos para um contexto.
- `deleteFact(contextId, key)`: Remove um fato específico.
- `deleteAllFacts(contextId)`: Remove todos os fatos para um contexto.

### SummaryMemory

Responsável por armazenar resumos de segmentos da conversa. Útil para manter o contexto em conversas longas sem precisar processar todo o histórico.

Métodos principais:
- `addSummary(contextId, summaryContent, timestamp)`: Adiciona um novo resumo.
- `getLatestSummary(contextId)`: Recupera o resumo mais recente.
- `getAllSummaries(contextId, limit)`: Recupera todos os resumos, ordenados do mais recente para o mais antigo.
- `deleteAllSummaries(contextId)`: Remove todos os resumos para um contexto.

## Adaptadores Disponíveis

### SQLite

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

### MongoDB

Adaptadores para armazenamento em banco de dados MongoDB:
- `MongoDBConversationMemoryAdapter`
- `MongoDBFactMemoryAdapter`
- `MongoDBSummaryMemoryAdapter`

Configuração:
```javascript
const { memory } = require('gemini-agent-lib');

const conversationMemory = new memory.MongoDBConversationMemoryAdapter({
    dbConfig: {
        connectionUri: 'mongodb://localhost:27017',
        dbName: 'gemini_agent_memory',
        collectionName: 'chat_history' // opcional, padrão é 'chat_history'
    }
});
```

## Gerenciamento Automático de Memórias

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

### Configuração Básica

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

### Uso Completo (Todos os Tipos de Memória)

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

## Considerações Importantes

1. **IDs de Conversa**: Quando qualquer tipo de memória persistente é configurado, o `ChatAgent` gera automaticamente um ID único (`chatId`) para a conversa, que é usado para associar as informações armazenadas.

2. **Fechamento de Conexões**: Sempre feche as conexões dos adaptadores de memória quando terminar de usá-los, usando o método `close()`.

3. **Tratamento de Erros**: Os métodos de memória do `ChatAgent` tratam erros internamente e não falham completamente se a persistência falhar. Isso garante que o agente continue funcionando mesmo se houver problemas com o banco de dados.

4. **Uso Independente**: Você pode usar apenas um ou dois tipos de memória, dependendo das suas necessidades. Por exemplo, você pode usar apenas `ConversationMemory` para persistir o histórico de mensagens, sem usar `FactMemory` ou `SummaryMemory`.

## Exemplos

Veja exemplos completos de uso do sistema de memória nos arquivos:
- `examples/exemplo-chat-agent-com-memoria.js`: Uso com SQLite e todos os tipos de memória.
- `examples/exemplo-chat-agent-com-mongodb.js`: Uso com MongoDB e todos os tipos de memória.
- `examples/exemplo-chat-agent-com-memoria-parcial.js`: Uso com apenas um tipo de memória.
- `examples/exemplo-chat-agent-sem-memoria.js`: Uso sem memória persistente.
- `examples/exemplo-chat-agent-com-memoria-automatica.js`: Uso com gerenciamento automático de memórias de fatos e resumos.

## Testes

Você pode executar os testes do sistema de memória com:

```bash
node test/test-memory-system.js
```

Este teste verifica o funcionamento básico dos diferentes tipos de memória e seus adaptadores.
