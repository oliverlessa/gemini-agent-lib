 # Instruções de Implementação: Adicionando Google Search Retrieval à Classe `Agent`

Estas instruções detalham como adicionar a funcionalidade de pesquisa Google Search diretamente à classe `Agent` em sua biblioteca NodeJS de agentes de IA.

**Objetivo:**

Permitir que os agentes utilizem a pesquisa Google Search para complementar suas respostas, habilitando a funcionalidade através de uma nova propriedade booleana no construtor da classe `Agent`.

**Etapas de Implementação:**

**1. Adicionar a Propriedade `enableGoogleSearch` ao Construtor do `Agent`:**

   *   **Arquivo:** `agent.js`
   *   **Ação:** Modifique o construtor da classe `Agent` para incluir uma nova propriedade opcional chamada `enableGoogleSearch`. Defina o valor padrão como `false`.

     ```javascript
     constructor({
         role,
         objective,
         context,
         task,
         llm,
         tools = [], // Tools como um array vazio por padrão
         enableGoogleSearch = false // Nova propriedade para ativar o Google Search, padrão: false
     }) {
         this.role = role;
         this.objective = objective;
         this.context = context;
         this.task = task;
         this.llm = llm;
         this.tools = tools;
         this.enableGoogleSearch = enableGoogleSearch; // Atribui a nova propriedade 'enableGoogleSearch'
     }
     ```

**2. Modificar o Método `prepareToolsForLLM()` para Incluir `googleSearchRetrieval`:**

   *   **Arquivo:** `agent.js`
   *   **Ação:** Substitua o conteúdo da função `prepareToolsForLLM()` pela seguinte implementação corrigida. Esta versão garante que, quando `googleSearchRetrieval` é habilitado e tools estão definidas, ambas as configurações sejam combinadas corretamente em um único objeto dentro do array retornado.

     ```javascript
     prepareToolsForLLM() {
         if (!this.tools && !this.enableGoogleSearch) {
             return undefined; // Retorna undefined se não houver tools nem Google Search habilitado
         }

         const toolsConfig = {}; // Cria um objeto para conter as configurações combinadas

         // Mapeia todas as ferramentas para o formato de declaração de função
         if (this.tools && this.tools.length > 0) {
             const functionDeclarations = this.tools.map(tool => ({
                 name: tool.name,
                 description: tool.description,
                 parameters: tool.parameters ? this.convertParametersToGeminiFormat(tool.parameters) : undefined
             }));
             toolsConfig.functionDeclarations = functionDeclarations; // Adiciona functionDeclarations ao objeto de configuração
         }

         if (this.enableGoogleSearch) {
             toolsConfig.googleSearchRetrieval = { // Adiciona googleSearchRetrieval ao mesmo objeto de configuração
                 disableAttribution: false,
             };
         }

         return [toolsConfig]; // Retorna um array contendo um único objeto com ambas as configs (ou apenas uma, ou nenhuma)
     }
     ```

**3. Salvar as Alterações:**

   *   Certifique-se de salvar as modificações realizadas no arquivo `agent.js`.

**4. Próximos Passos (Após Implementação):**

   *   **Documentar a Funcionalidade:** Atualize a documentação da classe `Agent` para incluir a descrição e o uso da propriedade `enableGoogleSearch`.
   *   **Criar Testes:** Desenvolva casos de teste para verificar o correto funcionamento da funcionalidade `enableGoogleSearch`, incluindo cenários com e sem tools definidas, e valide o formato da configuração gerada por `prepareToolsForLLM`.
   *   **Testar a Implementação:** Execute os testes para garantir que a funcionalidade de pesquisa Google Search está habilitada corretamente e que não houve regressões em outras partes da biblioteca.

Seguindo estas instruções, você implementará a funcionalidade de pesquisa Google Search na classe `Agent`, proporcionando aos seus agentes a capacidade de acessar e utilizar informações da web para aprimorar suas respostas e capacidades. O próximo passo recomendado é criar testes para validar a implementação.