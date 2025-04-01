**Documento de Planejamento e Implementação: Chatbot com Delegação para Agentes Especialistas**

**1. Visão Geral da Arquitetura**

O sistema consistirá em:

1.  **`ChatAgent` (Interface do Usuário):** Uma única instância da classe `ChatAgent`, configurada para operar no modo `chat` do `VertexAILLM`. Será responsável por:
    *   Manter o diálogo e o histórico da conversa com o usuário.
    *   Analisar a intenção do usuário.
    *   Responder diretamente a perguntas gerais ou de conversação.
    *   Identificar quando uma solicitação requer conhecimento ou ação especializada.
    *   Utilizar Function Calling para delegar tarefas a agentes especialistas apropriados.
    *   Receber a resposta do especialista e apresentá-la de forma coesa ao usuário.
2.  **`Agent` (Especialistas):** Múltiplas instâncias (ou a capacidade de instanciar) da classe `Agent` (ou `ThinkingAgent`, se necessário), cada uma configurada para um papel (`role`) e objetivo (`objective`) específicos. Serão responsáveis por:
    *   Executar tarefas focadas em um domínio (pesquisa, análise, escrita, etc.).
    *   Potencialmente usar suas próprias `tools` ou `enableGoogleSearch`.
    *   Operar preferencialmente no modo `oneshot` do `VertexAILLM` para tarefas discretas (a menos que a subtarefa especificamente precise de histórico interno).
3.  **Mecanismo de Delegação (Function Calling):** Uma ferramenta (`FunctionDeclaration`) definida dentro do `ChatAgent` que o seu LLM pode invocar para passar uma tarefa a um especialista.
4.  **Registro de Agentes (Agent Registry/Factory):** Um mecanismo centralizado para gerenciar as configurações e/ou instâncias dos agentes especialistas disponíveis.

**Exclusões Explícitas (Decisões Anteriores):**

*   Não haverá invocação direta de `Orchestrators` pelo `ChatAgent`.
*   Não haverá criação dinâmica/autônoma de novos agentes pelo `ChatAgent`.

**2. Pré-requisitos**

*   **Código Base Existente:** As classes `VertexAILLM`, `Agent`, `ChatAgent`, e `FunctionDeclarationSchemaType` (ou equivalente) estão definidas conforme os trechos de código fornecidos anteriormente.
*   **Ambiente Google Cloud:**
    *   Projeto Google Cloud configurado.
    *   Credenciais de acesso (arquivo JSON ou API Key) disponíveis e configuradas no ambiente (ex: `GOOGLE_APPLICATION_CREDENTIALS`, `GOOGLE_API_KEY`).
    *   APIs necessárias do Vertex AI habilitadas no projeto.
*   **Dependências:** `@google-cloud/vertexai` instalado.

**3. Passos Detalhados da Implementação**

**Passo 3.1: Definir as Especificações dos Agentes Especialistas**

*   **Ação:** Crie uma especificação clara para cada agente especialista necessário. Isso *não* é código ainda, mas a definição conceitual.
*   **Detalhes:** Para cada especialista, defina:
    *   `role`: String (ex: "Pesquisador Web de Notícias de IA", "Analista de Sentimento de Reviews", "Gerador de Resumos Técnicos"). Seja específico.
    *   `objective`: String (ex: "Encontrar e resumir as 3 notícias mais recentes sobre IA de fontes confiáveis", "Analisar o sentimento de um review de produto e identificar os pontos positivos e negativos chave", "Criar um resumo conciso de um artigo técnico fornecido").
    *   `context`: String (Prompt de sistema para o especialista. Ex: "Você é um especialista em encontrar notícias de IA. Use a busca para encontrar informações recentes e confiáveis. Apresente um resumo claro.").
    *   `tools`: Array (Lista de ferramentas *específicas* que *este* especialista pode precisar, se houver. Ex: `[]`).
    *   `enableGoogleSearch`: Boolean (Define se este especialista precisa de acesso ao Google Search via Vertex AI. Ex: `true` para o pesquisador, `false` para o analista).
    *   `llmMode`: String ('oneshot' ou 'chat'. Provavelmente 'oneshot' para a maioria dos especialistas).

