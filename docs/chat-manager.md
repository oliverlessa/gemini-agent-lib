# ChatManager

O `ChatManager` é um componente da biblioteca `gemini-agent-lib` que permite gerenciar múltiplas sessões de `ChatAgent` para diferentes usuários, mantendo seus históricos e memórias isolados.

## Visão Geral

Em aplicações reais de chatbot (web, API, etc.), múltiplos usuários interagem simultaneamente com o sistema. O `ChatManager` resolve o problema de gerenciar essas múltiplas conversas, garantindo que:

- Cada usuário tenha sua própria instância de `ChatAgent`
- O histórico de conversas, fatos aprendidos e resumos de um usuário não se misturem com os de outro
- Os recursos (como LLM e adaptadores de memória) sejam compartilhados eficientemente entre as instâncias

## Características Principais

- **Gerenciamento de Sessões**: Cria e gerencia instâncias de `ChatAgent` para cada sessão de usuário
- **Compartilhamento de Recursos**: Compartilha instâncias de LLM e adaptadores de memória entre as sessões
- **Isolamento de Dados**: Garante que os dados de cada usuário permaneçam isolados, mesmo usando o mesmo banco de dados
- **Suporte a Delegação**: Permite configurar delegação para agentes especialistas de forma centralizada
- **Gerenciamento de Ciclo de Vida**: Facilita a criação, recuperação e encerramento de sessões

## Instalação

O `ChatManager` é parte da biblioteca `gemini-agent-lib`. Não é necessária instalação adicional além da própria biblioteca.

```bash
npm install gemini-agent-lib
```

## Uso Básico

```javascript
const { ChatManager } = require('gemini-agent-lib');

// Configuração do ChatManager
const chatManager = new ChatManager({
    llmConfig: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
        modelName: "gemini-2.0-flash-001"
    },
    agentConfig: {
        role: "Assistente Virtual",
        objective: "Ajudar o usuário com suas tarefas"
    },
    memoryConfig: {
        conversation: {
            type: 'SQLiteConversationMemoryAdapter',
            dbConfig: { dbPath: './chats.db' }
        }
    }
});

// Processar mensagem de um usuário
async function handleUserMessage(userId, message) {
    const response = await chatManager.processMessage(userId, message);
    return response.text;
}

// Encerrar o ChatManager quando a aplicação for finalizada
process.on('SIGTERM', async () => {
    await chatManager.shutdown();
    process.exit(0);
});
```

## API

### Construtor

```javascript
new ChatManager({
    llmConfig,
    agentConfig = {},
    memoryConfig = {},
    delegationConfig = {},
    shareMemoryInstances = true
})
```

#### Parâmetros

- **llmConfig** (obrigatório): Configuração para o modelo de linguagem
  - **projectId** (obrigatório): ID do projeto Google Cloud
  - **credentialsPath** (opcional): Caminho para as credenciais
  - **apiKey** (opcional): API Key alternativa
  - **modelName** (opcional, padrão: "gemini-2.0-flash-001"): Nome do modelo
  - **generationConfig** (opcional): Configurações de geração

- **agentConfig** (opcional): Configuração base para todos os agentes
  - **role** (opcional): Papel do agente
  - **objective** (opcional): Objetivo do agente
  - **context** (opcional): Contexto ou instruções para o agente
  - **tools** (opcional): Ferramentas disponíveis para o agente

- **memoryConfig** (opcional): Configuração dos adaptadores de memória
  - **conversation** (opcional): Configuração do adaptador de memória de conversação
    - **type** (obrigatório): Tipo do adaptador (ex: 'SQLiteConversationMemoryAdapter')
    - **dbConfig** (obrigatório): Configuração específica do adaptador
  - **fact** (opcional): Configuração do adaptador de memória de fatos
  - **summary** (opcional): Configuração do adaptador de memória de resumos

- **delegationConfig** (opcional): Configuração para delegação de especialistas
  - **enabled** (opcional, padrão: false): Habilita delegação
  - **specialistAgentsConfig** (opcional): Configuração dos agentes especialistas
  - **agentRegistry** (opcional): Instância compartilhada de AgentRegistry

- **shareMemoryInstances** (opcional, padrão: true): Se true, compartilha instâncias de memória entre os agentes

### Métodos

#### getOrCreateSession(sessionId, sessionOptions = {})

Obtém ou cria uma sessão de ChatAgent para um determinado ID.

- **sessionId** (obrigatório): Identificador único para a sessão/usuário
- **sessionOptions** (opcional): Opções específicas para esta sessão, que podem sobrescrever a configuração base do agente
- **Retorna**: Promise com a instância de ChatAgent para a sessão

#### processMessage(sessionId, message, sessionOptions = {})

Processa uma mensagem de um usuário em uma sessão específica.

- **sessionId** (obrigatório): O ID da sessão/usuário
- **message** (obrigatório): A mensagem do usuário
- **sessionOptions** (opcional): Opções para passar para getOrCreateSession se a sessão precisar ser criada
- **Retorna**: Promise com a resposta do ChatAgent (geralmente { text: "..." })

