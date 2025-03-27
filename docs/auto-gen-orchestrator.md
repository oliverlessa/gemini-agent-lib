# AutoGenOrchestrator - Orquestrador Autônomo de Agentes

O `AutoGenOrchestrator` é um componente avançado da biblioteca GeminiChain que permite a orquestração autônoma de múltiplos agentes especializados para resolver tarefas complexas.

## Visão Geral

O `AutoGenOrchestrator` funciona em três fases principais:

1. **Planejamento da Tarefa**: Analisa a tarefa do usuário e gera um plano detalhado, dividindo-a em sub-tarefas específicas e determinando qual tipo de agente é mais adequado para cada uma.

2. **Execução das Sub-Tarefas**: Cria dinamicamente agentes especializados para cada sub-tarefa e os executa, coletando os resultados.

3. **Geração da Resposta Final**: Combina os resultados das sub-tarefas para gerar uma resposta final coesa e completa para a tarefa original do usuário.

## Características Principais

- **Planejamento Autônomo**: Divide automaticamente tarefas complexas em sub-tarefas gerenciáveis
- **Criação Dinâmica de Agentes**: Cria agentes especializados com base nas necessidades de cada sub-tarefa
- **Gerenciamento de Dependências**: Identifica e respeita dependências entre sub-tarefas, garantindo a execução na ordem correta
- **Passagem de Contexto**: Transmite resultados de tarefas anteriores para tarefas dependentes
- **Integração com Google Search**: Habilita pesquisa na web para agentes que necessitam de informações externas
- **Processamento de Raciocínio**: Utiliza o modelo `gemini-2.0-flash-thinking-exp-01-21` para raciocínio passo a passo
- **Resposta Final Coesa**: Sintetiza os resultados das sub-tarefas em uma resposta final integrada

## Como Usar

```javascript
const { AutoGenOrchestrator } = require('gemini-chain-lib');

// Configurações da API Vertex AI
const apiKey = process.env.VERTEX_API_KEY;
const projectId = process.env.PROJECT_ID;
const location = process.env.LOCATION || 'us-central1';

// Instanciar o AutoGenOrchestrator
const orchestrator = new AutoGenOrchestrator({
    apiKey,
    projectId,
    location
});

// Definir uma tarefa complexa
const userTask = "Crie um resumo detalhado sobre inteligência artificial generativa, incluindo suas aplicações atuais, limitações e perspectivas futuras.";

// Executar a orquestração
async function executarTarefa() {
    try {
        const resultado = await orchestrator.orchestrateTask(userTask);
        console.log("Resultado Final:", resultado);
    } catch (error) {
        console.error("Erro na orquestração:", error);
    }
}

executarTarefa();
```

## Fluxo de Funcionamento

1. O usuário fornece uma tarefa complexa
2. O `AutoGenOrchestrator` analisa a tarefa e gera um plano com sub-tarefas e suas dependências
3. As sub-tarefas são ordenadas com base em suas dependências usando ordenação topológica
4. Para cada sub-tarefa, na ordem correta:
   - Um agente especializado é criado e configurado
   - Os resultados de tarefas anteriores são passados como contexto quando necessário
   - O agente executa sua sub-tarefa e retorna um resultado
5. Os resultados são combinados em uma resposta final coesa
6. A resposta final é retornada ao usuário

## Estrutura do Plano de Tarefas

O plano gerado pelo `AutoGenOrchestrator` segue esta estrutura JSON:

```json
{
  "subTasks": [
    {
      "id": "task1",
      "taskDescription": "Descrição da primeira sub-tarefa",
      "agentRole": "Papel do agente para a primeira sub-tarefa",
      "agentObjective": "Objetivo do agente para a primeira sub-tarefa",
      "agentTaskPrompt": "Prompt detalhado para o agente executar a primeira sub-tarefa",
      "enableGoogleSearch": false,
      "dependsOn": [] // Array vazio indica que não depende de nenhuma outra tarefa
    },
    {
      "id": "task2",
      "taskDescription": "Descrição da segunda sub-tarefa",
      "agentRole": "Papel do agente para a segunda sub-tarefa",
      "agentObjective": "Objetivo do agente para a segunda sub-tarefa",
      "agentTaskPrompt": "Prompt detalhado para o agente executar a segunda sub-tarefa",
      "enableGoogleSearch": true,
      "dependsOn": ["task1"] // Esta sub-tarefa depende da task1
    }
    // ... mais sub-tarefas ...
  ]
}
```

### Explicação dos Campos

- **id**: Identificador único para a sub-tarefa, usado para referenciar dependências
- **taskDescription**: Descrição clara da sub-tarefa
- **agentRole**: Papel/função do agente que executará a sub-tarefa
- **agentObjective**: Objetivo específico do agente para esta sub-tarefa
- **agentTaskPrompt**: Instruções detalhadas para o agente
- **enableGoogleSearch**: Indica se o agente deve usar Google Search
- **dependsOn**: Array de IDs de sub-tarefas das quais esta depende

## Requisitos

- API Key do Vertex AI
- Project ID do Google Cloud
- Acesso ao modelo `gemini-2.0-flash-thinking-exp-01-21` (para o orquestrador)
- Acesso ao modelo `gemini-2.0-flash` (para os agentes especialistas)

## Gerenciamento de Dependências

O `AutoGenOrchestrator` gerencia dependências entre sub-tarefas da seguinte forma:

1. **Identificação de Dependências**: Durante o planejamento, o sistema identifica quais sub-tarefas dependem de outras
2. **Ordenação Topológica**: As sub-tarefas são ordenadas usando um algoritmo de ordenação topológica para garantir que todas as dependências sejam satisfeitas
3. **Passagem de Contexto**: Os resultados de sub-tarefas anteriores são passados como contexto adicional para sub-tarefas dependentes
4. **Detecção de Ciclos**: O sistema detecta e trata ciclos de dependência, evitando deadlocks

### Exemplo de Dependências

```
task1 (Pesquisa) -> task2 (Análise) -> task3 (Síntese)
                 -> task4 (Verificação)
```

Neste exemplo:
- `task1` não depende de nenhuma outra tarefa
- `task2` e `task4` dependem de `task1`
- `task3` depende de `task2`
- A ordem de execução seria: `task1` -> `task2` -> `task3` -> `task4` (ou `task1` -> `task4` -> `task2` -> `task3`)

## Limitações Atuais

- O orquestrador não executa sub-tarefas em paralelo, mesmo quando não há dependências entre elas
- Os agentes especialistas não possuem ferramentas específicas além do Google Search
- O formato de resposta JSON do plano deve ser seguido estritamente
- Ciclos de dependência são detectados mas não resolvidos automaticamente

## Próximos Passos

- Implementar execução paralela de sub-tarefas independentes
- Adicionar suporte para ferramentas específicas por tipo de agente
- Melhorar o tratamento de erros e recuperação de falhas
- Implementar cache de resultados para sub-tarefas semelhantes
- Adicionar mecanismos de auto-avaliação para qualidade dos planos e resultados
- Implementar resolução automática de ciclos de dependência
