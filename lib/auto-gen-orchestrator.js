// auto-gen-orchestrator.js
const VertexAILLM = require('./vertex-ai-llm'); // LLM VertexAI
const Agent = require('./agent');
const ThinkingAgent = require('./thinking-agent');

class AutoGenOrchestrator {
    constructor({ 
        apiKey, 
        projectId, 
        location = 'us-central1', 
        credentialsPath, 
        modelName = 'gemini-2.0-flash-001', 
        mode = 'oneshot' 
    }) { // Construtor recebe parâmetros expandidos
        if (!projectId) {
            throw new Error("Project ID do Google Cloud não fornecido para AutoGenOrchestrator.");
        }
        if (!credentialsPath) {
            throw new Error("Caminho para as credenciais do Google Cloud não fornecido para AutoGenOrchestrator.");
        }

        // Armazenar configurações para uso posterior na criação de agentes
        this.config = {
            apiKey,
            projectId,
            location,
            credentialsPath,
            modelName,
            mode
        };

        // Criar um ThinkingAgent para o orquestrador em vez de usar VertexAILLM diretamente
        this.orchestratorAgent = new ThinkingAgent({
            role: "Orquestrador Autônomo",
            objective: "Orquestrar tarefas complexas dividindo-as em sub-tarefas e delegando-as a agentes especializados",
            context: "Você é um orquestrador autônomo de agentes de IA. Sua função é analisar tarefas complexas, dividi-las em sub-tarefas menores, e coordenar agentes especializados para executá-las.",
            task: "", // Será definido dinamicamente para cada operação
            apiKey: apiKey,
            useVertexAI: true,
            vertexConfig: {
                projectId: projectId,
                location: location,
                credentialsPath: credentialsPath
            }
        });

        this.agents = []; // Array para armazenar os agentes especialistas criados dinamicamente
    }

    async orchestrateTask(userTask) {
        console.log("\n--- AutoGenOrchestrator - Iniciando Orquestração Autônoma ---");
        console.log(`Tarefa do Usuário: ${userTask}`);

        // *** Fase 1: Planejamento da Tarefa ***
        const plan = await this.generateTaskPlan(userTask);
        console.log("\n--- AutoGenOrchestrator - Plano Gerado ---");
        console.log(plan);

        if (!plan || !Array.isArray(plan.subTasks) || plan.subTasks.length === 0) {
            console.warn("\nAutoGenOrchestrator - Plano vazio ou inválido retornado pelo LLM.");
            return "Não foi possível gerar um plano válido para a tarefa."; // Tratar plano vazio
        }

        // *** Fase 2: Execução das Sub-Tarefas pelos Agentes ***
        const subTaskResults = await this.executeSubTasks(plan.subTasks);
        console.log("\n--- AutoGenOrchestrator - Resultados das Sub-Tarefas ---");
        console.log(subTaskResults);

        // *** Fase 3: Geração da Resposta Final ***
        const finalResponse = await this.generateFinalResponse(userTask, plan, subTaskResults);
        console.log("\n--- AutoGenOrchestrator - Resposta Final ---");
        console.log(finalResponse);

        console.log("\n--- AutoGenOrchestrator - Orquestração Autônoma Concluída ---");
        return finalResponse;
    }

