const FunctionDeclarationSchemaType = require('./function-declaration-schema-type');
const debug = require('./debug').agent;

/**
 * Classe Agent - Representa um agente especialista
 * 
 * Um agente é uma entidade que pode executar tarefas específicas usando um modelo de linguagem (LLM).
 * Cada agente tem um papel (role) e um objetivo específico, e pode ser configurado com ferramentas
 * adicionais, como Google Search ou formatadores de tarefa personalizados.
 */
class Agent {
    /**
     * Construtor da classe Agent
     * 
     * @param {Object} config - Configuração do agente
     * @param {string} config.role - Papel/função do agente (ex: "Pesquisador", "Analista")
     * @param {string} config.objective - Objetivo principal do agente
     * @param {string} config.context - Contexto ou instruções para o agente
     * @param {string} config.task - Tarefa específica a ser executada
     * @param {Object} config.llm - Instância do modelo de linguagem a ser usado
     * @param {Array} config.tools - Array de ferramentas disponíveis para o agente
     * @param {boolean} config.enableGoogleSearch - Ativa o Google Search para o agente
     * @param {Function} config.taskFormatter - Função para formatar tarefas de maneira personalizada
     */
    constructor({
        role,
        objective,
        context,
        task,
        llm,
        tools = [], // Tools como um array vazio por padrão
        enableGoogleSearch = false, // Propriedade para ativar o Google Search, padrão: false
        taskFormatter = null // Nova propriedade para formatador de tarefa personalizado
    }) {
        this.role = role;
        this.objective = objective;
        this.context = context;
        this.task = task;
        this.llm = llm;
        this.tools = tools;
        this.enableGoogleSearch = enableGoogleSearch;
        this.taskFormatter = taskFormatter; // Atribui o formatador de tarefa personalizado
    }

    async executeTask() {
        try {
            debug(`Agente: ${this.role} - Executando tarefa: ${this.task}`);
            debug(`Objetivo: ${this.objective}`);
            debug(`Contexto:\n${this.context}`);

            let prompt = `**System Instructions:**\n${this.context}\n\n**User Task:**\n${this.task}`;
            const toolsForLLM = this.prepareToolsForLLM();

            let response = await this.llm.generateContent({
                prompt: prompt,
                tools: toolsForLLM,
                 context: this.context
              });
  
             // Log para ver a resposta inicial completa do LLM
             debug("Resposta inicial do LLM: %o", response);
 
              // Loop para lidar com function calls
              while (response && response.functionCall) { // Verifica se response é válido antes de acessar functionCall
                 const functionCall = response.functionCall;
                debug(`\nLLM solicitou Function Call: ${functionCall.name}`);
                debug("Argumentos: %o", functionCall.args);

                const functionToExecute = this.findToolFunction(functionCall.name);
                if (!functionToExecute) {
                    const errorMessage = `Função '${functionCall.name}' não encontrada nas tools do agente.`;
                    console.error(errorMessage);
                    prompt += `\n\n**Function Call Error:**\nError: ${errorMessage}`;
                    response = await this.llm.generateContent({
                        prompt: prompt,
                        tools: toolsForLLM,
                        context: this.context
                    }); // Re-envia para o LLM com o erro
                    continue; // Pula para a próxima iteração do loop (espera resposta de texto do LLM sobre o erro)
                }

                // Executar a função e obter o resultado
                let functionResult;
                try {
                    // *** Adaptação para extrair argumentos corretamente ***
                    const functionArgs = functionCall.args || {}; // Usa um objeto vazio se args for undefined
                    debug(`Executando função '${functionCall.name}' com argumentos: %o`, functionArgs);
                    functionResult = await functionToExecute(functionArgs); // Passa os argumentos como um objeto
                    debug(`Resultado da Function Call '${functionCall.name}': %o`, functionResult);
                    
                    // Verificar se o resultado está vazio (para vertex_ai_search)
                    if (functionCall.name === 'vertex_ai_search' && functionResult.totalResults === 0) {
                        debug("AVISO: A busca no Vertex AI Search não retornou resultados.");
                    }
                } catch (error) {
                    console.error(`Erro ao executar a função '${functionCall.name}':`, error);
                    functionResult = `Erro ao executar a função '${functionCall.name}': ${error.message}`;
                }

                // Enviar o resultado da função de volta para o LLM e obter a próxima resposta
                prompt += `\n\n**Function Call Result:**\nFunction '${functionCall.name}' result: ${JSON.stringify(functionResult)}`;
                response = await this.llm.generateContent({
                    prompt: prompt,
                    tools: toolsForLLM,
                    context: this.context
                }); // Re-enviar para o LLM com o resultado
            }

            // Log temporário para verificar a estrutura completa da resposta
            // debug("DEBUG - Objeto response completo: %o", response);
            
            // O processamento dos metadados de grounding (Google Search) agora é feito na classe VertexAILLM
            return response ? response.text : "Nenhuma resposta do LLM."; // Retorna a resposta de texto final ou mensagem padrão

        } catch (error) {
            console.error("Erro ao executar a tarefa do agente:", error);
            return `Ocorreu um erro ao executar a tarefa: ${error.message}`;
        }
    }

