/**
 * Exemplo de uso do ChatAgent com delegação para agentes especialistas e memória automática
 * 
 * Este exemplo demonstra como configurar e utilizar o ChatAgent com a funcionalidade
 * de delegação para agentes especialistas e gerenciamento automático de memórias.
 */

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const path = require('path');
const readline = require('readline');
const ChatAgent = require('../lib/chat-agent');
const VertexAILLM = require('../lib/vertex-ai-llm');
const AgentRegistry = require('../lib/agent-registry');
const SQLiteConversationMemoryAdapter = require('../lib/memory/sqlite-conversation-memory-adapter');
const SQLiteFactMemoryAdapter = require('../lib/memory/sqlite-fact-memory-adapter');
const SQLiteSummaryMemoryAdapter = require('../lib/memory/sqlite-summary-memory-adapter');

// Exemplo de ferramenta que pode ser usada diretamente pelo ChatAgent
const calculatorTool = {
    name: "calculator",
    description: "Realiza cálculos matemáticos simples",
    parameters: {
        type: "OBJECT",
        properties: {
            expression: {
                type: "STRING",
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

// Configuração dos agentes especialistas
const specialistAgentsConfig = {
    "Tradutor EN-PT": {
        objective: "Traduzir textos do inglês para o português brasileiro com precisão e naturalidade.",
        context: `Você é um tradutor especializado em traduzir textos do inglês para o português brasileiro.
Sua tarefa é fornecer traduções precisas e naturais, mantendo o tom e o estilo do texto original.
Adapte expressões idiomáticas e referências culturais quando necessário para que façam sentido em português.
Forneça apenas a tradução, sem explicações adicionais, a menos que seja solicitado.`,
        llmMode: 'oneshot',
        llmModelName: "gemini-2.0-flash-001", // Modelo específico para este especialista
        generationConfig: {
            temperature: 0.1 // Temperatura baixa para traduções mais precisas
        }
    },
    "Pesquisador Financeiro": {
        objective: "Fornecer análises e informações sobre mercados financeiros, ações e investimentos.",
        context: `Você é um pesquisador financeiro especializado.
Sua tarefa é analisar informações financeiras e fornecer insights claros e objetivos.
Ao responder perguntas sobre investimentos, sempre mencione que são apenas análises e não recomendações formais.
Seja preciso com números e dados, e cite fontes quando possível.`,
        enableGoogleSearch: true,
        llmMode: 'oneshot',
        generationConfig: {
            temperature: 0.3
        }
    },
    "Redator Técnico": {
        objective: "Criar documentação técnica clara e concisa para produtos e serviços de tecnologia.",
        context: `Você é um redator técnico especializado em criar documentação para produtos e serviços de tecnologia.
Sua tarefa é transformar informações técnicas complexas em conteúdo claro, conciso e fácil de entender.
Use linguagem simples e direta, evitando jargões desnecessários.
Organize o conteúdo de forma lógica, com títulos e subtítulos quando apropriado.`,
        llmMode: 'oneshot',
        generationConfig: {
            temperature: 0.2
        }
    }
};

async function main() {
    try {
        console.log("Inicializando ChatAgent com delegação para especialistas e memória automática...");
        
        // Configurar adaptadores de memória com SQLite
        const dbPath = path.join(__dirname, 'memoria_delegacao.db');
        
        // Instanciar os adaptadores SQLite
        const conversationMemory = new SQLiteConversationMemoryAdapter({ dbConfig: { dbPath } });
        const factMemory = new SQLiteFactMemoryAdapter({ dbConfig: { dbPath } });
        const summaryMemory = new SQLiteSummaryMemoryAdapter({ dbConfig: { dbPath } });
        
        // Criar instância do ChatAgent com delegação e memória automática
        const chatAgent = new ChatAgent({
            role: "Assistente Virtual Inteligente com Memória",
            objective: "Ajudar o usuário com suas dúvidas e tarefas, delegando para especialistas quando necessário e lembrando de informações importantes",
            context: "Você é um assistente virtual inteligente que se lembra de detalhes sobre o usuário e pode delegar tarefas para especialistas quando necessário.",
            llm: new VertexAILLM({
                projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
                modelName: "gemini-2.0-flash-001", // Modelo principal para o ChatAgent
                mode: "chat",
                generationConfig: {
                    maxOutputTokens: 2048,
                    temperature: 0.7 // Temperatura mais alta para conversação geral
                }
            }),
            tools: [calculatorTool], // Ferramentas disponíveis diretamente para o ChatAgent
            enableGoogleSearch: false, // O ChatAgent principal não precisa de Google Search
            
            // Configuração de delegação para especialistas
            enableSpecialistDelegation: true,
            specialistAgentsConfig: specialistAgentsConfig,
            
            // Configuração de memória
            conversationMemory: conversationMemory,
            factMemory: factMemory,
            summaryMemory: summaryMemory,
            autoManageFactMemory: true,  // Habilita o gerenciamento automático de fatos
            autoManageSummaryMemory: true  // Habilita o gerenciamento automático de resumos
        });
        
        // Verificar os especialistas disponíveis
        const availableRoles = chatAgent.getAvailableSpecialistRoles();
        console.log(`Especialistas disponíveis: ${availableRoles.join(', ')}`);
        
        // Obter o ID da conversa
        console.log(`ID da conversa: ${chatAgent.chatId}\n`);
        
        // Interface de linha de comando para interagir com o ChatAgent
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log("\n=== ChatAgent com Delegação e Memória Automática ===");
        console.log("Digite 'sair' para encerrar o programa.");
        console.log("Digite 'fatos' para ver os fatos armazenados.");
        console.log("Digite 'resumo' para ver o resumo da conversa.");
        console.log("\nExemplos de mensagens para testar:");
        console.log("- \"Meu nome é Carlos e trabalho como desenvolvedor.\" (Armazena fatos)");
        console.log("- \"Traduza para português: The quick brown fox jumps over the lazy dog.\" (Delegação)");
        console.log("- \"Qual a situação atual do mercado de ações?\" (Delegação com pesquisa)");
        console.log("- \"Crie uma documentação técnica para uma API REST.\" (Delegação)");
        console.log("- \"Quanto é 25 * 48?\" (Usa a ferramenta calculator)");
        console.log("- \"Você se lembra do meu nome?\" (Testa a memória)\n");
        
        // Função para processar mensagens do usuário
        async function processUserInput() {
            rl.question('Você: ', async (input) => {
                if (input.toLowerCase() === 'sair') {
                    console.log("Encerrando o programa...");
                    
                    // Fechar conexões com o banco de dados
                    await conversationMemory.close();
                    await factMemory.close();
                    await summaryMemory.close();
                    
                    rl.close();
                    return;
                }
                
                if (input.toLowerCase() === 'fatos') {
                    // Exibir todos os fatos armazenados
                    const facts = await chatAgent.getAllFacts();
                    console.log("\n=== Fatos armazenados ===");
                    console.log(JSON.stringify(facts, null, 2));
                    console.log();
                    processUserInput(); // Continua o loop
                    return;
                }
                
                if (input.toLowerCase() === 'resumo') {
                    // Exibir o resumo da conversa
                    const summary = await chatAgent.getLatestSummary();
                    console.log("\n=== Resumo da conversa ===");
                    console.log(summary || 'Nenhum resumo gerado ainda.');
                    console.log();
                    processUserInput(); // Continua o loop
                    return;
                }
                
                try {
                    console.log("Processando...");
                    const response = await chatAgent.processUserMessage(input);
                    console.log(`\nAssistente: ${response.text}\n`);
                    
                    // Se a resposta foi delegada, mostrar informações sobre a delegação
                    if (response.delegatedTo) {
                        console.log(`[Delegado para: ${response.delegatedTo}]\n`);
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

// Executa o programa
main().catch(console.error);
