# Sistema de Debug

Este documento descreve o sistema de debug da biblioteca `gemini-agent-lib`, que permite controlar a exibição de mensagens de depuração de forma granular.

## Visão Geral

A biblioteca utiliza o pacote `debug` para gerenciar mensagens de depuração. Este sistema permite:

- Ativar/desativar logs de depuração através de variáveis de ambiente
- Controlar quais componentes da biblioteca exibem logs (namespaces)
- Formatar mensagens de depuração de forma consistente

## Como Ativar o Debug

Por padrão, nenhuma mensagem de depuração é exibida. Para ativar os logs, defina a variável de ambiente `DEBUG` com os namespaces desejados:

```bash
# Ativar todos os logs da biblioteca
DEBUG=gemini-agent-lib:* node seu-script.js

# Ativar apenas logs de agentes
DEBUG=gemini-agent-lib:agent,gemini-agent-lib:chat-agent node seu-script.js

# Ativar logs de memória
DEBUG=gemini-agent-lib:memory:* node seu-script.js
```

## Namespaces Disponíveis

A biblioteca organiza os logs em namespaces hierárquicos:

- `gemini-agent-lib:agent` - Logs da classe Agent base
- `gemini-agent-lib:chat-agent` - Logs da classe ChatAgent
- `gemini-agent-lib:thinking-agent` - Logs da classe ThinkingAgent
- `gemini-agent-lib:memory:*` - Todos os logs relacionados à memória
  - `gemini-agent-lib:memory:conversation` - Logs da memória de conversas
  - `gemini-agent-lib:memory:fact` - Logs da memória de fatos
  - `gemini-agent-lib:memory:summary` - Logs da memória de resumos
  - `gemini-agent-lib:memory:mongodb` - Logs do adaptador MongoDB
  - `gemini-agent-lib:memory:sqlite` - Logs do adaptador SQLite
- `gemini-agent-lib:orchestrator:*` - Todos os logs relacionados a orquestradores
  - `gemini-agent-lib:orchestrator:hierarchical` - Logs do orquestrador hierárquico
  - `gemini-agent-lib:orchestrator:sequential` - Logs do orquestrador sequencial
  - `gemini-agent-lib:orchestrator:auto-gen` - Logs do orquestrador AutoGen
  - `gemini-agent-lib:orchestrator:thinking` - Logs do orquestrador de thinking
- `gemini-agent-lib:tools` - Logs relacionados às ferramentas
- `gemini-agent-lib:llm` - Logs relacionados aos modelos de linguagem
- `gemini-agent-lib:registry` - Logs do registro de agentes

## Uso no Código

Se você estiver estendendo a biblioteca ou criando novos componentes, pode utilizar o módulo de debug da seguinte forma:

```javascript
// Importar o módulo de debug
const debug = require('./debug').create('meu-componente');

// Usar o debug em vez de console.log
debug('Mensagem de debug');
debug('Objeto complexo: %o', { chave: 'valor' });
```

## Formatação

O módulo `debug` suporta formatação similar ao `util.format`:

- `%s` - String
- `%d` - Número
- `%j` - JSON
- `%o` - Objeto (com inspeção)
- `%O` - Objeto (com inspeção, mas sem cores)

Exemplo:
```javascript
debug('Usuário %s fez login com status %d', nome, status);
```

## Benefícios

- **Controle Granular**: Ative apenas os logs que você precisa
- **Menos Poluição**: Logs de depuração só aparecem quando solicitados
- **Performance**: Baixo overhead quando os logs estão desativados
- **Padrão do Ecossistema**: Usa uma biblioteca amplamente adotada no Node.js
