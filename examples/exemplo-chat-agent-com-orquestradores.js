/**
 * Exemplo de uso do ChatAgent com orquestradores como ferramentas
 * 
 * Este exemplo demonstra como configurar e utilizar o ChatAgent com orquestradores
 * como ferramentas, permitindo que o agente de chat delegue tarefas complexas para
 * sistemas de orquestração especializados.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const readline = require('readline');

// Importações necessárias
const { 
    ChatAgent, 
    VertexAILLM, 
    FunctionDeclarationSchemaType, 
    Agent,
    memory
} = require('..');
const OrchestratorRegistry = require('../lib/orchestrator-registry');
const { createOrchestratorTool } = require('../lib/orchestrator-tool-factory');

// --- Configuração dos Orquestradores ---

// Configuração de LLM para os agentes e orquestradores
const llmConfig = {
    model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-001',
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || process.env.VERTEX_PROJECT_ID,
    location: process.env.VERTEX_LOCATION || 'us-central1',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
};

// Criar instâncias de LLM para os agentes especialistas
const marketAnalystLLM = new VertexAILLM({...llmConfig, mode: 'oneshot'});
const reportGeneratorLLM = new VertexAILLM({...llmConfig, mode: 'oneshot'});
const supportL1LLM = new VertexAILLM({...llmConfig, mode: 'oneshot'});
const supportL2LLM = new VertexAILLM({...llmConfig, mode: 'oneshot'});

// Criar agentes especialistas para os orquestradores
const marketAnalystAgent = new Agent({
    role: 'Analista de Mercado',
    objective: 'Analisar dados de mercado e identificar tendências',
    llm: marketAnalystLLM,
    task: 'Analisar dados de mercado'
});

const reportGeneratorAgent = new Agent({
    role: 'Gerador de Relatórios',
    objective: 'Criar relatórios detalhados a partir de análises',
    llm: reportGeneratorLLM,
    task: 'Gerar relatório baseado em análises'
});

const supportL1Agent = new Agent({
    role: 'Suporte Nível 1',
    objective: 'Resolver problemas técnicos básicos',
    llm: supportL1LLM,
    task: 'Resolver problemas de suporte básicos'
});

const supportL2Agent = new Agent({
    role: 'Suporte Nível 2',
    objective: 'Resolver problemas técnicos complexos',
    llm: supportL2LLM,
    task: 'Resolver problemas de suporte avançados'
});

// Configurar o registro de orquestradores
const orchestratorRegistry = new OrchestratorRegistry({
    'sequential_market_research': {
        type: 'SequentialAgentChain',
        agents: [marketAnalystAgent, reportGeneratorAgent]
    },
    'hierarchical_support': {
        type: 'HierarchicalAgentOrchestrator',
        agents: [supportL1Agent, supportL2Agent],
        llmConfig: llmConfig
    },
    'autogen_code_generator': {
        type: 'AutoGenOrchestrator',
        llmConfig: llmConfig
    }
});

// --- Criar Ferramentas de Orquestração ---

// Ferramenta de pesquisa de mercado
const marketResearchTool = createOrchestratorTool(
    'sequential_market_research',
    'perform_market_research',
    'Executa uma pesquisa de mercado completa sobre um tópico específico, incluindo análise de dados e geração de relatório.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            research_topic: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "O tópico principal da pesquisa de mercado." 
            },
            include_competitors: { 
                type: FunctionDeclarationSchemaType.BOOLEAN, 
                description: "Se deve incluir análise de concorrentes." 
            }
        },
        required: ["research_topic"]
    },
    orchestratorRegistry
);

// Ferramenta de suporte técnico
const supportTool = createOrchestratorTool(
    'hierarchical_support',
    'resolve_technical_issue',
    'Resolve problemas técnicos complexos através de um sistema hierárquico de agentes de suporte.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            issue_description: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "Descrição detalhada do problema técnico." 
            },
            user_id: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "ID do usuário afetado pelo problema." 
            },
            priority: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "Prioridade do problema (baixa, média, alta, crítica)." 
            }
        },
        required: ["issue_description"]
    },
    orchestratorRegistry
);

// Ferramenta de geração de código
const codeGeneratorTool = createOrchestratorTool(
    'autogen_code_generator',
    'generate_code',
    'Gera código-fonte baseado em uma especificação detalhada, utilizando um sistema multi-agente.',
    {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            specification: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "Especificação detalhada do código a ser gerado." 
            },
            language: { 
                type: FunctionDeclarationSchemaType.STRING, 
                description: "Linguagem de programação desejada (ex: Python, JavaScript, Java)." 
            },
            include_tests: { 
                type: FunctionDeclarationSchemaType.BOOLEAN, 
                description: "Se deve incluir testes unitários." 
            }
        },
        required: ["specification", "language"]
    },
    orchestratorRegistry
);

// Ferramenta simples de calculadora (não usa orquestrador)
const calculatorTool = {
    name: "calculator",
    description: "Realiza cálculos matemáticos simples",
    parameters: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            expression: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Expressão matemática a ser calculada (ex: 2 + 2, 5 * 3, etc.)"
            }
        },
        required: ["expression"]
    },
    function: async (args) => {
        try {
            // Avaliação segura da expressão (em um ambiente real, use uma biblioteca segura)
            // NOTA: eval() não é seguro para uso em produção, use apenas para demonstração
            const result = eval(args.expression);
            return { result };
        } catch (error) {
            return { error: `Erro ao calcular: ${error.message}` };
        }
    }
};

// --- Configurar o ChatAgent ---

// Criar o LLM para o ChatAgent
const chatLLM = new VertexAILLM({
    ...llmConfig,
    mode: 'chat', // Modo chat para o ChatAgent
    generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048
    }
});

// Caminho para o banco de dados SQLite (será criado se não existir)
const dbPath = path.join(__dirname, 'chat_orquestradores.db');

// Criar o sistema de memória para o ChatAgent
const conversationMemory = new memory.SQLiteConversationMemoryAdapter({
    dbConfig: { dbPath }
});

// Criar o ChatAgent com as ferramentas de orquestração
const chatAgent = new ChatAgent({
    llm: chatLLM,
    role: "Assistente Virtual Avançado",
    objective: "Ajudar o usuário com suas tarefas, utilizando orquestradores especializados quando necessário",
    context: `Você é um Assistente Virtual Avançado com acesso a sistemas de orquestração especializados.
Para tarefas simples, responda diretamente.
Para tarefas complexas, utilize uma das seguintes ferramentas de orquestração:

1. **perform_market_research**: Para realizar pesquisas de mercado detalhadas sobre um tópico específico.
   - Parâmetros: research_topic (obrigatório), include_competitors (opcional)
   - Exemplo: "Preciso de uma análise de mercado sobre carros elétricos"

2. **resolve_technical_issue**: Para resolver problemas técnicos complexos.
   - Parâmetros: issue_description (obrigatório), user_id (opcional), priority (opcional)
   - Exemplo: "Estou tendo problemas com o login no sistema"

3. **generate_code**: Para gerar código-fonte baseado em especificações.
   - Parâmetros: specification (obrigatório), language (obrigatório), include_tests (opcional)
   - Exemplo: "Preciso de um código para processar arquivos CSV em Python"

4. **calculator**: Para realizar cálculos matemáticos simples.
   - Parâmetros: expression (obrigatório)
   - Exemplo: "Quanto é 125 * 37?"

Analise cuidadosamente a solicitação do usuário para determinar se uma ferramenta de orquestração é necessária.
Mantenha um tom conversacional e amigável, e peça mais detalhes ao usuário quando necessário.`,
    tools: [
        marketResearchTool,
        supportTool,
        codeGeneratorTool,
        calculatorTool
    ],
    conversationMemory: conversationMemory,
    verbose: true // Habilita logs detalhados para depuração
});

// --- Interface de Linha de Comando ---

async function main() {
    try {
        console.log("\n=== ChatAgent com Orquestradores ===");
        console.log("Digite 'sair' para encerrar o programa.");
        console.log("\nExemplos de mensagens para testar os orquestradores:");
        console.log("- \"Faça uma pesquisa de mercado sobre carros elétricos\"");
        console.log("- \"Estou tendo um problema técnico com o login, meu ID é user123\"");
        console.log("- \"Gere um código em Python para ler um arquivo CSV\"");
        console.log("- \"Quanto é 125 * 37?\" (Usa a ferramenta calculator diretamente)");
        console.log("- \"Como está o tempo hoje?\" (Responde diretamente sem usar ferramentas)\n");
        
        // Interface de linha de comando
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        // Função para processar mensagens do usuário
        async function processUserInput() {
            rl.question('Você: ', async (input) => {
                if (input.toLowerCase() === 'sair') {
                    console.log("Encerrando o programa...");
                    await conversationMemory.close();
                    rl.close();
                    return;
                }
                
                try {
                    console.log("Processando...");
                    const response = await chatAgent.processUserMessage(input);
                    console.log(`\nAssistente: ${response.text}\n`);
                    
                    // Exibir informações sobre o uso de ferramentas (opcional)
                    if (response.toolCalls && response.toolCalls.length > 0) {
                        console.log("Ferramentas utilizadas:");
                        response.toolCalls.forEach(tool => {
                            console.log(`- ${tool.name} com parâmetros: ${JSON.stringify(tool.parameters)}`);
                        });
                        console.log("");
                    }
                } catch (error) {
                    console.error("Erro ao processar mensagem:", error);
                    console.log("\nAssistente: Desculpe, ocorreu um erro ao processar sua mensagem.\n");
                }
                
                // Continua o loop
                processUserInput();
            });
        }
        
        // Inicia o loop de processamento
        processUserInput();
        
    } catch (error) {
        console.error("Erro ao inicializar o ChatAgent:", error);
    }
}

// Executa o programa se for chamado diretamente
if (require.main === module) {
    main().catch(console.error);
}

// Exporta para possíveis testes
module.exports = { 
    chatAgent, 
    orchestratorRegistry,
    marketResearchTool,
    supportTool,
    codeGeneratorTool
};