    prepareToolsForLLM() {
        debug("Preparando ferramentas para o LLM...");
        debug(`Ferramentas configuradas: ${this.tools ? this.tools.map(t => t.name).join(', ') : 'Nenhuma'}`);
        debug(`Google Search habilitado: ${this.enableGoogleSearch}`);

        // Verifica se não há ferramentas nem Google Search habilitado
        if ((!this.tools || this.tools.length === 0) && !this.enableGoogleSearch) {
            debug("Nenhuma ferramenta ou Google Search habilitado. Retornando undefined.");
            return undefined; // Retorna undefined se não houver tools nem Google Search habilitado
        }

        const isVertexAI = this.llm.constructor.name === 'VertexAILLM'; // Embora não usado atualmente, mantido para referência futura
        
        // Para Vertex AI, não podemos combinar function calling e Google Search
        // Prioriza function calling se ambos estiverem habilitados
        let disableSearch = false;
        // if (isVertexAI && this.tools && this.tools.length > 0 && this.enableGoogleSearch) {
        //     console.log("Aviso: Vertex AI não suporta o uso simultâneo de function calling e Google Search Retrieval. Priorizando function calling.");
        // }
        if (this.tools && this.tools.length > 0 && this.enableGoogleSearch) {
            disableSearch = true;
            debug("Aviso: não suportado o uso simultâneo de function calling e Google Search Retrieval. Priorizando function calling.");
        }

        const toolsConfig = {}; // Cria um objeto para conter as configurações combinadas

        // Mapeia todas as ferramentas para o formato de declaração de função
        if (this.tools && this.tools.length > 0) {
            debug("Mapeando ferramentas para o formato FunctionDeclaration...");
            const functionDeclarations = this.tools.map(tool => {
                 debug(`  - Mapeando ferramenta: ${tool.name}`);
                 return {
                    name: tool.name,
                    description: tool.description,
                    parameters: tool.parameters ? this.convertParametersToGeminiFormat(tool.parameters) : undefined
                 };
            });
            toolsConfig.functionDeclarations = functionDeclarations; // Adiciona functionDeclarations ao objeto de configuração
            debug("Declarações de função preparadas: %o", functionDeclarations);

            // Para Vertex AI, se tiver function calling, não adiciona Google Search
            // if (isVertexAI) {
            //     return [toolsConfig]; // Retorna apenas function calling para Vertex AI
            // }
            if (disableSearch) {
                return [toolsConfig]; // Retorna apenas function calling para Vertex AI
            }
        }

        // Adiciona Google Search se habilitado (e se não for desabilitado pela presença de function calling)
        if (this.enableGoogleSearch && !disableSearch) {
             debug("Adicionando configuração do Google Search.");
            toolsConfig.google_search = {}; // Adiciona a configuração vazia para ativar o search
        } else if (this.enableGoogleSearch && disableSearch) {
            debug("Google Search habilitado, mas desativado devido à presença de function calling.");
        }


        debug("Configuração final das ferramentas para o LLM: %o", toolsConfig);
        return [toolsConfig]; // Retorna um array contendo um único objeto com as configs
    }

    convertParametersToGeminiFormat(params) {
        if (!params) {
            return undefined;
        }

        // Cria uma cópia para não modificar o objeto original
        const geminiParams = { ...params };
        
        // Converte o tipo do parâmetro principal para o formato FunctionDeclarationSchemaType
        if (geminiParams.type) {
            geminiParams.type = this.convertTypeToSchemaType(geminiParams.type);
        }
        
        // Converte os tipos das propriedades para o formato FunctionDeclarationSchemaType
        if (geminiParams.properties) {
            for (const propName in geminiParams.properties) {
                const prop = geminiParams.properties[propName];
                if (prop.type) {
                    prop.type = this.convertTypeToSchemaType(prop.type);
                }
                
                // Processa propriedades aninhadas se existirem
                if (prop.properties) {
                    prop.properties = this.convertNestedProperties(prop.properties);
                }
                
                // Processa itens de array se existirem
                if (prop.items && prop.items.type) {
                    prop.items.type = this.convertTypeToSchemaType(prop.items.type);
                }
            }
        }
        
        return geminiParams;
    }
    
    convertTypeToSchemaType(type) {
        // Converte o tipo para o formato FunctionDeclarationSchemaType
        const typeStr = typeof type === 'string' ? type.toUpperCase() : type;
        
        switch (typeStr) {
            case 'STRING':
            case 'string':
                return FunctionDeclarationSchemaType.STRING;
            case 'NUMBER':
            case 'number':
                return FunctionDeclarationSchemaType.NUMBER;
            case 'BOOLEAN':
            case 'boolean':
                return FunctionDeclarationSchemaType.BOOLEAN;
            case 'OBJECT':
            case 'object':
                return FunctionDeclarationSchemaType.OBJECT;
            case 'ARRAY':
            case 'array':
                return FunctionDeclarationSchemaType.ARRAY;
            case 'NULL':
            case 'null':
                return FunctionDeclarationSchemaType.NULL;
            default:
                return FunctionDeclarationSchemaType.ANY;
        }
    }
    
    convertNestedProperties(properties) {
        // Processa propriedades aninhadas recursivamente
        const convertedProps = { ...properties };
        
        for (const propName in convertedProps) {
            const prop = convertedProps[propName];
            if (prop.type) {
                prop.type = this.convertTypeToSchemaType(prop.type);
            }
            
            if (prop.properties) {
                prop.properties = this.convertNestedProperties(prop.properties);
            }
            
            if (prop.items && prop.items.type) {
                prop.items.type = this.convertTypeToSchemaType(prop.items.type);
            }
        }
        
        return convertedProps;
    }
  
      findToolFunction(functionName) {
         debug(`Procurando pela função da ferramenta: '${functionName}'`);
          const tool = this.tools.find(tool => tool.name === functionName);
         if (tool) {
             debug(`Ferramenta '${functionName}' encontrada.`);
         } else {
             debug(`Ferramenta '${functionName}' NÃO encontrada.`);
         }
          return tool ? tool.function : undefined;
      }
}

module.exports = Agent;
