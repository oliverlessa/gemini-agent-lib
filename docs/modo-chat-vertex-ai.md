# Documentação do Modo Chat na Classe VertexAILLM

## Visão Geral

O modo `chat` na classe `VertexAILLM` foi aprimorado para utilizar de forma mais eficiente os recursos disponíveis na API do Vertex AI. As melhorias implementadas permitem um melhor gerenciamento do contexto da conversa, configuração otimizada das opções do modelo e maior coerência nas respostas.

## Principais Melhorias

### 1. Inicialização Otimizada do Chat

O chat agora é inicializado sob demanda com todos os parâmetros relevantes, incluindo:

- **Histórico completo**: O histórico da conversa é passado diretamente na inicialização do chat.
- **Configurações de segurança**: As configurações de segurança são aplicadas na inicialização.
- **Configuração de geração**: Parâmetros como `maxOutputTokens` e `temperature` são configurados uma única vez.
- **Ferramentas**: As ferramentas disponíveis são configuradas na inicialização do chat.
- **Instruções do sistema**: O contexto do sistema é configurado na inicialização.

### 2. Reinicialização Inteligente

O chat é reinicializado apenas quando necessário, com base em:

- Mudanças nas ferramentas disponíveis
- Alterações no contexto do sistema

Isso evita a perda desnecessária de contexto e melhora a eficiência das chamadas à API.

### 3. Gerenciamento de Estado

A classe agora mantém o estado interno do chat, armazenando:

- Ferramentas atuais
- Contexto atual
- Sessão de chat ativa

## Como Utilizar

### Inicialização Básica

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

### Envio de Mensagens

```javascript
// Primeira mensagem
const resposta1 = await llm.generateContent({
    prompt: "Olá! Como posso ajudar?",
    context: "Você é um assistente útil."
});

// Segunda mensagem (mantém o contexto automaticamente)
const resposta2 = await llm.generateContent({
    prompt: "Qual é a capital do Brasil?"
});
```

### Uso com Histórico Explícito

```javascript
const historico = [
    { role: "user", parts: [{ text: "Qual é a capital do Brasil?" }] },
    { role: "model", parts: [{ text: "A capital do Brasil é Brasília." }] }
];

const resposta = await llm.generateContent({
    prompt: "E qual é a população aproximada dessa cidade?",
    context: "Você é um assistente útil.",
    history: historico
});
```

### Uso com Ferramentas (Function Calling)

```javascript
const ferramentas = [
    {
        functionDeclarations: [
            {
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
                }
            }
        ]
    }
];

const resposta = await llm.generateContent({
    prompt: "Como está o tempo em São Paulo hoje?",
    context: "Use as ferramentas disponíveis quando necessário.",
    tools: ferramentas
});

// Verificar se há function call na resposta
if (resposta.functionCall) {
    console.log("Function Call:", resposta.functionCall);
    // Processar a function call...
}
```

## Benefícios

1. **Melhor Gerenciamento do Contexto**:
   - O histórico completo é passado na inicialização do chat
   - O contexto da conversa é preservado entre chamadas

2. **Inicialização Otimizada**:
   - O chat é inicializado apenas quando necessário
   - Todas as configurações relevantes são passadas de uma vez

3. **Reinicialização Inteligente**:
   - O chat é reinicializado apenas quando as ferramentas ou o contexto mudam
   - Isso evita perda desnecessária de contexto

4. **Uso Eficiente dos Recursos da API**:
   - Aproveitamento completo dos parâmetros disponíveis no método `startChat()`
   - Configurações como `safetySettings` e `generationConfig` são passadas corretamente

## Exemplo de Teste

Um arquivo de teste `test-vertex-chat-mode.js` foi criado para demonstrar o uso do modo chat com as novas melhorias. Este teste inclui:

1. Inicialização do modelo no modo chat
2. Envio de mensagens simples
3. Teste de manutenção de contexto
4. Uso de histórico explícito
5. Uso de ferramentas (function calling)
6. Teste de reinicialização com contexto diferente

Para executar o teste:

```bash
node test-vertex-chat-mode.js
```

## Considerações Técnicas

- A classe utiliza a versão Preview da API do Vertex AI (`this.vertexAI.preview.getGenerativeModel`)
- O método `shouldReinitializeChat` determina quando o chat deve ser reinicializado
- As configurações atuais são armazenadas em `this._currentTools` e `this._currentContext`