*   **Exemplo de Especificação (não código):**

    ```
    Especialista 1:
      role: "Pesquisador Financeiro"
      objective: "Buscar cotações atuais de ações e notícias financeiras relevantes para uma empresa específica usando Google Search."
      context: "Você é um pesquisador financeiro focado. Use a busca para obter dados de ações e notícias recentes sobre a empresa solicitada. Apresente os dados de forma clara e cite as fontes."
      tools: []
      enableGoogleSearch: true
      llmMode: 'oneshot'

    Especialista 2:
      role: "Tradutor Técnico EN-PT"
      objective: "Traduzir um texto técnico do Inglês para o Português Brasileiro, mantendo a precisão terminológica."
      context: "Você é um tradutor especializado em textos técnicos. Traduza o texto fornecido do Inglês para o Português Brasileiro de forma precisa e natural."
      tools: []
      enableGoogleSearch: false
      llmMode: 'oneshot'
    ```

**Passo 3.2: Implementar o Registro/Fábrica de Agentes Especialistas**

*   **Ação:** Crie um módulo ou classe para gerenciar a criação de instâncias de agentes especialistas.
*   **Objetivo:** Centralizar a lógica de criação, aplicar configurações de LLM específicas para especialistas, e potencialmente permitir caching ou pooling no futuro.

*   **Exemplo de Código (`agent-registry.js`):**

    ```javascript
    const VertexAILLM = require('./vertex-ai-llm');
    const Agent = require('./agent');
    // const ThinkingAgent = require('./thinking-agent'); // Se precisar de especialistas com 'thinking'

    // Carrega as especificações (poderia vir de um arquivo de configuração JSON)
    const specialistAgentsConfig = {
        "Pesquisador Financeiro": {
            // ... (definições do Passo 3.1) ...
            objective: "Buscar cotações atuais de ações e notícias financeiras relevantes para uma empresa específica usando Google Search.",
            context: "Você é um pesquisador financeiro focado. Use a busca para obter dados de ações e notícias recentes sobre a empresa solicitada. Apresente os dados de forma clara e cite as fontes.",
            tools: [],
            enableGoogleSearch: true,
            llmMode: 'oneshot'
            // Adicione aqui configs específicas de LLM se necessário (modelName, generationConfig)
        },
        "Tradutor Técnico EN-PT": {
            // ... (definições do Passo 3.1) ...
            objective: "Traduzir um texto técnico do Inglês para o Português Brasileiro, mantendo a precisão terminológica.",
            context: "Você é um tradutor especializado em textos técnicos. Traduza o texto fornecido do Inglês para o Português Brasileiro de forma precisa e natural.",
            tools: [],
            enableGoogleSearch: false,
            llmMode: 'oneshot'
        },
        // ... outros especialistas definidos ...
    };

    // Cache simples para reutilizar instâncias de LLM (opcional, mas recomendado)
    const llmInstances = {};

    function getSpecialistLLM(role) {
        const config = specialistAgentsConfig[role];
        const mode = config.llmMode || 'oneshot';
        const modelName = config.llmModelName || process.env.SPECIALIST_DEFAULT_MODEL || "gemini-1.0-pro"; // Modelo padrão para especialistas
        const llmKey = `${role}-${mode}-${modelName}`;

        if (!llmInstances[llmKey]) {
            console.log(`[AgentRegistry] Criando nova instância LLM para: ${llmKey}`);
            llmInstances[llmKey] = new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                apiKey: process.env.GOOGLE_API_KEY, // Passar ambos se disponíveis
                location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
                modelName: modelName,
                mode: mode,
                // Potencialmente, generationConfig diferente para especialistas
                generationConfig: config.generationConfig || { maxOutputTokens: 2048 }
            });
        }
        return llmInstances[llmKey];
    }

    /**
     * Obtém ou cria uma instância de um agente especialista com base no seu papel.
     * @param {string} role - O papel do agente especialista (deve corresponder a uma chave em specialistAgentsConfig).
     * @returns {Agent} Uma instância configurada do agente especialista.
     * @throws {Error} Se o papel do agente não for encontrado.
     */
    function getSpecialistAgent(role) {
        const config = specialistAgentsConfig[role];
        if (!config) {
            throw new Error(`[AgentRegistry] Configuração para o agente especialista com role '${role}' não encontrada.`);
        }

        const specialistLlm = getSpecialistLLM(role);

        // Decida se usa Agent ou ThinkingAgent com base na config ou necessidade
        const AgentClass = config.needsThinking ? ThinkingAgent : Agent; // Exemplo de decisão

        console.log(`[AgentRegistry] Fornecendo instância de ${AgentClass.name} para role: ${role}`);
        return new AgentClass({
            role: config.role,
            objective: config.objective,
            context: config.context,
            llm: specialistLlm, // LLM específico do especialista
            tools: config.tools || [],
            enableGoogleSearch: config.enableGoogleSearch || false,
            // taskFormatter: config.taskFormatter || null // Se usar formatadores específicos
        });
    }

    function getAvailableSpecialistRoles() {
        return Object.keys(specialistAgentsConfig);
    }

    module.exports = {
        getSpecialistAgent,
        getAvailableSpecialistRoles
    };
    ```

