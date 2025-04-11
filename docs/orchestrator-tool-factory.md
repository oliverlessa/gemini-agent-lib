# Orquestradores como Ferramentas (Tools)

## Visão Geral

A biblioteca `gemini-agent-lib` permite transformar orquestradores complexos em ferramentas (tools) que podem ser utilizadas por agentes como `ChatAgent` e `ThinkingAgent`. Esta funcionalidade possibilita que um agente principal delegue tarefas complexas para sistemas de orquestração especializados, que por sua vez podem coordenar múltiplos agentes especialistas.

Este padrão cria uma hierarquia de delegação poderosa:
1. O agente principal (ex: `ChatAgent`) interage diretamente com o usuário
2. Quando necessário, o agente invoca uma ferramenta de orquestração
3. O orquestrador executa sua lógica interna (possivelmente coordenando múltiplos agentes especialistas)
4. O resultado é retornado para o agente principal, que o incorpora em sua resposta ao usuário

## Componentes Essenciais

Para utilizar orquestradores como ferramentas, você precisará dos seguintes componentes:

1. **Orquestradores**: Instâncias de classes como `SequentialAgentChain`, `HierarchicalAgentOrchestrator` ou `AutoGenOrchestrator`.
2. **OrchestratorRegistry**: Um registro central onde as configurações e instâncias dos orquestradores são armazenadas.
3. **createOrchestratorTool**: A função que transforma um orquestrador registrado em uma ferramenta.
4. **Agente Principal**: Um `ChatAgent` ou `ThinkingAgent` que utilizará as ferramentas de orquestração.

## Fluxo de Configuração

### 1. Configurar os Agentes Especialistas

Primeiro, configure os agentes especialistas que serão utilizados pelos orquestradores:

```javascript
// Configurar LLMs para os agentes especialistas
const marketAnalystLLM = new VertexAILLM({...llmConfig, mode: 'oneshot'});
const reportGeneratorLLM = new VertexAILLM({...llmConfig, mode: 'oneshot'});

// Criar agentes especialistas
const marketAnalystAgent = new Agent({
    role: 'Analista de Mercado',
    objective: 'Analisar dados de mercado e identificar tendências',
    llm: marketAnalystLLM,
    task: 'Analisar dados de mercado'
});

const reportGeneratorAgent = new Agent({
    role: 'Gerador de Relatórios',
    objective: 'Criar relatórios detalhados a partir de análises',
    llm: reportGeneratorLLM,
    task: 'Gerar relatório baseado em análises'
});
```

### 2. Configurar o OrchestratorRegistry

Em seguida, crie uma instância do `OrchestratorRegistry` e registre seus orquestradores:

```javascript
const orchestratorRegistry = new OrchestratorRegistry({
    'sequential_market_research': {
        type: 'SequentialAgentChain',
        agents: [marketAnalystAgent, reportGeneratorAgent]
    },
    'hierarchical_support': {
        type: 'HierarchicalAgentOrchestrator',
        agents: [supportL1Agent, supportL2Agent],
        llmConfig: llmConfig
    },
    'autogen_code_generator': {
        type: 'AutoGenOrchestrator',
        llmConfig: llmConfig
    }
});
```

Cada entrada no registro associa um nome único (`sequential_market_research`, etc.) a uma configuração de orquestrador.

### 3. Criar Ferramentas de Orquestração

Utilize a função `createOrchestratorTool` para transformar cada orquestrador registrado em uma ferramenta:

```javascript
const marketResearchTool = createOrchestratorTool(
    'sequential_market_research',  // Nome do orquestrador no registry
    'perform_market_research',     // Nome da ferramenta para o LLM
    'Executa uma pesquisa de mercado completa sobre um tópico específico.',  // Descrição para o LLM
    {  // Schema de parâmetros
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            research_topic: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "O tópico principal da pesquisa de mercado." 
            },
            include_competitors: { 
                type: FunctionDeclarationSchemaType.BOOLEAN, 
                description: "Se deve incluir análise de concorrentes." 
            }
        },
        required: ["research_topic"]
    },
    orchestratorRegistry  // Instância do registry
);
```

Os parâmetros da função `createOrchestratorTool` são:

1. **orchestratorName**: O nome exato do orquestrador no registry.
2. **toolName**: O nome que o LLM usará para chamar a ferramenta.
3. **toolDescription**: A descrição que o LLM verá para entender quando usar a ferramenta.
4. **inputParametersSchema**: A definição dos parâmetros que o orquestrador espera receber.
5. **orchestratorRegistry**: A instância do registro onde o orquestrador está configurado.

### 4. Configurar o Agente Principal

Finalmente, configure o agente principal (`ChatAgent` ou `ThinkingAgent`) com as ferramentas de orquestração:

```javascript
// Para ChatAgent
const chatAgent = new ChatAgent({
    llm: chatLLM,
    role: "Assistente Virtual Avançado",
    objective: "Ajudar o usuário com suas tarefas, utilizando orquestradores especializados quando necessário",
    context: `Você é um Assistente Virtual Avançado com acesso a sistemas de orquestração especializados.
Para tarefas simples, responda diretamente.
Para tarefas complexas, utilize uma das seguintes ferramentas de orquestração:

