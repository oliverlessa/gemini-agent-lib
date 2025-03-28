# Cadeia Sequencial de Agentes

O `SequentialAgentChain` é um componente que permite executar múltiplos agentes em sequência, onde a saída de um agente se torna a entrada para o próximo, criando um pipeline de processamento para tarefas complexas.

## Visão Geral

Esta classe implementa uma abordagem sequencial para a resolução de problemas, onde:

1. Uma entrada inicial é fornecida ao primeiro agente da cadeia
2. Cada agente processa sua tarefa e gera uma saída
3. A saída de um agente se torna automaticamente a entrada para o próximo agente
4. O resultado final é a saída do último agente da cadeia

Este padrão é especialmente útil para decompor tarefas complexas em etapas sequenciais, onde cada agente pode se especializar em um aspecto específico do processamento.

## Características Principais

- **Execução Sequencial**: Processa agentes em ordem, passando resultados entre eles automaticamente.
- **Formatação Personalizada de Tarefas**: Suporta formatadores personalizados para adaptar a entrada ao contexto específico de cada agente.
- **Integração com Google Search**: Suporte especial para agentes com capacidade de busca na web.
- **Registro de Resultados**: Armazena os resultados intermediários de cada agente para fins de depuração ou análise.
- **Tratamento Robusto de Erros**: Captura e propaga erros que ocorrem durante a execução de qualquer agente na cadeia.

## Instalação

O `SequentialAgentChain` faz parte da biblioteca principal e não requer instalação separada.

```javascript
const { SequentialAgentChain } = require('caminho-para-biblioteca');
```

## Uso Básico

```javascript
const { SequentialAgentChain } = require('./lib/sequential-agent-chain');
const { Agent } = require('./lib/agent');
const { GenerativeAILLM } = require('./lib/generative-ai-llm');

// Configurar o modelo de linguagem (LLM)
const llm = new GenerativeAILLM({
    apiKey: 'sua-api-key',
    // outras configurações...
});

// Criar agentes para a cadeia sequencial
const agents = [
    new Agent({
        role: 'Pesquisador',
        objective: 'Coletar informações relevantes sobre o tópico',
        llm: llm
    }),
    new Agent({
        role: 'Analista',
        objective: 'Analisar as informações e identificar padrões',
        llm: llm
    }),
    new Agent({
        role: 'Redator',
        objective: 'Transformar a análise em um relatório conciso',
        llm: llm
    })
];

// Criar a cadeia sequencial
const chain = new SequentialAgentChain(agents);

// Executar a cadeia com uma entrada inicial
async function runChain() {
    const initialInput = 'Impacto da inteligência artificial na educação';
    const result = await chain.run(initialInput);
    console.log('Resultado Final:', result);
}

runChain();
```

## Uso Avançado

### Formatadores de Tarefa Personalizados

Você pode definir formatadores personalizados para adaptar a entrada ao contexto específico de cada agente:

```javascript
const researchAgent = new Agent({
    role: 'Pesquisador',
    objective: 'Coletar informações relevantes sobre o tópico',
    llm: llm,
    taskFormatter: (input, agent) => {
        return `Como ${agent.role}, sua tarefa é pesquisar o seguinte tópico:
        
        "${input}"
        
        Concentre-se em encontrar dados recentes, estatísticas relevantes e opiniões de especialistas.
        Organize as informações em tópicos claros para facilitar a análise posterior.`;
    }
});
```

### Integração com Google Search

Para agentes que precisam de informações da web:

```javascript
const factCheckerAgent = new Agent({
    role: 'Verificador de Fatos',
    objective: 'Verificar a precisão das informações apresentadas',
    llm: llm,
    enableGoogleSearch: true  // Habilita a busca no Google para este agente
});
```

## Fluxo de Execução

1. **Inicialização**: A cadeia recebe uma entrada inicial.
2. **Processamento Sequencial**: Para cada agente na cadeia:
   - A entrada atual (inicialmente a entrada fornecida, depois a saída do agente anterior) é formatada para o agente atual.
   - O agente executa sua tarefa com a entrada formatada.
   - A saída do agente é armazenada e se torna a entrada para o próximo agente.
3. **Finalização**: A saída do último agente é retornada como resultado final da cadeia.

## Formatação de Tarefas

O `SequentialAgentChain` suporta três métodos de formatação de tarefas, aplicados na seguinte ordem de prioridade:

1. **Formatador Personalizado**: Se o agente tiver um `taskFormatter` definido, ele será usado para formatar a entrada.
2. **Google Search**: Se o agente tiver `enableGoogleSearch` definido como `true`, a entrada será formatada como uma string entre aspas duplas.
3. **Padrão**: Se nenhum dos métodos acima for aplicável, a entrada será usada diretamente sem formatação adicional.

## Tratamento de Erros

O `SequentialAgentChain` inclui tratamento robusto de erros:

- Se um agente falhar durante a execução, a cadeia interrompe o processamento e retorna uma mensagem de erro detalhada.
- A mensagem de erro inclui informações sobre qual agente falhou e a natureza do erro.
- Isso permite identificar rapidamente problemas na cadeia e corrigi-los.

## Considerações de Desempenho

- O tempo de execução da cadeia é a soma dos tempos de execução de todos os agentes.
- Para tarefas que exigem respostas rápidas, considere limitar o número de agentes na cadeia ou otimizar cada agente individualmente.
- O registro de resultados intermediários pode aumentar o consumo de memória para cadeias longas ou com saídas grandes.

## Limitações Conhecidas

- A cadeia é estritamente sequencial - não há execução paralela ou ramificação condicional.
- Não há mecanismo integrado para agentes solicitarem informações adicionais ou esclarecerem a entrada.
- A comunicação é unidirecional (do agente anterior para o próximo) - não há feedback ou iteração entre agentes.
- Se um agente falhar, toda a cadeia é interrompida - não há mecanismo de recuperação ou fallback.

## Exemplos de Casos de Uso

- **Processamento de Texto**: Um agente para extrair informações, outro para analisar sentimentos, e um terceiro para gerar um resumo.
- **Análise de Dados**: Um agente para coletar dados, outro para limpá-los, outro para analisá-los, e um final para visualizá-los.
- **Criação de Conteúdo**: Um agente para pesquisar, outro para estruturar, outro para redigir, e um final para revisar.
- **Automação de Processos**: Decompor um fluxo de trabalho em etapas sequenciais, cada uma tratada por um agente especializado.

## Veja Também

- [Documentação do Agent](./agent.md)
- [Formatadores Personalizados](./formatadores-personalizados.md)
- [Google Search](./google-search.md)
- [Orquestrador Hierárquico de Agentes](./hierarchical-agent-orchestrator.md)
