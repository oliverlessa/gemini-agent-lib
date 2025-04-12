/**
 * Exemplo de uso do ChatAgent com delegação para agentes especialistas
 * utilizando GenerativeAILLM (API do Google AI Studio / Gemini).
 *
 * Este exemplo demonstra como configurar e utilizar o ChatAgent com a funcionalidade
 * de delegação para agentes especialistas, usando a API Gemini.
 *
 * Certifique-se de ter a variável de ambiente GEMINI_API_KEY definida no seu arquivo .env
 */

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const ChatAgent = require('../lib/chat-agent');
const GenerativeAILLM = require('../lib/generative-ai-llm'); // Importa o GenerativeAILLM
const AgentRegistry = require('../lib/agent-registry');
const readline = require('readline');

// Verifica se a API Key do Gemini foi carregada
if (!process.env.GEMINI_API_KEY) {
    console.error("Erro: A variável de ambiente GEMINI_API_KEY não está definida.");
    console.error("Por favor, adicione sua API Key do Google AI Studio ao arquivo .env");
    process.exit(1); // Encerra se a chave não estiver presente
}


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
// Nota: O ChatAgent usará o tipo de LLM principal (GenerativeAILLM)
// e aplicará as configurações específicas (modelName, generationConfig) para cada especialista.
const specialistAgentsConfig = {
    "Tradutor EN-PT": {
        objective: "Traduzir textos do inglês para o português brasileiro com precisão e naturalidade.",
        context: `Você é um tradutor especializado em traduzir textos do inglês para o português brasileiro.
Sua tarefa é fornecer traduções precisas e naturais, mantendo o tom e o estilo do texto original.
Adapte expressões idiomáticas e referências culturais quando necessário para que façam sentido em português.
Forneça apenas a tradução, sem explicações adicionais, a menos que seja solicitado.`,
        llmMode: 'oneshot',
        llmModelName: "gemini-2.0-flash-001", // Modelo específico para este especialista (pode ser diferente do principal)
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
        enableGoogleSearch: true, // Habilita busca para este especialista
        llmMode: 'oneshot',
        llmModelName: "gemini-2.0-flash-001", // Pode usar um modelo mais potente para pesquisa
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
        console.log("Inicializando ChatAgent com GenerativeAILLM e delegação para especialistas...");

        // Cria a instância do GenerativeAILLM
        const geminiLLM = new GenerativeAILLM({
            apiKey: process.env.GEMINI_API_KEY, // Usa a chave da API do .env
            modelName: "gemini-2.0-flash-001", // Modelo principal para o ChatAgent
            mode: "chat", // Modo chat para conversação contínua
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.7 // Temperatura mais alta para conversação geral
            }
            // safetySettings podem ser omitidos para usar os padrões da classe GenerativeAILLM
        });

        // Cria o ChatAgent com delegação habilitada e configuração de especialistas
        const chatAgent = new ChatAgent({
            role: "Assistente Virtual Inteligente (Gemini)",
            objective: "Ajudar o usuário com suas dúvidas e tarefas, delegando para especialistas quando necessário, usando a API Gemini.",
            llm: geminiLLM, // Passa a instância do GenerativeAILLM
            tools: [calculatorTool], // Ferramentas disponíveis diretamente para o ChatAgent
            enableGoogleSearch: false, // O ChatAgent principal não precisa de Google Search (a menos que desejado)
            enableSpecialistDelegation: true, // Habilita a delegação para especialistas
            specialistAgentsConfig: specialistAgentsConfig // Configuração dos especialistas
        });

        // Verificar os especialistas disponíveis
        const availableRoles = chatAgent.getAvailableSpecialistRoles();
        console.log(`Especialistas disponíveis: ${availableRoles.join(', ')}`);

        // Exemplo de como adicionar um novo especialista dinamicamente
        chatAgent.registerSpecialist("Analista de Dados", {
            objective: "Analisar dados e gerar insights estatísticos.",
            context: "Você é um analista de dados especializado em estatística e visualização de dados. Forneça análises claras e objetivas.",
            llmMode: 'oneshot'
            // O ChatAgent usará o LLM principal (Gemini) com as configs padrão se não especificado aqui
        });

        console.log(`Especialistas após adição: ${chatAgent.getAvailableSpecialistRoles().join(', ')}`);

        // Interface de linha de comando para interagir com o ChatAgent
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });

        console.log("\n=== ChatAgent (Gemini) com Delegação para Especialistas ===");
        console.log("Digite 'sair' para encerrar o programa.");
        console.log("Certifique-se de ter GEMINI_API_KEY no seu arquivo .env");
        console.log("Exemplos de mensagens para testar a delegação:");
        console.log("- \"Traduza para português: The quick brown fox jumps over the lazy dog.\"");
        console.log("- \"Qual a situação atual do mercado de ações?\"");
        console.log("- \"Crie uma documentação técnica para uma API REST.\"");
        console.log("- \"Quanto é 25 * 48?\" (Usa a ferramenta calculator diretamente)");
        console.log("- \"Me conte sobre o clima hoje.\" (Responde diretamente sem delegação)\n");

        // Função para processar mensagens do usuário
        async function processUserInput() {
            rl.question('Você: ', async (input) => {
                if (input.toLowerCase() === 'sair') {
                    console.log("Encerrando o programa...");
                    rl.close();
                    return;
                }

                try {
                    console.log("Processando com Gemini...");
                    const response = await chatAgent.processUserMessage(input);
                    console.log(`\nAssistente (Gemini): ${response.text}\n`);
                } catch (error) {
                    console.error("Erro ao processar mensagem:", error);
                    console.log("\nAssistente (Gemini): Desculpe, ocorreu um erro ao processar sua mensagem.\n");
                }

                // Continua o loop
                processUserInput();
            });
        }

        // Inicia o loop de processamento
        processUserInput();

    } catch (error) {
        console.error("Erro ao inicializar o ChatAgent com GenerativeAILLM:", error);
    }
}

// Executa o programa
main().catch(console.error);
