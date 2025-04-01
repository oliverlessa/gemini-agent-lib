# Documentação do ChatAgent

## Visão Geral

O `ChatAgent` é uma classe especializada que estende a classe `Agent` base, adicionando funcionalidades para manter o histórico de conversa entre interações com o usuário. Esta classe é ideal para criar chatbots e assistentes conversacionais que precisam lembrar do contexto das interações anteriores.

A classe `ChatAgent` está agora oficialmente implementada na biblioteca `gemini-chain-lib` e pode ser importada diretamente:

```javascript
const { ChatAgent } = require('gemini-chain-lib');
```

## Características Principais

1. **Gerenciamento de Histórico de Conversa**:
   - Mantém um registro completo de todas as mensagens trocadas entre o usuário e o modelo
   - Permite que o agente se lembre de informações mencionadas anteriormente
   - Possibilita respostas contextualizadas com base no histórico da conversa

2. **Suporte a Ferramentas (Function Calling)**:
   - Integração com ferramentas externas através do mecanismo de function calling
   - Processamento de resultados de ferramentas e incorporação no fluxo da conversa
   - Manutenção do contexto mesmo após o uso de ferramentas

3. **Controle de Contexto**:
   - Capacidade de limpar o histórico quando necessário
   - Formatação adequada do histórico para o LLM
   - Gerenciamento de mensagens do sistema, usuário e modelo

## Arquitetura

O `ChatAgent` utiliza a classe `VertexAILLM` configurada no modo "chat" para manter o estado da conversa. A arquitetura é composta por:

1. **Histórico de Conversa**: Array de objetos que armazenam cada mensagem com seu papel (role) e conteúdo
2. **Processador de Mensagens**: Métodos para processar mensagens do usuário e gerar respostas
3. **Gerenciador de Ferramentas**: Funcionalidades para executar ferramentas e processar seus resultados
4. **Formatador de Histórico**: Conversão do histórico interno para o formato esperado pelo LLM

## Como Utilizar

### Inicialização Básica

O `ChatAgent` pode ser inicializado de duas maneiras: fornecendo uma instância de LLM personalizada ou deixando que o agente crie automaticamente uma instância padrão do `VertexAILLM`.

#### Inicialização com LLM personalizado

```javascript
// Inicializa o LLM no modo chat
const llm = new VertexAILLM({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    modelName: "gemini-1.0-pro",
    mode: "chat",
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2
    }
});

// Cria uma instância do ChatAgent com o LLM personalizado
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas perguntas e tarefas",
    context: "Você é um assistente pessoal útil e amigável chamado GeminiBot.",
    llm: llm
});
```

#### Inicialização com LLM padrão (automático)

```javascript
// Cria uma instância do ChatAgent sem fornecer um LLM
// Um VertexAILLM padrão será instanciado automaticamente
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas perguntas e tarefas",
    context: "Você é um assistente pessoal útil e amigável chamado GeminiBot."
});
```

Quando não é fornecido um LLM, o `ChatAgent` cria automaticamente uma instância do `VertexAILLM` com a seguinte configuração padrão:

```javascript
const llm = new VertexAILLM({
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    modelName: "gemini-2.0-flash-001",
    mode: "chat",
    generationConfig: {
        maxOutputTokens: 2048,
        temperature: 0.2
    }
});
```

> **Nota**: Para que a inicialização automática funcione, as variáveis de ambiente `GOOGLE_CLOUD_PROJECT_ID` e `GOOGLE_APPLICATION_CREDENTIALS` devem estar configuradas no ambiente.

### Processamento de Mensagens

```javascript
// Processa uma mensagem do usuário
const resposta = await chatAgent.processUserMessage("Olá! Quem é você?");
console.log(resposta.text);

// Processa uma segunda mensagem (mantém o contexto)
const resposta2 = await chatAgent.processUserMessage("Qual é o seu propósito?");
console.log(resposta2.text);
```

### Uso com Ferramentas

```javascript
// Define uma ferramenta
const weatherTool = {
    name: "obter_previsao_tempo",
    description: "Obtém a previsão do tempo para uma cidade",
    parameters: {
        type: "OBJECT",
        properties: {
            cidade: {
                type: "STRING",
                description: "Nome da cidade"
            }
        },
        required: ["cidade"]
    },
    function: async (args) => {
        // Implementação da função
        return {
            cidade: args.cidade,
            temperatura: "25°C",
            condicao: "Ensolarado"
        };
    }
};

// Adiciona a ferramenta ao agente
chatAgent.tools = [weatherTool];

// Processa uma mensagem que pode acionar a ferramenta
// O método processUserMessage agora processa automaticamente as function calls
const resposta = await chatAgent.processUserMessage("Como está o tempo em São Paulo hoje?");
console.log(resposta.text);

// Não é mais necessário verificar e processar manualmente a function call
// O método processUserMessage já faz isso automaticamente, incluindo:
// 1. Detectar a function call
// 2. Encontrar e executar a ferramenta correspondente
// 3. Processar o resultado e enviá-lo de volta ao LLM
// 4. Gerar uma resposta final com base no resultado
// 5. Atualizar o histórico de conversa com todas as interações
```