**Passo 3.3: Aprimorar a Classe `ChatAgent`**

*   **Ação:** Modificar `chat-agent.js` para incluir a capacidade de delegação.
*   **Detalhes:**
    1.  **Definir a Ferramenta de Delegação:** Adicione a estrutura da ferramenta `delegate_task_to_specialist` (use `FunctionDeclarationSchemaType`).
    2.  **Modificar o Construtor:** Faça o construtor aceitar `tools` e uma referência à função `getSpecialistAgent` (ou ao registry).
    3.  **Atualizar o Contexto Padrão:** Crie um prompt de sistema robusto que instrua o LLM do `ChatAgent` sobre seu papel, os especialistas disponíveis (liste os `roles`), e *quando e como* usar a ferramenta `delegate_task_to_specialist` versus responder diretamente.
    4.  **Modificar `processUserMessage`:** Adapte o loop `while (response && response.functionCall)` para:
        *   Reconhecer a chamada `delegate_task_to_specialist`.
        *   Extrair `specialist_role` e `task_for_specialist` dos argumentos.
        *   Chamar `this.getSpecialistAgent(specialist_role)` (ou equivalente) para obter a instância.
        *   Chamar `specialistAgent.executeTask(task_for_specialist)`.
        *   Formatar o resultado (ou erro) como `functionResultContent`.
        *   Usar `this.chat.sendMessage([... , { functionResponse: { name: functionCall.name, response: functionResultContent } }])` para enviar o resultado de volta ao LLM do `ChatAgent`.
        *   Manter a lógica existente para outras ferramentas que o `ChatAgent` possa ter.
        *   Incluir tratamento de erros robusto para falhas na obtenção do especialista ou na sua execução.