    async generateTaskPlan(userTask) {
        // *** Implementar a lógica para gerar o plano de tarefas usando o ThinkingAgent ***
        const promptForPlanning = `
            **Tarefa Principal do Usuário:**
            ${userTask}

            **Instruções:**
            1. Analise a tarefa principal e crie um plano detalhado e passo a passo para alcançar o objetivo.
            2. Divida a tarefa em sub-tarefas **claras, específicas e acionáveis**. Cada sub-tarefa deve ser pequena e bem definida, representando um passo lógico no caminho para completar a tarefa principal.
            3. Para cada sub-tarefa, determine qual **tipo de agente** é mais adequado para executá-la de forma eficiente (ex: "Agente de Pesquisa", "Agente de Análise", "Agente de Escrita", etc.). Seja específico sobre o papel do agente.
            4. **IMPORTANTE**: Identifique as dependências entre sub-tarefas. Se uma sub-tarefa precisa do resultado de outra para ser executada, especifique essa dependência.
            5. Para cada sub-tarefa e agente, defina um **objetivo conciso e um prompt (tarefa)** muito **específico** que guie o agente na execução da sub-tarefa. O prompt deve ser *direto e objetivo*, indicando exatamente o que o agente deve fazer e qual resultado entregar.
            6. Se alguma sub-tarefa se beneficiar da **pesquisa Google Search**, indique explicitamente qual agente deve ter a pesquisa Google habilitada.
            7. Retorne o plano em formato JSON. O JSON deve ser um array de objetos, onde cada objeto representa uma sub-tarefa e tem as seguintes propriedades: "id" (identificador único da sub-tarefa), "taskDescription" (descrição da sub-tarefa), "agentRole" (papel do agente), "agentObjective" (objetivo do agente), "agentTaskPrompt" (prompt/tarefa para o agente), "enableGoogleSearch" (booleano, se o agente deve usar Google Search), "dependsOn" (array de IDs de sub-tarefas das quais esta depende).

            **Formato de Resposta JSON Esperado:**
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
                },
                // ... mais sub-tarefas ...
              ]
            }
        `;

        console.log("\n--- AutoGenOrchestrator - Gerando Plano de Tarefas com ThinkingAgent ---");
        console.log("Prompt para Planejamento:\n", promptForPlanning);

        try {
            // Definir a tarefa para o ThinkingAgent
            this.orchestratorAgent.task = promptForPlanning;
            
            // Executar a tarefa e obter a resposta bruta
            const rawResponse = await this.orchestratorAgent.executeTask();
            
            // Processar a resposta usando o método processThinkingResponse
            const processedResponse = this.orchestratorAgent.processThinkingResponse(rawResponse);
            
            console.log("\n--- AutoGenOrchestrator - Resposta Processada do ThinkingAgent ---");
            console.log("Resposta Final:", processedResponse.finalAnswer);
            console.log("Passos de Raciocínio:", processedResponse.thinkingSteps ? "Disponíveis" : "Não disponíveis");
            
            // Tentar extrair o JSON da resposta final
            try {
                console.log("\n--- AutoGenOrchestrator - Tentando extrair JSON da resposta ---");
                
                // Procurar por blocos de código JSON na resposta
                const jsonMatch = processedResponse.finalAnswer.match(/```json\s*([\s\S]*?)\s*```/) || 
                                 processedResponse.finalAnswer.match(/```\s*([\s\S]*?)\s*```/) ||
                                 processedResponse.finalAnswer.match(/{[\s\S]*?}/);
                
                if (!jsonMatch) {
                    console.warn("Não foi possível encontrar um bloco JSON válido na resposta");
                    console.log("Resposta completa:", processedResponse.finalAnswer);
                    return { subTasks: [] };
                }
                
                let jsonContent = jsonMatch[1] || jsonMatch[0];
                
                // Limpar o conteúdo JSON (remover caracteres que possam interferir no parsing)
                jsonContent = jsonContent.replace(/```json|```/g, '').trim();
                
                // Remover comentários que possam estar no JSON
                jsonContent = jsonContent.replace(/\/\/.*$/gm, '');
                
                // Verificar se o JSON começa com { e termina com }
                if (!jsonContent.startsWith('{') || !jsonContent.endsWith('}')) {
                    console.warn("O conteúdo extraído não parece ser um JSON válido");
                    
                    // Tentar encontrar o início e fim do objeto JSON
                    const startIndex = jsonContent.indexOf('{');
                    const endIndex = jsonContent.lastIndexOf('}');
                    
                    if (startIndex >= 0 && endIndex > startIndex) {
                        jsonContent = jsonContent.substring(startIndex, endIndex + 1);
                        console.log("JSON extraído após correção:", jsonContent);
                    } else {
                        console.warn("Não foi possível corrigir o JSON");
                        return { subTasks: [] };
                    }
                }
                
                // Abordagem completamente nova: extrair e reconstruir o JSON manualmente
                try {
                    console.log("Reconstruindo o JSON manualmente...");
                    
                    // Imprimir o conteúdo JSON para depuração
                    console.log("Conteúdo JSON original:", jsonContent);
                    
                    // Verificar se o conteúdo contém a string "subTasks"
                    if (!jsonContent.includes("subTasks")) {
                        console.warn("A string 'subTasks' não foi encontrada no conteúdo JSON");
                        
                        // Verificar se o conteúdo contém tarefas
                        if (jsonContent.includes("task1") || jsonContent.includes("taskDescription")) {
                            console.log("Encontradas tarefas no conteúdo, mas sem a estrutura subTasks");
                            
                            // Retornar um array vazio de subTasks e registrar o problema
                            console.log("Não foi possível extrair a estrutura de tarefas da resposta. Retornando plano vazio.");
                            return { subTasks: [] };
                        } else {
                            console.warn("Nenhuma tarefa encontrada no conteúdo JSON");
                            return { subTasks: [] };
                        }
                    }
                    
                    // Abordagem mais direta: procurar por padrões de tarefas no texto completo
                    // Procurar por padrões como "id": "task1"
                    const idMatches = jsonContent.match(/"id"\s*:\s*"([^"]*)"/g) || [];
                    console.log(`Encontrados ${idMatches.length} IDs de tarefas`);
                    
                    if (idMatches.length === 0) {
                        console.warn("Nenhum ID de tarefa encontrado no conteúdo JSON");
                        return { subTasks: [] };
                    }
                    
                    // Array para armazenar as tarefas reconstruídas
                    const tasks = [];
                    
                    // Para cada ID encontrado, extrair os dados da tarefa correspondente
                    for (let i = 0; i < idMatches.length; i++) {
                        // Extrair o ID da tarefa
                        const idMatch = idMatches[i].match(/"id"\s*:\s*"([^"]*)"/);
                        const taskId = idMatch ? idMatch[1] : `task${i + 1}`;
                        
                        console.log(`Processando tarefa com ID: ${taskId}`);
                        
                        // Encontrar a descrição da tarefa
                        const descRegex = new RegExp(`"taskDescription"\\s*:\\s*"([^"]*)"`, 'g');
                        const descMatches = [...jsonContent.matchAll(descRegex)];
                        const descMatch = descMatches[i] || null;
                        const taskDescription = descMatch ? descMatch[1] : `Tarefa ${i + 1}`;
                        
                        // Encontrar o papel do agente
                        const roleRegex = new RegExp(`"agentRole"\\s*:\\s*"([^"]*)"`, 'g');
                        const roleMatches = [...jsonContent.matchAll(roleRegex)];
                        const roleMatch = roleMatches[i] || null;
                        const agentRole = roleMatch ? roleMatch[1] : "Agente Especialista";
                        
                        // Encontrar o objetivo do agente
                        const objectiveRegex = new RegExp(`"agentObjective"\\s*:\\s*"([^"]*)"`, 'g');
                        const objectiveMatches = [...jsonContent.matchAll(objectiveRegex)];
                        const objectiveMatch = objectiveMatches[i] || null;
                        const agentObjective = objectiveMatch ? objectiveMatch[1] : "Executar a tarefa designada";
                        
                        // Encontrar o prompt da tarefa
                        const promptRegex = new RegExp(`"agentTaskPrompt"\\s*:\\s*"([^"]*)"`, 'g');
                        const promptMatches = [...jsonContent.matchAll(promptRegex)];
                        const promptMatch = promptMatches[i] || null;
                        const agentTaskPrompt = promptMatch ? promptMatch[1] : "Executar a tarefa conforme necessário";
                        
                        // Encontrar se a pesquisa Google está habilitada
                        const searchRegex = new RegExp(`"enableGoogleSearch"\\s*:\\s*(true|false)`, 'g');
                        const searchMatches = [...jsonContent.matchAll(searchRegex)];
                        const searchMatch = searchMatches[i] || null;
                        const enableGoogleSearch = searchMatch ? searchMatch[1] === "true" : false;
                        
                        // Encontrar as dependências
                        // Primeiro, encontrar todas as ocorrências de "dependsOn": [...]
                        const dependsOnRegex = new RegExp(`"dependsOn"\\s*:\\s*\\[(.*?)\\]`, 'g');
                        const dependsOnMatches = [...jsonContent.matchAll(dependsOnRegex)];
                        const dependsOnMatch = dependsOnMatches[i] || null;
                        
                        let dependsOn = [];
                        if (dependsOnMatch && dependsOnMatch[1]) {
                            // Extrair os IDs das dependências
                            const depsStr = dependsOnMatch[1];
                            // Procurar por strings entre aspas
                            const depsRegex = /"([^"]*)"/g;
                            let depMatch;
                            while ((depMatch = depsRegex.exec(depsStr)) !== null) {
                                dependsOn.push(depMatch[1]);
                            }
                            
                            // Se não encontrou nenhuma dependência com aspas, tente sem aspas
                            if (dependsOn.length === 0) {
                                dependsOn = depsStr.split(/\s+/).filter(s => s.trim() && s !== ',');
                            }
                        }
                        
                        // Criar o objeto de tarefa com os campos extraídos
                        const task = {
                            id: taskId,
                            taskDescription: taskDescription,
                            agentRole: agentRole,
                            agentObjective: agentObjective,
                            agentTaskPrompt: agentTaskPrompt,
                            enableGoogleSearch: enableGoogleSearch,
                            dependsOn: dependsOn
                        };
                        
                        console.log(`Tarefa ${i + 1} reconstruída:`, JSON.stringify(task, null, 2));
                        tasks.push(task);
                    }
                    