### Gerenciamento de Histórico

```javascript
// Limpa o histórico de conversa
chatAgent.clearHistory();

// Inicia uma nova conversa
const resposta = await chatAgent.processUserMessage("Olá novamente!");
```

## Fluxo de Processamento

1. **Recebimento da Mensagem**:
   - O usuário envia uma mensagem para o agente
   - A mensagem é armazenada como a tarefa atual do agente
   - A mensagem do usuário é adicionada ao histórico

2. **Preparação do Contexto**:
   - O histórico de conversa é formatado para o LLM
   - As ferramentas disponíveis são preparadas

3. **Geração da Resposta**:
   - O LLM processa a mensagem com base no histórico e contexto
   - A resposta é gerada e pode incluir uma function call

4. **Processamento de Function Calls (Loop Automático)**:
   - Se houver uma function call na resposta:
     - A resposta com a function call é adicionada ao histórico
     - A ferramenta correspondente é encontrada e executada
     - O resultado da ferramenta é adicionado ao histórico
     - O resultado é enviado de volta ao LLM para gerar uma nova resposta
     - Este processo se repete enquanto houver function calls nas respostas
   - Se não houver function call, o processo continua normalmente

5. **Finalização**:
   - A resposta final (sem function call) é adicionada ao histórico
   - A resposta é retornada ao chamador do método

## Considerações Técnicas

1. **Modo Chat do LLM**:
   - O `ChatAgent` requer que o LLM esteja configurado no modo "chat"
   - Um aviso é exibido se o LLM não estiver no modo correto
   - Quando o LLM é instanciado automaticamente, ele já é configurado no modo "chat"

2. **Gerenciamento de Memória**:
   - O histórico de conversa cresce a cada interação
   - Para conversas muito longas, pode ser necessário implementar uma estratégia de resumo ou truncamento

3. **Segurança**:
   - Ao implementar ferramentas, especialmente aquelas que executam código (como a calculadora de exemplo), é importante considerar aspectos de segurança
   - O uso de `eval()` no exemplo da calculadora é apenas para demonstração e não deve ser usado em produção

4. **Integração com Outros Componentes**:
   - O `ChatAgent` pode ser integrado com outros componentes do sistema, como bancos de dados para persistência de histórico
   - Pode ser estendido para incluir funcionalidades adicionais, como análise de sentimento ou detecção de intenção

## Exemplo de Uso Completo

A biblioteca inclui dois exemplos de uso do `ChatAgent`:

### Exemplo Completo

O arquivo `test-chat-agent.js` contém um exemplo completo de uso do `ChatAgent`, demonstrando:

1. Inicialização do agente
2. Processamento de mensagens simples
3. Manutenção de contexto entre mensagens
4. Uso de ferramentas (previsão do tempo e calculadora)
5. Gerenciamento de histórico (limpeza e reinício)

Para executar o exemplo:

```bash
node test-chat-agent.js
```

### Exemplo Simplificado

O arquivo `test-chat-agent-simple.js` contém um exemplo mais simples e direto:

1. Inicialização do LLM no modo chat
2. Criação do ChatAgent
3. Processamento de mensagens básicas
4. Uso de uma ferramenta simples (calculadora)
5. Limpeza de histórico

Para executar o exemplo simplificado:

```bash
node test-chat-agent-simple.js
```

## Delegação para Agentes Especialistas

O `ChatAgent` agora suporta a delegação de tarefas para agentes especialistas, permitindo que o agente principal encaminhe solicitações específicas para agentes especializados em determinados domínios.

### Visão Geral da Delegação

A funcionalidade de delegação permite que o `ChatAgent` atue como um "roteador" que:

1. Mantém a conversa principal com o usuário
2. Identifica quando uma solicitação requer conhecimento ou ação especializada
3. Delega a tarefa para um agente especialista apropriado
4. Recebe a resposta do especialista e a integra na conversa

Esta abordagem permite criar um sistema de conversação mais robusto e escalável, onde cada agente especialista pode se concentrar em um domínio específico.

### Componentes da Delegação

A implementação da delegação envolve dois componentes principais:

1. **AgentRegistry**: Uma classe que gerencia a criação e configuração de agentes especialistas
2. **Ferramenta de Delegação**: Uma ferramenta especial (`delegate_task_to_specialist`) que o LLM pode invocar para delegar tarefas

### Inicialização com Delegação