*   **Exemplo de Código (Trechos Chave para `chat-agent.js`):**

    ```javascript
    const Agent = require('./agent');
    const VertexAILLM = require('./vertex-ai-llm');
    const FunctionDeclarationSchemaType = require('./function-declaration-schema-type'); // Importar o tipo
    // Importar o registry/factory
    const { getSpecialistAgent, getAvailableSpecialistRoles } = require('./agent-registry');

    // Definição da Ferramenta de Delegação (pode ser definida fora da classe)
    const delegateToolSchema = {
        name: "delegate_task_to_specialist",
        description: `Delega uma tarefa específica para um agente especialista quando a pergunta do usuário requer conhecimento ou ação fora do escopo de uma conversa geral ou de suas capacidades primárias. Use isso para tarefas como ${getAvailableSpecialistRoles().join(', ')}, etc.`,
        parameters: {
            type: FunctionDeclarationSchemaType.OBJECT,
            properties: {
                specialist_role: {
                    type: FunctionDeclarationSchemaType.STRING,
                    description: `O papel exato do agente especialista necessário. Deve ser um dos seguintes: ${getAvailableSpecialistRoles().join(', ')}.`
                },
                task_for_specialist: {
                    type: FunctionDeclarationSchemaType.STRING,
                    description: "A descrição clara e completa da tarefa a ser executada pelo agente especialista. Inclua todo o contexto relevante da conversa necessário para o especialista realizar a tarefa com sucesso."
                }
            },
            required: ["specialist_role", "task_for_specialist"]
        }
    };

    class ChatAgent extends Agent {
        constructor({
            role = "Assistente Conversacional",
            objective = "Manter uma conversa útil e delegar tarefas complexas a especialistas.",
            context, // Será gerado se não fornecido
            llm, // Deve ser VertexAILLM em modo 'chat'
            tools = [], // Ferramentas que o *ChatAgent* pode usar diretamente
            enableGoogleSearch = false // Geralmente false para ChatAgent
            // Não precisa mais de 'specialistRegistry' aqui se importamos getSpecialistAgent diretamente
        }) {
            // Garantir que o LLM está em modo chat
            if (!llm || llm.mode !== 'chat') {
                throw new Error("ChatAgent requer uma instância de VertexAILLM configurada no modo 'chat'.");
            }

            // Construir o contexto padrão se não fornecido
            const defaultContext = `Você é um ${role} com o objetivo de ${objective}.
Sua principal função é conversar com o usuário. Responda diretamente sempre que possível.
Você tem acesso aos seguintes especialistas para tarefas específicas:
${getAvailableSpecialistRoles().map(r => `- ${r}`).join('\n')}

Instruções CRÍTICAS:
1. Analise a solicitação do usuário.
2. Se for uma pergunta geral ou algo que você pode responder, FAÇA ISSO DIRETAMENTE.
3. **SOMENTE SE** a solicitação exigir CLARAMENTE uma das especialidades listadas acima, use a ferramenta 'delegate_task_to_specialist'.
4. Ao delegar:
    - Forneça o 'specialist_role' EXATO da lista.
    - Crie uma 'task_for_specialist' CLARA e AUTOCONTIDA, passando TODO o contexto necessário.
