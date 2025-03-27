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

// Cria uma instância do ChatAgent
const chatAgent = new ChatAgent({
    role: "Assistente Pessoal",
    objective: "Ajudar o usuário com suas perguntas e tarefas",
    context: "Você é um assistente pessoal útil e amigável chamado GeminiBot.",
    llm: llm
});
```

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