```javascript
// Configuração dos agentes especialistas
const specialistAgentsConfig = {
    "Tradutor EN-PT": {
        objective: "Traduzir textos do inglês para o português brasileiro.",
        context: "Você é um tradutor especializado. Traduza o texto fornecido do inglês para o português brasileiro de forma precisa e natural.",
        llmMode: 'oneshot'
    },
    "Pesquisador Financeiro": {
        objective: "Fornecer análises e informações sobre mercados financeiros.",
        context: "Você é um pesquisador financeiro especializado. Forneça análises claras e objetivas.",
        enableGoogleSearch: true,
        llmMode: 'oneshot'
    }
};

// Cria uma instância do ChatAgent com delegação habilitada
const chatAgent = new ChatAgent({
    role: "Assistente Virtual",
    objective: "Ajudar o usuário com suas dúvidas e tarefas",
    context: "Você é um assistente virtual inteligente que pode delegar tarefas para especialistas.",
    llm: llm,
    tools: [minhaFerramenta1, minhaFerramenta2],
    enableSpecialistDelegation: true, // Habilita a delegação
    specialistAgentsConfig: specialistAgentsConfig // Configuração dos especialistas
});
```

### Gerenciamento de Especialistas

O `ChatAgent` fornece métodos para gerenciar os agentes especialistas:

```javascript
// Registrar um novo especialista
chatAgent.registerSpecialist("Analista de Dados", {
    objective: "Analisar dados e gerar insights estatísticos.",
    context: "Você é um analista de dados especializado em estatística e visualização de dados.",
    llmMode: 'oneshot'
});

// Remover um especialista
chatAgent.unregisterSpecialist("Analista de Dados");

// Obter a lista de especialistas disponíveis
const availableRoles = chatAgent.getAvailableSpecialistRoles();
console.log(`Especialistas disponíveis: ${availableRoles.join(', ')}`);

// Habilitar/desabilitar a delegação dinamicamente
chatAgent.disableSpecialistDelegation();
chatAgent.enableSpecialistDelegation(novaConfiguracao);
```

### Fluxo de Delegação

Quando o `ChatAgent` recebe uma mensagem do usuário:

1. O LLM analisa a mensagem e decide se deve responder diretamente ou delegar
2. Se decidir delegar, invoca a ferramenta `delegate_task_to_specialist` com:
   - `specialist_role`: O papel do especialista a ser consultado
   - `task_for_specialist`: A descrição da tarefa para o especialista
3. O `ChatAgent` obtém o agente especialista do `AgentRegistry`
4. O agente especialista executa a tarefa e retorna uma resposta
5. O `ChatAgent` integra a resposta do especialista na conversa
6. O LLM gera uma resposta final para o usuário

### Uso Avançado: AgentRegistry Compartilhado

Para cenários mais complexos, é possível compartilhar um `AgentRegistry` entre múltiplos `ChatAgent`:

```javascript
// Criar um registry compartilhado
const sharedRegistry = new AgentRegistry(specialistAgentsConfig);

// Criar múltiplos ChatAgents que compartilham o mesmo registry
const chatAgent1 = new ChatAgent({
    role: "Assistente 1",
    llm: llm1,
    enableSpecialistDelegation: true,
    agentRegistry: sharedRegistry
});

const chatAgent2 = new ChatAgent({
    role: "Assistente 2",
    llm: llm2,
    enableSpecialistDelegation: true,
    agentRegistry: sharedRegistry
});

// Adicionar um novo especialista (afeta ambos os agentes)
sharedRegistry.registerSpecialist("Novo Especialista", { /* configuração */ });
```

### Exemplo Completo

A biblioteca inclui um exemplo completo de uso do `ChatAgent` com delegação:

```bash
node examples/exemplo-chat-agent-com-delegacao.js
```

Este exemplo demonstra:
1. Configuração de agentes especialistas
2. Inicialização do ChatAgent com delegação
3. Registro e gerenciamento de especialistas
4. Processamento de mensagens com delegação
5. Diferentes formas de configurar a delegação

### Considerações sobre Delegação

1. **Desempenho**: Cada agente especialista usa sua própria instância de LLM, o que pode aumentar o uso de recursos
2. **Contexto**: Os agentes especialistas não têm acesso ao histórico completo da conversa, apenas à tarefa delegada
3. **Configuração do LLM**: Cada especialista pode usar um modelo e configurações diferentes, otimizados para sua tarefa
4. **Ferramentas Específicas**: Cada especialista pode ter suas próprias ferramentas específicas

## Extensões Possíveis

1. **Persistência de Histórico**:
   - Salvar o histórico em um banco de dados
   - Carregar histórico de conversas anteriores

2. **Resumo de Contexto**:
   - Implementar um mecanismo para resumir conversas longas
   - Manter apenas as informações mais relevantes

3. **Múltiplos Usuários**:
   - Adaptar o agente para lidar com múltiplos usuários
   - Manter históricos separados por usuário

4. **Análise de Sentimento**:
   - Adicionar análise de sentimento para adaptar o tom das respostas
   - Detectar frustração ou satisfação do usuário

5. **Integração com Interfaces**:
   - Conectar o agente a interfaces de chat (web, mobile, etc.)
   - Implementar webhooks para plataformas de mensageria

6. **Aprimoramento da Delegação**:
   - Implementar mecanismos de feedback para melhorar as decisões de delegação
   - Adicionar capacidade de delegação em cascata (especialistas delegando para sub-especialistas)
   - Desenvolver especialistas que mantêm seu próprio histórico interno
