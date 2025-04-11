# RoutingChatManager

O `RoutingChatManager` é uma extensão do `ChatManager` que adiciona suporte para sub-conversas delegadas, permitindo que um agente coordenador transfira temporariamente o controle da conversa para um agente especialista e depois retome o controle.

## Visão Geral

Em muitos cenários de conversação, um único agente pode não ser suficiente para lidar com todas as solicitações do usuário. O `RoutingChatManager` resolve esse problema permitindo que um agente coordenador principal delegue temporariamente a conversa para agentes especialistas quando necessário, e depois retome o controle quando a tarefa especializada for concluída.

Principais características:
- Gerenciamento de múltiplas sessões de usuário
- Roteamento dinâmico de mensagens entre agente coordenador e especialistas
- Transferência contextual de informações entre agentes
- Captura da última mensagem do usuário durante transições
- Gerenciamento de estado robusto para cada sessão

## Arquitetura

O `RoutingChatManager` utiliza os seguintes componentes:

1. **Agente Coordenador**: Um `ChatAgent` configurado para receber solicitações iniciais e decidir quando delegar para especialistas.
2. **Agentes Especialistas**: Instâncias de `ChatAgent` configuradas para tarefas específicas.
3. **Ferramentas de Sinalização**: Ferramentas especiais que permitem a comunicação entre agentes e o gerenciador.
4. **Estado de Sessão**: Estrutura que mantém o estado de cada conversa, incluindo o agente ativo e resultados pendentes.

## Fluxo de Funcionamento

1. O usuário envia uma mensagem para o `RoutingChatManager`.
2. O gerenciador encaminha a mensagem para o agente ativo (inicialmente, o coordenador).
3. Se o coordenador decidir delegar, ele chama a ferramenta `request_specialist_sub_conversation`.
4. O gerenciador detecta o sinal, instancia o especialista solicitado (se ainda não existir na sessão) e o define como agente ativo.
5. O gerenciador **imediatamente** chama o especialista recém-ativado com a **mesma mensagem original do usuário** que causou a delegação. A resposta do especialista é retornada diretamente.
6. As mensagens subsequentes do usuário são encaminhadas para o especialista ativo.
7. Quando o especialista conclui sua tarefa, ele chama a ferramenta `end_specialist_sub_conversation`.
8. O gerenciador detecta o sinal, armazena o resultado e a última mensagem do usuário, e define o coordenador como agente ativo novamente.
9. Na **próxima mensagem do usuário** após o fim da sub-conversa, o gerenciador fornece ao coordenador o resultado pendente do especialista junto com a nova mensagem do usuário para processamento.

## Instalação

O `RoutingChatManager` é parte da biblioteca `gemini-agent-lib` e pode ser importado diretamente:

```javascript
const { RoutingChatManager } = require('gemini-agent-lib');
```

## Uso Básico

```javascript
// Configuração do LLM
const llmConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    modelName: 'gemini-2.0-flash-001'
};

// Configuração do agente coordenador
const coordinatorConfig = {
    role: 'Assistente Virtual',
    objective: 'Fornecer assistência geral e encaminhar para especialistas quando necessário',
    context: `Você é um Assistente Virtual que ajuda os usuários...`
};

// Configuração dos especialistas
const specialistAgentRegistryConfig = {
    especialista_tecnico: {
        role: 'Especialista Técnico',
        objective: 'Resolver problemas técnicos complexos',
        context: `Você é um Especialista Técnico...`
    },
    especialista_financeiro: {
        role: 'Especialista Financeiro',
        objective: 'Auxiliar com questões financeiras',
        context: `Você é um Especialista Financeiro...`
    }
};

// Criar instância do RoutingChatManager
const manager = new RoutingChatManager({
    llmConfig,
    agentConfig: coordinatorConfig,
    specialistAgentRegistryConfig
});

// Processar mensagens
const sessionId = 'usuario-123';
const resposta = await manager.processMessage(sessionId, 'Olá, preciso de ajuda com um problema técnico.');
console.log(resposta.text);
```

## Configuração Detalhada

### Construtor

```javascript
const manager = new RoutingChatManager({
    llmConfig,                       // Configuração do LLM
    agentConfig,                     // Configuração base para o agente coordenador
    memoryConfig,                    // Configuração dos adaptadores de memória (opcional)
    shareMemoryInstances,            // Se deve compartilhar instâncias de memória (opcional, padrão: true)
    specialistAgentRegistryConfig    // Configuração dos agentes especialistas
});
```

### Parâmetros