5. Após receber a resposta do especialista, integre-a NATURALMENTE na sua resposta final ao usuário. NÃO diga "O especialista disse...". Apenas forneça a informação.
6. NÃO invente especialistas ou use a ferramenta de delegação para tarefas simples.`;

            // Inclui a ferramenta de delegação às ferramentas fornecidas
            const allTools = [delegateToolSchema, ...tools];

            super({
                role,
                objective,
                context: context || defaultContext,
                task: "", // Inicialmente vazio
                llm: llm, // LLM no modo CHAT
                tools: allTools, // Inclui a ferramenta de delegação
                enableGoogleSearch // Provavelmente false
            });

            // Histórico e inicialização do chat (já existente no seu código)
            this.conversationHistory = [];
            // Garanta que o this.llm.chat seja inicializado corretamente (seu código já faz isso on-demand)
        }

        // ... (outros métodos existentes: prepareHistoryForLLM, addToHistory, clearHistory, findToolFunction, prepareToolsForLLM)

        async processUserMessage(message) {
            console.log(`\n[ChatAgent] Processando mensagem do usuário: "${message}"`);
            this.task = message; // Define a tarefa atual (embora o prompt seja a mensagem principal)

            // O histórico é gerenciado internamente pelo SDK do Vertex AI Chat
            // Mas precisamos preparar a chamada inicial
            const historyForCall = this.prepareHistoryForLLM(); // Pega o histórico atual

            // Adiciona a mensagem atual ao histórico *local* para referência
            this.addToHistory("user", message);

            try {
                 // A inicialização/re-inicialização do chat é tratada dentro do generateContent do seu VertexAILLM
                 let response = await this.llm.generateContent({
                     prompt: message, // O SDK do Vertex lida com o envio como última mensagem
                     context: this.context,
                     tools: this.prepareToolsForLLM(),
                     history: historyForCall // Passa o histórico para possível reinicialização do chat
                 });

                // Loop de Function Calling (adaptado do seu código Agent.js e do plano anterior)
                while (response && response.functionCall) {
                    const functionCall = response.functionCall;
                    console.log(`\n[ChatAgent] LLM solicitou Function Call: ${functionCall.name}`);
                    console.log("Argumentos:", JSON.stringify(functionCall.args, null, 2));

                    // Log da intenção do modelo (opcional)
                    // this.addToHistory("model", `[Tentando usar ferramenta: ${functionCall.name}]`); // Cuidado para não poluir o histórico real do LLM

                    let functionResultContent; // Resultado a ser enviado de volta

                    if (functionCall.name === "delegate_task_to_specialist") {
                        try {
                            const { specialist_role, task_for_specialist } = functionCall.args;
                             if (!specialist_role || !task_for_specialist) {
                                throw new Error("Argumentos 'specialist_role' ou 'task_for_specialist' ausentes ou inválidos.");
                             }
                             if (!getAvailableSpecialistRoles().includes(specialist_role)) {
                                 throw new Error(`Papel de especialista inválido: '${specialist_role}'. Papéis disponíveis: ${getAvailableSpecialistRoles().join(', ')}`);
                             }

                            console.log(`[ChatAgent] Delegando tarefa para: ${specialist_role}`);
                            const specialistAgent = getSpecialistAgent(specialist_role); // Usa a factory

                            // !!! IMPORTANTE: Passar a tarefa para o método executeTask do especialista !!!
                            // O método executeTask do especialista já lida com seu próprio contexto e LLM.
                            // Não passamos o histórico do ChatAgent para o especialista.
                            specialistAgent.task = task_for_specialist; // Define a tarefa específica para o especialista
                            const specialistResponseText = await specialistAgent.executeTask(); // Obtém a resposta final do especialista

                            console.log(`[ChatAgent] Resposta do especialista ${specialist_role}: ${specialistResponseText.substring(0, 200)}...`);
                            functionResultContent = { result: specialistResponseText }; // Formato esperado pela API Gemini

                        } catch (error) {
                            console.error(`[ChatAgent] Erro durante delegação para ${functionCall.args?.specialist_role}:`, error);
                            functionResultContent = { error: `Falha ao processar delegação: ${error.message}` };
                        }
                    } else {
                        // Lógica para outras ferramentas diretas do ChatAgent (se houver)
                        const functionToExecute = this.findToolFunction(functionCall.name);
                        if (!functionToExecute) {
                            console.error(`[ChatAgent] Função '${functionCall.name}' não encontrada.`);
                            functionResultContent = { error: `Função '${functionCall.name}' não implementada.` };
                        } else {
                            try {
                                console.log(`[ChatAgent] Executando ferramenta local: ${functionCall.name}`);
                                const result = await functionToExecute(functionCall.args || {});
                                functionResultContent = { result: result }; // Adapte conforme necessário
                            } catch (error) {
                                console.error(`[ChatAgent] Erro ao executar ferramenta local '${functionCall.name}':`, error);
                                functionResultContent = { error: `Erro na ferramenta ${functionCall.name}: ${error.message}` };
                            }
                        }
                    }

                    // Adiciona o resultado da função ao histórico LOCAL (para depuração)
                    this.addToHistory("user", `[Resultado da Ferramenta ${functionCall.name}: ${JSON.stringify(functionResultContent).substring(0, 100)}...]`);

                    // Envia a resposta da função de volta para o LLM do ChatAgent
                    // O SDK do Vertex AI (this.llm) deve lidar com o formato correto ao chamar generateContent novamente
                    // passando a resposta da função.
                    response = await this.llm.generateContent({
                         prompt: null, // Não precisa de prompt novo, só a resposta da função
                         context: this.context,
                         tools: this.prepareToolsForLLM(),
                         history: this.prepareHistoryForLLM(), // Garante que o histórico está atualizado
                         functionResponseParts: [{ // Passando a resposta da função explicitamente se a classe LLM suportar
                             functionCall: functionCall, // A chamada original
                             functionResponse: { // A resposta que preparamos
                                 name: functionCall.name,
                                 response: functionResultContent
                             }
                         }]
                    });

                 } // Fim do while (response && response.functionCall)

                // Processa a resposta final de texto do LLM
                 if (response && response.text) {
                     this.addToHistory("model", response.text);
                     return { text: response.text }; // Retorna a resposta final
                 } else {
                    const errorMsg = "[ChatAgent] Resposta final do LLM vazia ou em formato inesperado após processamento.";
                    console.error(errorMsg, response);
                    this.addToHistory("model", "[Desculpe, ocorreu um erro interno ao processar sua solicitação.]");
                    return { text: "[Desculpe, ocorreu um erro interno ao processar sua solicitação.]" };
                 }

            } catch (error) {
                console.error("[ChatAgent] Erro crítico no processamento da mensagem:", error);
                this.addToHistory("model", "[Desculpe, não consegui processar sua mensagem devido a um erro.]");
                return { text: "[Desculpe, não consegui processar sua mensagem devido a um erro.]" };
            }
        }
    }

    module.exports = ChatAgent;

    ```
    *Observação:* Pode ser necessário ajustar a forma como a `functionResponseParts` é passada para o `this.llm.generateContent` dependendo de como você implementou essa abstração na sua classe `VertexAILLM`. A ideia é garantir que a resposta da função seja enviada corretamente ao Gemini na próxima chamada.

