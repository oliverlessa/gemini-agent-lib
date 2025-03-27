# Gerenciamento de Dependências entre Agentes no AutoGenOrchestrator

Este documento explica como o `AutoGenOrchestrator` gerencia dependências entre agentes, garantindo que eles sejam acionados na ordem correta quando a tarefa de um agente depende da saída de outro.

## Visão Geral

O sistema de dependências permite que o orquestrador:

1. Identifique quais sub-tarefas dependem de outras
2. Ordene a execução das sub-tarefas para respeitar essas dependências
3. Passe os resultados de sub-tarefas anteriores como contexto para sub-tarefas dependentes

## Como Funciona

### 1. Definição de Dependências no Plano

Durante a fase de planejamento, o orquestrador instrui o LLM a identificar dependências entre sub-tarefas. Cada sub-tarefa recebe:

- Um identificador único (`id`)
- Um array de dependências (`dependsOn`) que lista os IDs de outras sub-tarefas das quais ela depende

Exemplo de plano com dependências:

```json
{
  "subTasks": [
    {
      "id": "task1",
      "taskDescription": "Pesquisar informações sobre IA generativa",
      "agentRole": "Pesquisador",
      "agentObjective": "Coletar informações atualizadas sobre IA generativa",
      "agentTaskPrompt": "Pesquise e liste os principais modelos de IA generativa atuais",
      "enableGoogleSearch": true,
      "dependsOn": [] // Não depende de nenhuma outra tarefa
    },
    {
      "id": "task2",
      "taskDescription": "Analisar tendências com base nas informações coletadas",
      "agentRole": "Analista",
      "agentObjective": "Identificar padrões e tendências nos dados coletados",
      "agentTaskPrompt": "Analise as informações sobre modelos de IA generativa e identifique tendências",
      "enableGoogleSearch": false,
      "dependsOn": ["task1"] // Depende da tarefa 1
    }
  ]
}
```

### 2. Ordenação Topológica

O orquestrador usa um algoritmo de ordenação topológica para determinar a sequência correta de execução das sub-tarefas:

1. Constrói um grafo direcionado onde cada nó é uma sub-tarefa
2. Adiciona arestas de uma sub-tarefa para todas as sub-tarefas que dependem dela
3. Calcula o grau de entrada de cada nó (número de dependências)
4. Inicia com nós de grau zero (sem dependências)
5. Remove um nó, diminui o grau de seus vizinhos, e adiciona à fila os novos nós de grau zero
6. Repete até processar todos os nós ou detectar um ciclo

```
Exemplo de Grafo:
task1 → task2 → task4
   ↓
task3
```

Ordem de execução: `task1` → `task2` → `task3` → `task4`

### 3. Passagem de Contexto

Quando uma sub-tarefa depende de outras, o orquestrador:

1. Recupera os resultados das sub-tarefas das quais ela depende
2. Adiciona esses resultados ao prompt da sub-tarefa atual
3. Permite que o agente use essas informações para executar sua tarefa

Exemplo de prompt com contexto de dependência:

```
Analise as informações sobre modelos de IA generativa e identifique tendências.

**Resultados de Tarefas Anteriores:**

--- Resultado da Tarefa task1 ---
Os principais modelos de IA generativa atuais são:
1. GPT-4 (OpenAI): Modelo multimodal capaz de processar texto e imagens...
2. Claude 3 (Anthropic): Focado em diálogo seguro e útil...
3. Gemini (Google): Modelo multimodal com capacidades avançadas...
...
```

### 4. Detecção de Ciclos

O sistema detecta ciclos de dependência (quando A depende de B, B depende de C, e C depende de A) e emite um aviso. Quando um ciclo é detectado, o sistema usa a ordem original das sub-tarefas no plano.

## Como Usar

Para aproveitar o sistema de dependências, basta formular a tarefa de forma que as dependências sejam claras:

```javascript
const userTask = `
  Crie um artigo técnico sobre Inteligência Artificial Generativa seguindo estas etapas:
  
  1. Primeiro, pesquise e liste os principais modelos de IA generativa atuais.
  2. Em seguida, com base nos modelos identificados, analise as tendências.
  3. Depois, usando as tendências identificadas, faça previsões sobre o futuro.
  4. Por fim, com base em toda a análise anterior, elabore um artigo técnico completo.
  
  Observe que cada etapa depende da anterior, então é importante seguir a ordem correta.
`;

const orchestrator = new AutoGenOrchestrator({...});
const resultado = await orchestrator.orchestrateTask(userTask);
```

## Dicas para Formular Tarefas com Dependências

1. **Seja explícito sobre a ordem**: Indique claramente quando uma etapa depende de outra
2. **Use numeração sequencial**: Enumere as etapas para indicar a ordem
3. **Use frases de conexão**: "Com base em", "Utilizando os resultados de", "A partir das informações anteriores"
4. **Mencione explicitamente dependências**: "Esta etapa depende da anterior"

## Limitações Atuais

- Não há execução paralela de sub-tarefas independentes
- Ciclos de dependência são detectados mas não resolvidos automaticamente
- Dependências complexas (AND/OR) não são suportadas diretamente

## Exemplo Completo

Veja o arquivo `test-auto-gen-orchestrator-dependencies.js` para um exemplo completo de como usar o sistema de dependências entre agentes.