- **llmConfig** (obrigatório): Configuração para o modelo de linguagem.
  - **projectId** (obrigatório): ID do projeto Google Cloud.
  - **credentialsPath** (opcional): Caminho para as credenciais.
  - **apiKey** (opcional): API Key alternativa.
  - **modelName** (opcional, padrão: 'gemini-2.0-flash-001'): Nome do modelo.

- **agentConfig** (opcional): Configuração base usada para criar a instância do **agente coordenador primário** para cada nova sessão.
  - **role**: Papel/função do agente coordenador.
  - **objective**: Objetivo principal do agente coordenador.
  - **context**: Contexto ou instruções para o agente coordenador.
  - **tools**: Array de ferramentas adicionais para o coordenador (a ferramenta `request_specialist_sub_conversation` será adicionada automaticamente).

- **memoryConfig** (opcional): Configuração dos adaptadores de memória.
  - **conversation**: Configuração do adaptador de memória de conversação.
  - **fact**: Configuração do adaptador de memória de fatos.
  - **summary**: Configuração do adaptador de memória de resumos.

- **shareMemoryInstances** (opcional, padrão: true): Se deve compartilhar instâncias de memória entre os agentes.

- **specialistAgentRegistryConfig** (opcional): Configuração dos agentes especialistas.
  - **[specialist_role]**: Configuração para cada especialista.
    - **role**: Papel/função do especialista.
    - **objective**: Objetivo principal do especialista.
    - **context**: Contexto ou instruções para o especialista.
    - **tools**: Array de ferramentas adicionais (a ferramenta `end_specialist_sub_conversation` será adicionada automaticamente).

## Métodos Principais

### processMessage

```javascript
const resposta = await manager.processMessage(sessionId, message, sessionOptions);
```

Processa uma mensagem de um usuário em uma sessão específica, roteando para o agente correto (coordenador ou especialista).

- **sessionId** (obrigatório): O ID da sessão/usuário.
- **message** (obrigatório): A mensagem do usuário.
- **sessionOptions** (opcional): Opções para passar para `getOrCreateSession` se a sessão precisar ser criada.
- **Retorna**: A resposta do agente ativo (coordenador ou especialista).

### getOrCreateSession

```javascript
const primaryAgent = await manager.getOrCreateSession(sessionId, sessionOptions);
```

Obtém ou cria uma sessão para um determinado ID, retornando o agente coordenador principal.

- **sessionId** (obrigatório): O ID da sessão/usuário.
- **sessionOptions** (opcional): Opções específicas para esta sessão.
- **Retorna**: A instância de `ChatAgent` primário para a sessão.

### endSession

```javascript
const success = manager.endSession(sessionId);
```

Encerra uma sessão específica, removendo a instância do agente da memória ativa.

- **sessionId** (obrigatório): O ID da sessão a ser encerrada.
- **Retorna**: `true` se a sessão foi encontrada e removida, `false` caso contrário.

### clearSessionHistory

```javascript
await manager.clearSessionHistory(sessionId);
```

Limpa o histórico de uma sessão específica (na memória persistente, se houver).

- **sessionId** (obrigatório): O ID da sessão cujo histórico deve ser limpo.

### shutdown

```javascript
await manager.shutdown();
```

Fecha todas as conexões de recursos compartilhados (LLM, Memórias).

## Ferramentas de Sinalização

O `RoutingChatManager` utiliza duas ferramentas especiais para sinalização entre agentes:

### request_specialist_sub_conversation

Esta ferramenta é usada pelo agente coordenador para solicitar o início de uma sub-conversa com um especialista.

```javascript
const { tools } = require('gemini-agent-lib');
const { SubConversation } = tools;

// Adicionar a ferramenta ao agente coordenador
const coordinatorTools = [
    // ... outras ferramentas ...
    SubConversation.request_specialist_sub_conversation
];
```

Parâmetros:
- **specialist_role** (obrigatório): O 'role' (identificador) do agente especialista registrado.
- **initial_context** (obrigatório): Contexto ou instrução inicial para o especialista. (A mensagem original do usuário que causou a delegação será passada automaticamente pelo sistema para o especialista).

### end_specialist_sub_conversation

Esta ferramenta é usada pelo agente especialista para sinalizar o fim de sua sub-conversa e devolver o controle.

```javascript
const { tools } = require('gemini-agent-lib');
const { SubConversation } = tools;

// Adicionar a ferramenta ao agente especialista
const specialistTools = [
    // ... outras ferramentas ...
    SubConversation.end_specialist_sub_conversation
];
```

