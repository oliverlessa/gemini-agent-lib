# Documentação: Padrão Factory para Tools

## Introdução

Este documento descreve o padrão de factory implementado para as tools na biblioteca gemini-chain-lib. Este padrão permite a criação de instâncias de tools com configurações personalizadas, oferecendo maior flexibilidade e reutilização de código.

## Motivação

Anteriormente, as tools eram exportadas como objetos já construídos, o que não permitia configurá-las com parâmetros diferentes no momento da instanciação. Com o padrão factory, é possível:

1. Definir a estrutura básica da tool (nome, descrição, parâmetros, função base)
2. Exportar uma função factory que aceita parâmetros de configuração
3. Instanciar a tool com configurações específicas quando necessário

## Como Funciona

### 1. Criação de uma Tool Factory

O `ToolBuilder` agora inclui um método `createFactory()` que retorna uma função factory em vez do objeto final:

```javascript
const toolFactory = ToolBuilder.createTool("nome_da_tool", "Descrição da tool")
    .addParameter("parametro1", "string", "Descrição do parâmetro", { required: true })
    .addParameter("parametro2", "number", "Descrição do parâmetro")
    .setFunction(minhaFuncao)
    .createFactory({
        // Configurações padrão
        parametro2: 10
    });

module.exports = toolFactory;
```

### 2. Uso da Tool Factory

A factory function pode ser usada para criar instâncias da tool com configurações personalizadas:

```javascript
// Uso básico (com valores padrão)
const defaultTool = minhaToolFactory();

// Uso com configurações personalizadas
const customTool = minhaToolFactory({
    parametro2: 20
});

// Passando para o agente
const agente = new Agent({
    // ...
    tools: [customTool]
});
```

## Exemplos de Implementação

### Exemplo 1: Vertex AI Search Retriever Tool

```javascript
// Cria a factory da tool
const vertexSearchRetrieverTool = ToolBuilder.createTool("search", "...")
    .addParameter("query", "string", "Consulta de busca", { required: true })
    .addParameter("projectId", "string", "ID do projeto Google Cloud")
    .addParameter("dataStoreId", "string", "ID do data store", { required: true })
    // ...outros parâmetros
    .setFunction(vertexSearchRetrieverImplementation)
    .createFactory({
        // Configurações padrão
        projectId: process.env.VERTEX_PROJECT_ID,
        location: 'global',
        collectionId: 'default_collection',
        servingConfigId: 'default_config',
        maxResults: 10
    });

// Uso
const customTool = vertexSearchRetrieverTool({
    projectId: 'meu-projeto-personalizado',
    dataStoreId: 'meu-data-store',
    maxResults: 5
});
```

### Exemplo 2: Weather Tool

```javascript
// Cria a factory da tool
const weatherTool = ToolBuilder.createTool("weather", "...")
    .addParameter("location", "string", "Nome da cidade", { required: true })
    .addParameter("unit", "string", "Unidade de temperatura", { enum: ["celsius", "fahrenheit"] })
    .setFunction(weatherImplementation)
    .createFactory({
        // Configurações padrão
        unit: "celsius"
    });

// Uso
const fahrenheitTool = weatherTool({
    unit: "fahrenheit"
});
```

## Benefícios

1. **Reutilização de código**: A mesma definição de tool pode ser usada para criar múltiplas instâncias com configurações diferentes.
2. **Configuração flexível**: Permite configurar parâmetros específicos para cada instância da tool.
3. **Valores padrão**: Permite definir valores padrão para parâmetros opcionais.
4. **Melhor organização**: Separa a definição da tool da sua instanciação.
5. **Compatibilidade**: Mantém compatibilidade com o código existente.

## Considerações Importantes

1. **Parâmetros obrigatórios**: Mesmo com configurações padrão, os parâmetros marcados como `required: true` ainda precisam ser fornecidos na chamada da função.
2. **Prioridade de parâmetros**: Os parâmetros fornecidos na chamada da função têm prioridade sobre as configurações padrão.
3. **Imutabilidade**: Cada chamada à factory cria uma nova instância da tool, não afetando outras instâncias.

## Migração de Tools Existentes

Para migrar uma tool existente para o padrão factory:

1. Substitua `.build()` por `.createFactory(defaultConfig)` com as configurações padrão desejadas
2. Atualize a documentação da tool para explicar como usar a factory
3. Atualize os testes para demonstrar o uso da factory

## Conclusão

O padrão factory para tools oferece maior flexibilidade e reutilização de código, permitindo a criação de instâncias de tools com configurações personalizadas. Isso é especialmente útil para tools que precisam ser configuradas de maneira diferente para diferentes agentes ou casos de uso.

## Veja Também

- [Orquestradores como Ferramentas](./orchestrator-tool-factory.md): Documentação específica sobre como transformar orquestradores (SequentialAgentChain, HierarchicalAgentOrchestrator, AutoGenOrchestrator) em ferramentas que podem ser utilizadas por agentes como ChatAgent e ThinkingAgent.
