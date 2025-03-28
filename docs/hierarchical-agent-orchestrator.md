# Orquestrador Hierárquico de Agentes

O `HierarchicalAgentOrchestrator` é um componente avançado que permite coordenar múltiplos agentes especialistas para resolver tarefas complexas de forma colaborativa e hierárquica.

## Visão Geral

Este orquestrador implementa uma abordagem hierárquica para a resolução de problemas, onde:

1. Um agente orquestrador (de nível superior) analisa a tarefa principal
2. Seleciona os agentes especialistas mais adequados para a tarefa
3. Distribui subtarefas para os especialistas selecionados
4. Coleta e sintetiza as respostas em uma solução final coesa

## Características Principais

- **Seleção Inteligente de Agentes**: Utiliza um modelo de linguagem (LLM) para analisar a tarefa e selecionar os agentes mais relevantes.
- **Formatação Personalizada de Tarefas**: Suporta formatadores personalizados para adaptar a tarefa principal ao contexto específico de cada agente.
- **Integração com Google Search**: Suporte especial para agentes com capacidade de busca na web.
- **Síntese Avançada de Respostas**: Utiliza o LLM para integrar as diferentes perspectivas dos especialistas em uma resposta final coesa.

## Instalação

O `HierarchicalAgentOrchestrator` faz parte da biblioteca principal e não requer instalação separada.

```javascript
const { HierarchicalAgentOrchestrator } = require('caminho-para-biblioteca');
```

## Uso Básico

```javascript
const { HierarchicalAgentOrchestrator } = require('./lib/hierarchical-agent-orchestrator');
const { Agent } = require('./lib/agent');
const { GenerativeAILLM } = require('./lib/generative-ai-llm');

// Configurar o modelo de linguagem (LLM)
const llm = new GenerativeAILLM({
    apiKey: 'sua-api-key',
    // outras configurações...
});

// Criar agentes especialistas
const agents = [
    new Agent({
        role: 'Especialista em Marketing Digital',
        objective: 'Fornecer estratégias eficazes de marketing online',
        llm: llm
    }),
    new Agent({
        role: 'Analista de Dados',
        objective: 'Analisar métricas e extrair insights acionáveis',
        llm: llm
    }),
    new Agent({
        role: 'Especialista em UX',
        objective: 'Melhorar a experiência do usuário e a usabilidade',
        llm: llm
    })
];

// Criar o orquestrador
const orchestrator = new HierarchicalAgentOrchestrator(agents, llm);

// Executar uma tarefa
async function runTask() {
    const task = 'Desenvolver uma estratégia para aumentar as conversões do nosso site de e-commerce';
    const result = await orchestrator.orchestrate(task);
    console.log('Resultado Final:', result);
}

runTask();
```

## Uso Avançado

### Formatadores de Tarefa Personalizados

Você pode definir formatadores personalizados para adaptar a tarefa principal ao contexto específico de cada agente:

```javascript
const marketingAgent = new Agent({
    role: 'Especialista em Marketing Digital',
    objective: 'Fornecer estratégias eficazes de marketing online',
    llm: llm,
    taskFormatter: (task, agent) => {
        return `Como ${agent.role}, analise a seguinte tarefa de e-commerce:
        
        "${task}"
        
        Concentre-se especificamente em estratégias de aquisição de clientes e otimização de funil de vendas.
        Forneça 3-5 recomendações acionáveis com base em tendências atuais do mercado.`;
    }
});
```

### Integração com Google Search

Para agentes que precisam de informações da web:

```javascript
const researchAgent = new Agent({
    role: 'Pesquisador de Mercado',
    objective: 'Fornecer dados atualizados sobre tendências de mercado',
    llm: llm,
    enableGoogleSearch: true  // Habilita a busca no Google para este agente
});
```

## Fluxo de Execução

1. **Análise da Tarefa**: O orquestrador analisa a tarefa principal usando o LLM.
2. **Seleção de Agentes**: Determina quais agentes especialistas são mais adequados para a tarefa.
3. **Distribuição de Tarefas**: Formata e distribui a tarefa para cada agente selecionado.
4. **Execução Paralela**: Cada agente processa sua parte da tarefa independentemente.
5. **Coleta de Respostas**: As respostas de todos os agentes são coletadas.
6. **Síntese Final**: O orquestrador sintetiza todas as respostas em uma solução final coesa.

## Considerações de Desempenho

- O tempo de execução aumenta com o número de agentes selecionados, já que cada agente requer pelo menos uma chamada ao LLM.
- Para tarefas que exigem respostas rápidas, considere limitar o número de agentes disponíveis ou usar critérios de seleção mais rigorosos.

## Tratamento de Erros

O orquestrador inclui tratamento robusto de erros:

- Se um agente falhar, sua resposta será substituída por uma mensagem de erro, mas o processo continuará com os outros agentes.
- Se nenhum agente for considerado relevante para a tarefa, o orquestrador retornará uma mensagem apropriada.
- Erros na síntese final são capturados e uma mensagem de erro genérica é retornada.

## Limitações Conhecidas

- A qualidade da seleção de agentes e da síntese final depende diretamente da qualidade do LLM utilizado.
- Não há mecanismo integrado para agentes solicitarem informações adicionais ou esclarecerem a tarefa.
- A comunicação entre agentes é unidirecional (do orquestrador para os agentes) - não há colaboração direta entre agentes especialistas.

## Exemplos de Casos de Uso

- **Planejamento Estratégico**: Combinar perspectivas de especialistas em finanças, marketing e operações.
- **Análise de Produto**: Integrar feedback de especialistas em UX, desenvolvimento e negócios.
- **Criação de Conteúdo**: Coordenar especialistas em SEO, redação e design visual.
- **Resolução de Problemas Complexos**: Decompor problemas multifacetados em componentes especializados.

## Veja Também

- [Documentação do Agent](./agent.md)
- [Formatadores Personalizados](./formatadores-personalizados.md)
- [Google Search](./google-search.md)
