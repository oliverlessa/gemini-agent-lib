# Formatadores de Tarefa Personalizados

## Introdução

Os formatadores de tarefa personalizados são uma nova funcionalidade adicionada à classe `Agent` e aos orquestradores hierárquicos (`HierarchicalAgentOrchestrator` e `HierarchicalAgentThinkingOrchestrator`). Esta funcionalidade permite definir formatos de tarefa específicos para cada agente, proporcionando maior flexibilidade e controle sobre como as tarefas são apresentadas aos agentes especialistas.

## Como Funciona

Cada agente pode ter um formatador de tarefa personalizado definido como uma função que recebe a tarefa original e o próprio agente como parâmetros, e retorna a tarefa formatada. O orquestrador verifica se o agente possui um formatador personalizado e, se existir, utiliza-o para formatar a tarefa antes de enviá-la ao agente.

### Ordem de Prioridade

O orquestrador segue a seguinte ordem de prioridade ao determinar como formatar a tarefa para um agente:

1. Se o agente possui um `taskFormatter` definido, usa-o para formatar a tarefa.
2. Se o agente tem `enableGoogleSearch === true`, usa um formato específico para pesquisa no Google.
3. Caso contrário, usa o formato padrão.

## Como Usar

### 1. Definir um Formatador de Tarefa Personalizado

Ao criar um agente, você pode definir um formatador de tarefa personalizado como uma função:

```javascript
const resumeAgent = new Agent({
    role: "Resumidor",
    objective: "Criar resumos concisos de textos longos",
    llm: someLLM,
    taskFormatter: (task, agent) => {
        return `Crie um resumo conciso do seguinte texto, em no máximo 3 parágrafos:
        
        "${task}"
        
        Use seu conhecimento como ${agent.role} para destacar apenas os pontos mais importantes.`;
    }
});
```

### 2. Usar o Agente com um Orquestrador

O orquestrador detectará automaticamente o formatador personalizado e o utilizará:

```javascript
const orchestrator = new HierarchicalAgentOrchestrator(
    [resumeAgent, otherAgent1, otherAgent2],
    llm
);

// Ou com o orquestrador thinking
const thinkingOrchestrator = new HierarchicalAgentThinkingOrchestrator(
    [resumeAgent, otherAgent1, otherAgent2],
    {
        apiKey: apiKey,
        useVertexAI: true,
        vertexConfig: {...}
    }
);

// Executar a orquestração
const resposta = await orchestrator.orchestrate("Alguma tarefa aqui");
```

## Exemplos de Formatadores Personalizados

### Agente Resumidor

```javascript
taskFormatter: (task, agent) => {
    return `Crie um resumo conciso do seguinte texto, em no máximo 3 parágrafos:
    
    "${task}"
    
    Use seu conhecimento como ${agent.role} para destacar apenas os pontos mais importantes.`;
}
```

### Agente Tradutor

```javascript
taskFormatter: (task, agent) => {
    return `Traduza o seguinte texto para o inglês:
    
    "${task}"
    
    Mantenha o tom e o estilo do texto original.`;
}
```

### Agente Analista

```javascript
taskFormatter: (task, agent) => {
    return `Analise criticamente o seguinte texto:
    
    "${task}"
    
    Identifique:
    1. Principais argumentos apresentados
    2. Pontos fortes da argumentação
    3. Possíveis falhas ou lacunas
    4. Sugestões de melhoria`;
}
```

### Agente de Código

```javascript
taskFormatter: (task, agent) => {
    return `Implemente uma solução em JavaScript para o seguinte problema:
    
    "${task}"
    
    Requisitos:
    - Código limpo e bem comentado
    - Tratamento de erros adequado
    - Otimização de desempenho quando possível`;
}
```

## Benefícios

1. **Flexibilidade**: Cada agente pode ter seu próprio formato de tarefa personalizado.
2. **Especialização**: As tarefas podem ser formatadas de maneira específica para cada tipo de agente.
3. **Extensibilidade**: Novos tipos de agentes podem ser facilmente adicionados sem modificar o código do orquestrador.
4. **Manutenção da compatibilidade**: O comportamento existente para agentes padrão e agentes com Google Search é preservado.
5. **Separação de responsabilidades**: A lógica de formatação da tarefa pode ser encapsulada no próprio agente.

## Exemplos de Uso

Dois exemplos completos estão disponíveis:

1. `exemplo-formatadores-personalizados.js` - Demonstra o uso com `HierarchicalAgentOrchestrator`
2. `exemplo-formatadores-personalizados-thinking.js` - Demonstra o uso com `HierarchicalAgentThinkingOrchestrator`

Execute estes exemplos para ver os formatadores de tarefa personalizados em ação.