**Passo 3.4: Instanciar e Configurar o `ChatAgent` Principal**

*   **Ação:** No seu ponto de entrada principal (ex: `main.js`, `server.js`), crie a instância do `ChatAgent`.
*   **Detalhes:**
    *   Instancie o `VertexAILLM` especificamente para o `ChatAgent` (modo `chat`, modelo desejado - ex: "gemini-1.5-flash-001", configurações de geração).
    *   Instancie o `ChatAgent`, passando o LLM configurado. As ferramentas (incluindo `delegateToolSchema`) e o `context` serão tratados pelo construtor modificado do `ChatAgent`.

*   **Exemplo de Código (`main.js`):**

    ```javascript
    require('dotenv').config(); // Para carregar variáveis de ambiente
    const ChatAgent = require('./chat-agent');
    const VertexAILLM = require('./vertex-ai-llm');
    // Não precisa importar o registry aqui, pois o ChatAgent já o utiliza internamente

    async function main() {
        // 1. Configurar LLM para o ChatAgent (MODO CHAT OBRIGATÓRIO)
        const chatLlm = new VertexAILLM({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            apiKey: process.env.GOOGLE_API_KEY,
            location: process.env.GOOGLE_CLOUD_LOCATION || 'us-central1',
            modelName: process.env.CHAT_AGENT_MODEL || "gemini-1.5-flash-001", // Modelo para chat
            mode: "chat", // ESSENCIAL
            generationConfig: {
                maxOutputTokens: 4096,
                temperature: 0.7 // Temp talvez um pouco mais alta para conversação
            }
        });

        // 2. Instanciar o ChatAgent
        // O construtor agora lida com a ferramenta de delegação e o contexto padrão
        const chatAgent = new ChatAgent({
            llm: chatLlm
            // Pode opcionalmente passar um 'context' personalizado ou 'tools' adicionais aqui
            // Ex: tools: [myCustomChatTool] (delegateToolSchema é adicionado automaticamente)
        });

        console.log("Chatbot pronto. Digite 'sair' para terminar.");
        console.log(`Papéis de especialistas disponíveis: ${getAvailableSpecialistRoles().join(', ')}`);

        // 3. Loop de Interação Simples (Exemplo de Console)
        const readline = require('readline').createInterface({
            input: process.stdin,
            output: process.stdout
        });

        function askQuestion() {
            readline.question('Você: ', async (userInput) => {
                if (userInput.toLowerCase() === 'sair') {
                    readline.close();
                    return;
                }

                console.log("Processando...")
                const response = await chatAgent.processUserMessage(userInput);
                console.log(`\nChatbot: ${response.text}\n`);

                askQuestion(); // Pergunta novamente
            });
        }

        askQuestion(); // Inicia o loop
    }

    main().catch(console.error);
    ```