1. **perform_market_research**: Para realizar pesquisas de mercado detalhadas sobre um tópico específico.
   - Parâmetros: research_topic (obrigatório), include_competitors (opcional)
   - Exemplo: "Preciso de uma análise de mercado sobre carros elétricos"
...`,
    tools: [
        marketResearchTool,
        supportTool,
        codeGeneratorTool
    ],
    conversationMemory: conversationMemory
});

// OU para ThinkingAgent
const thinkingAgent = new ThinkingAgent({
    role: "Analista Estratégico",
    objective: "Analisar solicitações e executar tarefas complexas, delegando quando necessário",
    context: `Você é um Analista Estratégico. Sua função é analisar cuidadosamente a solicitação do usuário...`,
    tools: [
        marketResearchTool,
        supportTool,
        codeGeneratorTool
    ],
    apiKey: process.env.GEMINI_API_KEY,
    useVertexAI: true
});
```

**Importante**: O `context` do agente principal deve explicar claramente as ferramentas de orquestração disponíveis, o que fazem, quando usá-las e quais parâmetros fornecer.

## Fluxo de Execução

Quando o agente principal recebe uma mensagem do usuário, o seguinte fluxo ocorre:

1. O LLM do agente analisa a mensagem e decide se deve usar uma ferramenta de orquestração.
2. Se decidir usar, o LLM gera uma chamada de função com o nome da ferramenta e os argumentos.
3. O agente intercepta essa chamada e executa a função associada à ferramenta.
4. A função (criada por `createOrchestratorTool`):
   - Obtém a instância do orquestrador do `OrchestratorRegistry`
   - Identifica o tipo do orquestrador (Sequential, Hierarchical, AutoGen)
   - Chama o método apropriado do orquestrador (`run`, `orchestrate`, etc.)
   - Formata o resultado e o retorna para o agente
5. O agente envia o resultado da ferramenta de volta para o LLM.
6. O LLM gera a resposta final para o usuário, incorporando o resultado da ferramenta.

## Exemplos Completos

A biblioteca inclui exemplos de uso de orquestradores como ferramentas:

### Para ChatAgent

O arquivo `examples/exemplo-chat-agent-com-orquestradores.js` demonstra como configurar e usar um `ChatAgent` com ferramentas de orquestração.

```bash
node examples/exemplo-chat-agent-com-orquestradores.js
```

### Para ThinkingAgent

O arquivo `examples/exemplo-thinking-agent-com-ferramentas-orquestrador.js` demonstra como configurar e usar um `ThinkingAgent` com ferramentas de orquestração.

```bash
node examples/exemplo-thinking-agent-com-ferramentas-orquestrador.js
```

## Considerações Importantes

### 1. Ordem de Configuração

É essencial configurar o `OrchestratorRegistry` **antes** de chamar `createOrchestratorTool`. A função `createOrchestratorTool` verifica se o orquestrador existe no registro no momento da criação da ferramenta.

### 2. Parâmetros de Entrada

A implementação atual da função `createOrchestratorTool` assume que o primeiro parâmetro definido no `inputParametersSchema` é o input principal para o orquestrador. Por exemplo, se você definir:

```javascript
properties: {
    research_topic: { ... },
    include_competitors: { ... }
}
```

O valor de `research_topic` será passado como o argumento principal para o método do orquestrador.

### 3. Contexto do Agente

O prompt/contexto do agente principal deve explicar claramente as ferramentas de orquestração disponíveis. Isso é crucial para que o LLM saiba quando e como usar cada ferramenta.

### 4. Compatibilidade com Outros Tipos de Ferramentas

Um agente pode ter múltiplas ferramentas de orquestração e também ferramentas comuns. Por exemplo:

```javascript
tools: [
    marketResearchTool,  // Ferramenta de orquestração
    supportTool,         // Ferramenta de orquestração
    calculatorTool       // Ferramenta comum
]
```

### 5. Tratamento de Erros

A função `createOrchestratorTool` inclui tratamento de erros para lidar com problemas durante a execução do orquestrador. Se ocorrer um erro, a ferramenta retornará uma mensagem de erro que será enviada para o LLM.

## Diferenças em Relação à Delegação para Especialistas

A abordagem de usar orquestradores como ferramentas é diferente da funcionalidade de delegação para agentes especialistas (`enableSpecialistDelegation`) do `ChatAgent`:

1. **Orquestradores como Ferramentas**:
   - Usa `OrchestratorRegistry` e `createOrchestratorTool`
   - O LLM decide quando usar a ferramenta com base na descrição
   - Suporta orquestradores complexos que podem coordenar múltiplos agentes
   - Integra-se com o mecanismo padrão de function calling

2. **Delegação para Especialistas**:
   - Usa `AgentRegistry` e a ferramenta `delegate_task_to_specialist`
   - Foca em delegar para um único agente especialista por vez
   - Mais simples para casos de uso diretos

Ambas as abordagens podem ser usadas no mesmo agente, se necessário.

## Conclusão

A capacidade de transformar orquestradores em ferramentas permite criar sistemas de IA conversacional altamente modulares e escaláveis. Esta abordagem separa a lógica de interação com o usuário (agente principal) da lógica de execução de tarefas complexas (orquestradores), resultando em um sistema mais flexível e manutenível.