Parâmetros:
- **status** (obrigatório): Status final da tarefa do especialista (ex: 'completed', 'failed', 'needs_handoff').
- **final_result** (obrigatório): O resultado final estruturado do trabalho do especialista.
- **last_user_message** (obrigatório): A última mensagem do usuário que levou à conclusão.
- **message_to_coordinator** (opcional): Mensagem final para o agente coordenador.

## A Importância Crucial das Instruções (Contexto/Prompt) dos Agentes

O sucesso e a robustez do `RoutingChatManager` dependem **fundamentalmente** da qualidade e precisão das instruções fornecidas no parâmetro `context` (prompt) tanto do agente coordenador quanto dos agentes especialistas. Essas instruções guiam o comportamento dos agentes, especialmente no uso correto das ferramentas de sinalização (`request_specialist_sub_conversation` e `end_specialist_sub_conversation`), garantindo que o fluxo da sub-conversa ocorra como esperado.

Prompts mal definidos podem levar a comportamentos inesperados, como:
- Falha na delegação para especialistas.
- Anúncio indevido da transferência para o usuário.
- Perda de contexto durante as transições.
- Falha no retorno do controle para o coordenador.
- Processamento incorreto dos resultados do especialista.

É **obrigatório** que as instruções cubram os seguintes pontos:

### Instruções para o Agente Coordenador

O prompt do agente coordenador **deve** incluir instruções claras sobre:

1.  **Identificação da Necessidade de Delegação:** Como e quando identificar que uma solicitação do usuário requer um especialista.
2.  **Uso da Ferramenta `request_specialist_sub_conversation`:**
    *   Instruir explicitamente o uso desta ferramenta para iniciar a delegação.
    *   Especificar os papéis (`specialist_role`) dos especialistas disponíveis.
    *   Exigir o fornecimento do `initial_context` relevante para o especialista.
    *   **Crucial:** Instruir o agente a **NÃO** gerar nenhum texto de resposta ao usuário ao chamar esta ferramenta. A resposta deve conter *apenas* a chamada da ferramenta. O `RoutingChatManager` cuida da transição transparente.

    *Exemplo de Instrução (baseado em `examples/exemplo-routing-chat-manager.js`):*
    ```
    INSTRUÇÕES PARA SUB-CONVERSAS (DELEGAÇÃO INTERNA):
    - **NÃO anuncie ou pergunte ao usuário sobre a transferência para um especialista.** Apenas identifique a necessidade e use a ferramenta 'request_specialist_sub_conversation'. A transição deve ser invisível para o usuário.
    - Ao usar 'request_specialist_sub_conversation', forneça os seguintes argumentos:
      * `specialist_role`: O papel exato do especialista ('especialista_tecnico' ou 'especialista_financeiro').
      * `initial_context`: Um breve resumo do que foi discutido até agora que seja relevante para o especialista iniciar o trabalho. (A mensagem do usuário será passada automaticamente pelo sistema).
    - **IMPORTANTE:** Quando você decidir usar esta ferramenta, sua resposta deve conter **APENAS** a chamada da ferramenta. **NÃO GERE NENHUM TEXTO** explicando a transferência ou o motivo dela. O sistema cuidará da transição de forma invisível para o usuário.

    ESPECIALISTAS DISPONÍVEIS (PARA SEU USO INTERNO):
    - 'especialista_tecnico': Para questões técnicas complexas e suporte avançado.
    - 'especialista_financeiro': Para questões financeiras, pagamentos e reembolsos.
    ```

3.  **Processamento do Retorno do Especialista:**
    *   Instruir como interpretar a nota do sistema (`[SYSTEM_NOTE: ...]`) que contém o resultado da sub-conversa (`status`, `final_result`, `last_user_message`, `message_to_coordinator`).
    *   Instruir a integrar o resultado do especialista de forma natural na resposta ao usuário, mantendo a fluidez da conversa.
    *   Instruir como lidar com status específicos, como `out_of_scope`, potencialmente re-delegando para outro especialista se apropriado (novamente, sem anunciar a transferência).

    *Exemplo de Instrução (baseado em `examples/exemplo-routing-chat-manager.js`):*
    ```
    - Quando receber de volta o controle com um resultado de especialista (através de uma nota do sistema ou contexto atualizado), analise cuidadosamente todas as informações.
    - Integre essas informações na sua resposta ao usuário de forma natural, continuando a conversa como se você mesmo tivesse obtido a informação.
    - **Cenário Especial - Retorno 'Fora de Escopo':** Se você receber uma mensagem do usuário acompanhada de uma nota do sistema indicando que o especialista anterior finalizou por estar 'fora de escopo' (`status: 'out_of_scope'`), analise a mensagem original do usuário. Se ela claramente pertence a outro especialista disponível (ex: 'especialista_financeiro'), use **imediatamente** a ferramenta `request_specialist_sub_conversation` para delegar a esse novo especialista. **NÃO FAÇA NENHUM COMENTÁRIO sobre a mudança de tópico ou a transferência.** Aja diretamente.
    ```