#### endSession(sessionId)

Encerra uma sessão específica, removendo a instância do agente da memória ativa.

- **sessionId** (obrigatório): O ID da sessão a ser encerrada
- **Retorna**: True se a sessão foi encontrada e removida, false caso contrário

#### clearSessionHistory(sessionId)

Limpa o histórico de uma sessão específica (na memória persistente, se houver).

- **sessionId** (obrigatório): O ID da sessão cujo histórico deve ser limpo
- **Retorna**: Promise que resolve quando o histórico for limpo

#### shutdown()

Fecha todas as conexões de recursos compartilhados (LLM, Memórias).

- **Retorna**: Promise que resolve quando todos os recursos forem liberados

## Exemplos

### Exemplo 1: Aplicação Web com Express

```javascript
const express = require('express');
const { ChatManager } = require('gemini-agent-lib');
const app = express();
app.use(express.json());

// Inicializar o ChatManager
const chatManager = new ChatManager({
    llmConfig: {
        projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
        credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
    },
    memoryConfig: {
        conversation: {
            type: 'MongoDBConversationMemoryAdapter',
            dbConfig: { 
                connectionUri: process.env.MONGODB_URI,
                dbName: 'chatbot'
            }
        }
    }
});

// Rota para processar mensagens
app.post('/api/chat', async (req, res) => {
    try {
        const { userId, message } = req.body;
        
        if (!userId || !message) {
            return res.status(400).json({ error: 'userId e message são obrigatórios' });
        }
        
        const response = await chatManager.processMessage(userId, message);
        res.json({ response: response.text });
    } catch (error) {
        console.error('Erro ao processar mensagem:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para limpar histórico
app.post('/api/chat/clear', async (req, res) => {
    try {
        const { userId } = req.body;
        
        if (!userId) {
            return res.status(400).json({ error: 'userId é obrigatório' });
        }
        
        await chatManager.clearSessionHistory(userId);
        res.json({ success: true });
    } catch (error) {
        console.error('Erro ao limpar histórico:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Iniciar o servidor
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

// Encerrar o ChatManager quando o servidor for finalizado
process.on('SIGTERM', async () => {
    console.log('Encerrando servidor...');
    server.close(async () => {
        await chatManager.shutdown();
        console.log('Servidor encerrado');
        process.exit(0);
    });
});
```

### Exemplo 2: Aplicação de Terminal com Múltiplos Usuários

Veja o exemplo completo em `examples/exemplo-chat-manager.js`.

## Considerações Importantes

### Gerenciamento de sessionId

A aplicação externa é responsável por gerar e manter os `sessionId`s (que podem ser IDs de usuário, IDs de sessão web, etc.) e passá-los corretamente para o `ChatManager`. Recomenda-se:

- Usar IDs únicos e persistentes para cada usuário
- Validar os IDs antes de passá-los para o `ChatManager`
- Implementar mecanismos de segurança para evitar que um usuário acesse a conversa de outro

### Concorrência de Banco de Dados

Se você estiver usando SQLite com `shareMemoryInstances: true`, escritas concorrentes de diferentes usuários no mesmo arquivo podem causar bloqueios (`SQLITE_BUSY`). Opções para lidar com isso:

- Usar MongoDB em vez de SQLite para melhor suporte a concorrência
- Configurar SQLite para usar o modo WAL (Write-Ahead Logging)
- Usar `shareMemoryInstances: false` para criar instâncias separadas de adaptadores de memória para cada sessão

### Gerenciamento de Recursos

O `ChatManager` centraliza a criação de LLMs e Memórias (se compartilhadas). É importante:

- Chamar o método `shutdown()` quando a aplicação estiver encerrando para liberar recursos
- Implementar lógica para encerrar sessões inativas para liberar memória

## Integração com Outros Componentes

O `ChatManager` integra-se bem com outros componentes da biblioteca:

- **AgentRegistry**: Pode ser compartilhado entre todas as sessões para delegação de especialistas
- **Adaptadores de Memória**: Podem ser compartilhados entre sessões para eficiência
- **VertexAILLM**: Uma única instância pode ser compartilhada entre todas as sessões

## Limitações Atuais

- A implementação atual não suporta completamente `shareMemoryInstances: false` (criar instâncias de memória dedicadas para cada sessão)
- Não há mecanismo automático para expirar sessões inativas
- Não há suporte nativo para balanceamento de carga entre múltiplas instâncias do `ChatManager`

## Próximos Passos

Possíveis melhorias futuras para o `ChatManager`:

- Implementar suporte completo para `shareMemoryInstances: false`
- Adicionar mecanismo de expiração de sessões inativas
- Adicionar suporte para memória semântica
- Implementar balanceamento de carga entre múltiplas instâncias
- Adicionar métricas e telemetria para monitoramento
