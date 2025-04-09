/**
 * Exemplo de uso do ChatManager para gerenciar múltiplas sessões de ChatAgent
 * 
 * Este exemplo demonstra como configurar e usar o ChatManager para gerenciar
 * conversas separadas para diferentes usuários, mantendo seus históricos e
 * memórias isolados.
 */

require('dotenv').config();
const { ChatManager, VertexAILLM } = require('../index');
const path = require('path');
const readline = require('readline');

// Caminho para o banco de dados SQLite (será criado se não existir)
const dbPath = path.join(__dirname, 'chat_manager_example.db');

// Simulação de IDs de usuários
const userIds = ['usuario1', 'usuario2', 'usuario3'];
let currentUserIndex = 0;

async function main() {
    try {
        console.log("Iniciando exemplo de ChatManager com múltiplos usuários...");
        
        // Configuração do LLM
        const llmConfig = {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            modelName: "gemini-2.0-flash-001",
            generationConfig: {
                maxOutputTokens: 2048,
                temperature: 0.2
            }
        };
        
        // Configuração de memória (usando SQLite para todos os tipos)
        const memoryConfig = {
            conversation: {
                type: 'SQLiteConversationMemoryAdapter',
                dbConfig: { dbPath }
            },
            fact: {
                type: 'SQLiteFactMemoryAdapter',
                dbConfig: { dbPath }
            },
            summary: {
                type: 'SQLiteSummaryMemoryAdapter',
                dbConfig: { dbPath }
            }
        };
        
        // Configuração de delegação (opcional)
        const delegationConfig = {
            enabled: true,
            specialistAgentsConfig: {
                "Tradutor EN-PT": {
                    objective: "Traduzir textos do inglês para o português brasileiro com precisão e naturalidade.",
                    context: `Você é um tradutor especializado em traduzir textos do inglês para o português brasileiro.
Sua tarefa é fornecer traduções precisas e naturais, mantendo o tom e o estilo do texto original.
Adapte expressões idiomáticas e referências culturais quando necessário para que façam sentido em português.
Forneça apenas a tradução, sem explicações adicionais, a menos que seja solicitado.`,
                    llmMode: 'oneshot',
                    generationConfig: {
                        temperature: 0.1
                    }
                },
                "Assistente Técnico": {
                    objective: "Fornecer suporte técnico para problemas de programação e tecnologia.",
                    context: `Você é um assistente técnico especializado em resolver problemas de programação e tecnologia.
Sua tarefa é fornecer soluções claras e práticas para problemas técnicos.
Use exemplos de código quando apropriado e explique os conceitos de forma acessível.`,
                    llmMode: 'oneshot',
                    generationConfig: {
                        temperature: 0.2
                    }
                }
            }
        };
        
        // Configuração base para todos os agentes
        const agentConfig = {
            role: "Assistente Virtual",
            objective: "Ajudar o usuário com suas tarefas e responder perguntas",
            context: `Você é um assistente virtual amigável e prestativo.
Você deve manter um registro das preferências do usuário e usar essas informações para personalizar suas respostas.
Você também deve resumir periodicamente a conversa para manter o contexto.`
        };
        
        // Criar o ChatManager
        const chatManager = new ChatManager({
            llmConfig,
            agentConfig,
            memoryConfig,
            delegationConfig,
            shareMemoryInstances: true // Compartilhar instâncias de memória entre sessões
        });
        
        console.log("ChatManager inicializado com sucesso!");
        console.log(`Usuários disponíveis: ${userIds.join(', ')}`);
        console.log(`Usuário atual: ${userIds[currentUserIndex]}`);
        
        // Interface de linha de comando para interagir com o ChatManager
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout
        });
        
        console.log("\n=== ChatManager com Múltiplos Usuários ===");
        console.log("Digite 'trocar' para alternar entre usuários.");
        console.log("Digite 'limpar' para limpar o histórico do usuário atual.");
        console.log("Digite 'sair' para encerrar o programa.");
        
        // Função para processar mensagens do usuário
        async function processUserInput() {
            rl.question(`\n[${userIds[currentUserIndex]}] Você: `, async (input) => {
                if (input.toLowerCase() === 'sair') {
                    console.log("Encerrando o programa...");
                    await chatManager.shutdown();
                    rl.close();
                    return;
                }
                
                if (input.toLowerCase() === 'trocar') {
                    currentUserIndex = (currentUserIndex + 1) % userIds.length;
                    console.log(`\nUsuário alterado para: ${userIds[currentUserIndex]}`);
                    processUserInput();
                    return;
                }
                
                if (input.toLowerCase() === 'limpar') {
                    try {
                        await chatManager.clearSessionHistory(userIds[currentUserIndex]);
                        console.log(`\nHistórico do usuário ${userIds[currentUserIndex]} foi limpo.`);
                    } catch (error) {
                        console.error(`Erro ao limpar histórico: ${error.message}`);
                    }
                    processUserInput();
                    return;
                }
                
                try {
                    console.log("Processando...");
                    
                    // Obter o ID da sessão atual
                    const sessionId = userIds[currentUserIndex];
                    
                    // Processar a mensagem usando o ChatManager
                    const response = await chatManager.processMessage(sessionId, input);
                    
                    console.log(`\n[${sessionId}] Assistente: ${response.text}`);
                } catch (error) {
                    console.error("Erro ao processar mensagem:", error);
                    console.log("\nAssistente: Desculpe, ocorreu um erro ao processar sua mensagem.");
                }
                
                // Continua o loop
                processUserInput();
            });
        }
        
        // Inicia o loop de processamento
        processUserInput();
        
    } catch (error) {
        console.error("Erro durante a execução do exemplo:", error);
    }
}

// Executar o exemplo
main().catch(console.error);