### Instruções para Agentes Especialistas

O prompt de cada agente especialista **deve** incluir instruções claras sobre:

1.  **Uso da Ferramenta `end_specialist_sub_conversation`:**
    *   Instruir explicitamente o uso desta ferramenta para finalizar a sub-conversa e devolver o controle ao coordenador.
    *   Especificar os parâmetros obrigatórios: `status`, `final_result`, `last_user_message`.
    *   Explicar o propósito de `message_to_coordinator` (opcional).
    *   **Crucial:** Enfatizar que o `final_result` deve conter os dados estruturados (JSON) e a resposta textual *conversacional* para o usuário (se houver) **NÃO** deve conter esses dados estruturados ou informações de depuração.

    *Exemplo de Instrução (baseado em `examples/exemplo-routing-chat-manager.js`):*
    ```
    INSTRUÇÕES PARA FINALIZAR SUB-CONVERSA:
    - Quando o problema for resolvido ou quando tiver coletado todas as informações necessárias para o coordenador continuar.
    - Use a ferramenta 'end_specialist_sub_conversation'.
    - Forneça os seguintes argumentos para a ferramenta:
      * `status`: Um status claro ('completed', 'needs_followup', 'cannot_resolve', etc.).
      * `final_result`: **APENAS AQUI** coloque um resultado estruturado (objeto JSON) com o diagnóstico, solução ou informações coletadas.
      * `last_user_message`: A última mensagem do usuário que levou à conclusão desta sub-conversa.
      * `message_to_coordinator`: Uma mensagem opcional para o coordenador com notas internas ou resumo.
    - **IMPORTANTE:** Sua resposta textual final para o usuário (se houver) NÃO deve conter blocos JSON ou informações de depuração. Apenas texto conversacional claro. Os dados estruturados vão no argumento `final_result` da ferramenta.
    ```

2.  **Tratamento de Solicitações Fora de Escopo:**
    *   Instruir o especialista a identificar rapidamente se a solicitação do usuário está fora de seu escopo.
    *   Se estiver fora de escopo, instruir a usar **imediatamente** a ferramenta `end_specialist_sub_conversation` com um `status` apropriado (ex: `'out_of_scope'`) e incluir a `last_user_message`.
    *   Instruir a **NÃO** tentar responder à solicitação fora de escopo.

    *Exemplo de Instrução (baseado em `examples/exemplo-routing-chat-manager.js`):*
    ```
    - **Se a solicitação do usuário estiver claramente fora do seu escopo técnico (ex: perguntas sobre vendas, faturamento, etc.), use imediatamente a ferramenta 'end_specialist_sub_conversation' com status 'out_of_scope' e passe a mensagem do usuário em 'last_user_message'. Não tente responder à solicitação fora do escopo.**
    ```

Ao seguir estas diretrizes e fornecer prompts detalhados e precisos, você garantirá que o `RoutingChatManager` funcione de maneira eficiente e confiável, proporcionando uma experiência de usuário fluida mesmo com a complexidade das sub-conversas delegadas.

## Considerações Importantes

1. **Contexto dos Agentes**: É crucial que tanto o coordenador quanto os especialistas tenham instruções claras em seus contextos sobre como e quando usar as ferramentas de sinalização.

2. **Última Mensagem do Usuário**: O especialista deve sempre incluir a última mensagem do usuário ao finalizar a sub-conversa, pois isso é essencial para manter o contexto da conversa.

3. **Memória Compartilhada**: Por padrão, as instâncias de memória são compartilhadas entre todos os agentes, o que permite manter um histórico coerente da conversa.

4. **Resultado Pendente**: Quando um especialista finaliza uma sub-conversa, o resultado é armazenado temporariamente e fornecido ao coordenador na próxima mensagem do usuário.

## Exemplo Completo

Veja um exemplo completo de uso do `RoutingChatManager` no arquivo `examples/exemplo-routing-chat-manager.js`.

## Testes

Para testar o funcionamento do `RoutingChatManager`, execute o arquivo de teste:

```bash
node test/test-routing-chat-manager.js
```

Este teste simula um fluxo completo de sub-conversa, incluindo a transição entre agentes e o processamento de resultados.