**Passo 3.5: Integração e Testes Abrangentes**

*   **Ação:** Executar o sistema e testar rigorosamente diversos cenários.
*   **Cenários de Teste:**
    *   **Conversa Simples:** O `ChatAgent` responde diretamente?
    *   **Delegação Bem-sucedida:**
        *   Faça perguntas que *claramente* exigem cada um dos especialistas definidos.
        *   Verifique se o especialista correto é invocado (pelos logs).
        *   Verifique se a resposta final é coesa e integra o resultado do especialista.
    *   **Delegação Desnecessária:** Faça perguntas simples que *não* deveriam ser delegadas. O `ChatAgent` responde diretamente?
    *   **Escolha Incorreta do Especialista:** Faça perguntas ambíguas. O LLM escolhe o especialista certo? Ou pede esclarecimento?
    *   **Falha na Delegação:**
        *   Peça por um especialista inexistente.
        *   Simule um erro dentro do `executeTask` de um especialista. O `ChatAgent` lida com o erro graciosamente?
    *   **Contexto na Delegação:** Verifique se informações relevantes de mensagens anteriores são passadas corretamente na `task_for_specialist`.
    *   **Limite de Tokens/Comprimento:** Teste com conversas longas e tarefas complexas.

**4. Considerações Adicionais**

*   **Tratamento de Erros:** Implemente tratamento de erros robusto em todas as camadas (chamada LLM, busca no registry, execução do especialista, processamento da resposta). Forneça mensagens úteis nos logs e respostas adequadas ao usuário.
*   **Segurança:**
    *   **Validação:** Embora o `ChatAgent` filtre a tarefa, considere validar/sanitizar minimamente a `task_for_specialist` antes de passá-la ao especialista.
    *   **Escopo de Ferramentas:** Revise cuidadosamente as ferramentas (`tools`, `enableGoogleSearch`) concedidas a cada especialista. Princípio do menor privilégio.
*   **Prompt Engineering Iterativo:** O `context` do `ChatAgent` é crucial. Será necessário refiná-lo iterativamente com base nos testes para melhorar a precisão da decisão de delegação. Considere adicionar exemplos específicos (few-shot) no prompt se a performance não for ideal.
*   **Configuração:** Mova as definições dos especialistas (`specialistAgentsConfig`) para um arquivo de configuração (ex: JSON) para facilitar a manutenção e adição de novos especialistas sem modificar o código do registry.
*   **Logging:** Implemente logging detalhado para rastrear o fluxo: recebimento da mensagem, decisão do `ChatAgent` (direta ou delegação), qual especialista foi chamado, tarefa enviada, resposta do especialista, resposta final.

Este plano fornece uma base sólida para a implementação. Lembre-se que a parte de Prompt Engineering para o `ChatAgent` tomar a decisão correta de delegação será a mais desafiadora e exigirá experimentação.