                    // Criar o objeto JSON final
                    const planJSON = { subTasks: tasks };
                    console.log("JSON reconstruído manualmente:", JSON.stringify(planJSON, null, 2));
                    
                    // Verificar se o JSON tem a estrutura esperada
                    if (!planJSON.subTasks || !Array.isArray(planJSON.subTasks) || planJSON.subTasks.length === 0) {
                        console.warn("JSON reconstruído não contém subTasks válidas");
                        return { subTasks: [] };
                    }
                    
                    return planJSON; // Retorna o plano em formato JSON
                    
                } catch (reconstructError) {
                    console.error("Falha na reconstrução manual do JSON:", reconstructError);
                    console.error(reconstructError.stack); // Imprimir a pilha de erros para depuração
                    
                    // Retornar um plano vazio em caso de falha na reconstrução
                    console.log("Falha na reconstrução do JSON. Retornando plano vazio.");
                    return { subTasks: [] };
                }
                
                console.log("JSON após correções de formato:", jsonContent);
                
                // Tentar parsear o JSON
                let planJSON;
                try {
                    planJSON = JSON.parse(jsonContent);
                } catch (parseError) {
                    console.error("Erro ao parsear JSON:", parseError);
                    console.log("Conteúdo JSON problemático:", jsonContent);
                    
                    // Tentativa mais agressiva de recuperação
                    try {
                        // Usar uma abordagem alternativa: reconstruir o JSON manualmente
                        console.log("Tentando reconstruir o JSON manualmente...");
                        
                        // Extrair subTasks usando regex
                        const subTasksMatch = jsonContent.match(/"subTasks"\s*:\s*\[([\s\S]*?)\]/);
                        if (!subTasksMatch) {
                            console.warn("Não foi possível encontrar o array de subTasks");
                            return { subTasks: [] };
                        }
                        
                        const subTasksContent = subTasksMatch[1];
                        
                        // Dividir em objetos de tarefas individuais
                        const taskRegex = /{[^{}]*(?:{[^{}]*}[^{}]*)*}/g;
                        const taskMatches = subTasksContent.match(taskRegex) || [];
                        
                        // Processar cada tarefa individualmente
                        const tasks = taskMatches.map(taskStr => {
                            try {
                                // Corrigir formato de cada tarefa
                                let fixedTask = taskStr
                                    .replace(/"?(\w+)"?\s*:/g, '"$1":') // Adicionar aspas em chaves
                                    .replace(/,\s*}/g, '}'); // Remover vírgulas extras
                                
                                // Tentar parsear a tarefa
                                return JSON.parse(fixedTask);
                            } catch (err) {
                                console.warn(`Erro ao parsear tarefa individual: ${err.message}`);
                                // Extrair informações básicas usando regex
                                const idMatch = taskStr.match(/"id"\s*:\s*"([^"]*)"/);
                                const descMatch = taskStr.match(/"taskDescription"\s*:\s*"([^"]*)"/);
                                const roleMatch = taskStr.match(/"agentRole"\s*:\s*"([^"]*)"/);
                                
                                return {
                                    id: idMatch ? idMatch[1] : `task${Math.floor(Math.random() * 1000)}`,
                                    taskDescription: descMatch ? descMatch[1] : "Tarefa recuperada parcialmente",
                                    agentRole: roleMatch ? roleMatch[1] : "Agente Especialista",
                                    agentObjective: "Objetivo recuperado parcialmente",
                                    agentTaskPrompt: "Executar a tarefa conforme necessário",
                                    enableGoogleSearch: false,
                                    dependsOn: []
                                };
                            }
                        });
                        
                        planJSON = { subTasks: tasks };
                        console.log("JSON reconstruído manualmente:", JSON.stringify(planJSON, null, 2));
                    } catch (reconstructError) {
                        console.error("Falha na reconstrução manual do JSON:", reconstructError);
                        return { subTasks: [] };
                    }
                }
                
                // Verificar se o JSON tem a estrutura esperada
                if (!planJSON.subTasks || !Array.isArray(planJSON.subTasks)) {
                    console.warn("JSON não contém a estrutura esperada com 'subTasks'");
                    return { subTasks: [] };
                }
                
                // Garantir que cada sub-tarefa tenha um ID e um array dependsOn
                planJSON.subTasks.forEach((task, index) => {
                    if (!task.id) {
                        task.id = `task${index + 1}`;
                        console.log(`Adicionado ID automático para sub-tarefa: ${task.id}`);
                    }
                    
                    if (!task.dependsOn || !Array.isArray(task.dependsOn)) {
                        task.dependsOn = [];
                        console.log(`Inicializado array dependsOn vazio para sub-tarefa: ${task.id}`);
                    }
                });
                
                console.log("JSON extraído e processado com sucesso");
                return planJSON; // Retorna o plano em formato JSON
            } catch (error) {
                console.error("Erro ao parsear plano do ThinkingAgent como JSON:", error);
                console.warn("Retornando plano vazio devido a falha no parsing JSON.");
                return { subTasks: [] }; // Retorna plano vazio em caso de falha no parsing JSON
            }

        } catch (error) {
            console.error("Erro ao gerar plano de tarefas com ThinkingAgent:", error);
            return { subTasks: [] }; // Retorna plano vazio em caso de erro na chamada ao ThinkingAgent
        }
    }

    /**
     * Ordena as sub-tarefas com base em suas dependências usando ordenação topológica
     * 
     * @param {Array} subTasks - Array de sub-tarefas a serem ordenadas
     * @returns {Array} - Array de sub-tarefas ordenadas por dependências
     */
    orderSubTasksByDependencies(subTasks) {
        // Criar um grafo de dependências
        const graph = {};
        const inDegree = {};
        
        // Inicializar o grafo e os graus de entrada
        subTasks.forEach(task => {
            const id = task.id || task.taskDescription;
            graph[id] = [];
            inDegree[id] = 0;
        });
        
        // Construir o grafo de dependências
        subTasks.forEach(task => {
            const id = task.id || task.taskDescription;
            if (task.dependsOn && Array.isArray(task.dependsOn)) {
                task.dependsOn.forEach(depId => {
                    if (graph[depId]) {
                        graph[depId].push(id);
                        inDegree[id]++;
                    } else {
                        console.warn(`Aviso: Dependência ${depId} não encontrada no grafo para a tarefa ${id}`);
                    }
                });
            }
        });
        
        // Ordenação topológica usando BFS
        const queue = [];
        const orderedTaskIds = [];
        
        // Adicionar à fila todas as tarefas sem dependências
        subTasks.forEach(task => {
            const id = task.id || task.taskDescription;
            if (inDegree[id] === 0) {
                queue.push(id);
            }
        });
        
        // Processar a fila
        while (queue.length > 0) {
            const currentId = queue.shift();
            orderedTaskIds.push(currentId);
            
            // Reduzir o grau de entrada de todos os vizinhos
            graph[currentId].forEach(neighborId => {
                inDegree[neighborId]--;
                if (inDegree[neighborId] === 0) {
                    queue.push(neighborId);
                }
            });
        }
        
        // Verificar se há ciclos no grafo
        if (orderedTaskIds.length !== subTasks.length) {
            console.warn("Aviso: Detectado ciclo de dependências no plano de tarefas! Usando ordem original.");
            return subTasks; // Retorna a ordem original em caso de ciclo
        }
        
        // Mapear os IDs ordenados de volta para os objetos de sub-tarefas
        const taskMap = {};
        subTasks.forEach(task => {
            const id = task.id || task.taskDescription;
            taskMap[id] = task;
        });
        
        return orderedTaskIds.map(id => taskMap[id]);
    }

    async executeSubTasks(subTasks) {
        // *** Ordenar as sub-tarefas com base nas dependências ***
        const orderedSubTasks = this.orderSubTasksByDependencies(subTasks);
        console.log("\n--- AutoGenOrchestrator - Ordem de Execução das Sub-Tarefas ---");
        console.log(orderedSubTasks.map(task => task.id || task.taskDescription).join(" -> "));
        
        // *** Implementar a lógica para executar cada sub-tarefa com agentes especializados ***
        const subTaskResults = {}; // Objeto para armazenar resultados de cada sub-tarefa

        for (const subTask of orderedSubTasks) {
            const taskId = subTask.id || subTask.taskDescription;
            console.log(`\n--- AutoGenOrchestrator - Executando Sub-Tarefa: ${subTask.taskDescription} (ID: ${taskId}) ---`);

            // *** Criar Agente Dinamicamente com base no plano ***
            const specializedAgent = this.createSpecializedAgent(subTask);
            if (!specializedAgent) {
                console.error(`Erro ao criar agente especialista para sub-tarefa: ${subTask.taskDescription}`);
                subTaskResults[taskId] = "Erro ao criar agente especialista.";
                continue; // Pular para a próxima sub-tarefa em caso de falha na criação do agente
            }
            this.agents.push(specializedAgent); // Adicionar agente à lista de agentes gerenciados

            // *** Preparar o prompt com os resultados das dependências ***
            let agentTaskPrompt = subTask.agentTaskPrompt;
            
            // Se a sub-tarefa tem dependências, adicionar os resultados ao prompt
            if (subTask.dependsOn && Array.isArray(subTask.dependsOn) && subTask.dependsOn.length > 0) {
                let dependencyContext = "\n\n**Resultados de Tarefas Anteriores:**\n";
                
                for (const depId of subTask.dependsOn) {
                    if (subTaskResults[depId]) {
                        dependencyContext += `\n--- Resultado da Tarefa ${depId} ---\n${subTaskResults[depId]}\n`;
                    } else {
                        console.warn(`Aviso: Resultado da dependência ${depId} não encontrado para a tarefa ${taskId}`);
                    }
                }
                
                // Adicionar o contexto de dependência ao prompt
                agentTaskPrompt += dependencyContext;
            }

            // *** Executar a Tarefa do Agente Especialista ***
            try {
                specializedAgent.task = agentTaskPrompt; // Define o prompt específico para o agente
                const agentResponse = await specializedAgent.executeTask();
                subTaskResults[taskId] = agentResponse;
                console.log(`\n--- AutoGenOrchestrator - Sub-Tarefa Concluída: ${subTask.taskDescription} (ID: ${taskId}) ---`);
                console.log(`Resultado do Agente ${subTask.agentRole}:\n`, agentResponse);

            } catch (error) {
                console.error(`Erro ao executar sub-tarefa "${subTask.taskDescription}" com agente ${subTask.agentRole}:`, error);
                subTaskResults[taskId] = `Erro na execução da sub-tarefa: ${error.message}`;
            }
        }

        return subTaskResults; // Retorna objeto com resultados de todas as sub-tarefas
    }

    createSpecializedAgent(subTask) {
        // *** Implementar a lógica para criar dinamicamente agentes especializados com base na descrição da sub-tarefa ***
        // *** (Usar VertexAILLM com as configurações definidas no construtor) ***

        console.log("\n--- AutoGenOrchestrator - Criando Agente Especialista: ", subTask.agentRole);

        try {
            // Usar as configurações armazenadas no objeto this.config
            const specializedLLM = new VertexAILLM({ // Instancia VertexAILLM para agente especialista
                apiKey: this.config.apiKey,
                projectId: this.config.projectId,
                location: this.config.location,
                credentialsPath: this.config.credentialsPath,
                modelName: this.config.modelName || "gemini-2.0-flash-001", // Usa o modelo definido no construtor
                mode: this.config.mode || "oneshot" // Usa o modo definido no construtor
            });

            const agent = new Agent({ // Cria instância da classe Agent (ou ThinkingAgent se precisar de capacidades thinking nos especialistas)
                role: subTask.agentRole,
                objective: subTask.agentObjective,
                context: `Você é um agente de IA especialista com o papel de ${subTask.agentRole}. Seu objetivo é: ${subTask.agentObjective}.`, // Contexto genérico - pode ser mais específico
                task: subTask.agentTaskPrompt,
                llm: specializedLLM,
                tools: [], // Agentes especialistas inicialmente sem tools - pode adicionar tools específicas no plano se necessário
                enableGoogleSearch: subTask.enableGoogleSearch === true // Habilita Google Search se indicado no plano
            });
            return agent;

        } catch (error) {
            console.error("Erro ao criar agente especialista:", error);
            return null; // Retorna null em caso de falha na criação do agente
        }
    }


    async generateFinalResponse(userTask, plan, subTaskResults) {
        // *** Implementar a lógica para gerar a resposta final combinando os resultados das sub-tarefas ***
        // *** Usando o ThinkingAgent para gerar uma resposta final coesa e informativa ***

        // Usar a ordem de execução para apresentar os resultados
        const orderedSubTasks = this.orderSubTasksByDependencies(plan.subTasks);
        
        let combinedResultsText = "";
        for (const subTask of orderedSubTasks) {
            const taskId = subTask.id || subTask.taskDescription;
            const taskDescription = subTask.taskDescription;
            const result = subTaskResults[taskId] || "Resultado não disponível";
            
            combinedResultsText += `\n**Sub-Tarefa ${taskId}:** ${taskDescription}\n**Resultado:** ${result}\n`;
            
            // Adicionar informações sobre dependências
            if (subTask.dependsOn && subTask.dependsOn.length > 0) {
                combinedResultsText += `**Dependências:** ${subTask.dependsOn.join(", ")}\n`;
            }
        }

        const promptForFinalResponse = `
            **Tarefa Principal do Usuário:**
            ${userTask}

            **Plano de Tarefas Gerado:**
            ${JSON.stringify(plan, null, 2)}

            **Resultados das Sub-Tarefas Executadas:**
            ${combinedResultsText}

            **Instruções:**
            Com base no plano de tarefas e nos resultados das sub-tarefas, gere uma **resposta final clara, concisa e completa** para a tarefa principal do usuário.
            Integre os resultados das sub-tarefas de forma lógica e organizada para fornecer a melhor resposta possível.
            
            Sua resposta deve ser abrangente, bem estruturada e diretamente relacionada à tarefa original do usuário.
            Não inclua informações sobre o processo de orquestração ou os agentes utilizados, foque apenas no conteúdo da resposta.
        `;

        console.log("\n--- AutoGenOrchestrator - Gerando Resposta Final com ThinkingAgent ---");
        console.log("Prompt para Resposta Final:\n", promptForFinalResponse);

        try {
            // Definir a tarefa para o ThinkingAgent
            this.orchestratorAgent.task = promptForFinalResponse;
            
            // Executar a tarefa e obter a resposta bruta
            const rawResponse = await this.orchestratorAgent.executeTask();
            
            // Processar a resposta usando o método processThinkingResponse
            const processedResponse = this.orchestratorAgent.processThinkingResponse(rawResponse);
            
            console.log("\n--- AutoGenOrchestrator - Resposta Processada do ThinkingAgent para Resposta Final ---");
            console.log("Resposta Final:", processedResponse.finalAnswer ? "Disponível" : "Não disponível");
            
            // Retornar a resposta final processada, ou a resposta bruta se não for possível processar
            let finalResponseText = processedResponse.finalAnswer || rawResponse;
            
            // Verificar se a resposta final não está vazia ou é apenas caracteres especiais
            if (!finalResponseText || finalResponseText.trim().length < 10 || /^[\*\s]+$/.test(finalResponseText.trim())) {
                console.warn("Resposta final vazia ou inválida, usando resposta bruta completa");
                finalResponseText = rawResponse;
            }
            
            console.log("\n--- AutoGenOrchestrator - Resposta Final Gerada ---");
            console.log(finalResponseText);
            
            return finalResponseText;

        } catch (error) {
            console.error("Erro ao gerar resposta final com ThinkingAgent:", error);
            return "Erro ao gerar resposta final orquestrada."; // Retorna mensagem de erro genérica
        }
    }
}

module.exports = AutoGenOrchestrator;
