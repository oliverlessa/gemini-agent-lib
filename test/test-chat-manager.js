/**
 * Testes para o ChatManager
 * 
 * Este arquivo contém testes para verificar o funcionamento correto do ChatManager,
 * incluindo a criação e recuperação de sessões, isolamento de histórico entre sessões,
 * e limpeza de histórico.
 */

require('dotenv').config();
const assert = require('assert');
const { ChatManager, VertexAILLM, memory } = require('../index');
const path = require('path');
const fs = require('fs');

// Caminho para o banco de dados SQLite de teste (será criado se não existir)
const dbPath = path.join(__dirname, 'test_chat_manager.db');

// Limpar o banco de dados de teste se existir
if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
    console.log(`Banco de dados de teste removido: ${dbPath}`);
}

// IDs de sessão para teste
const SESSION_ID_1 = 'test-session-1';
const SESSION_ID_2 = 'test-session-2';

// Mensagens de teste
const TEST_MESSAGE_1 = 'Olá, meu nome é Carlos.';
const TEST_MESSAGE_2 = 'Qual é o meu nome?';
const TEST_MESSAGE_3 = 'Meu nome é Ana.';

describe('ChatManager', function() {
    // Aumentar o timeout para testes que envolvem chamadas de API
    this.timeout(30000);
    
    let chatManager;
    
    before(async function() {
        // Configuração do LLM
        const llmConfig = {
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            modelName: "gemini-2.0-flash-001",
            generationConfig: {
                maxOutputTokens: 1024,
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
        
        // Configuração base para todos os agentes
        const agentConfig = {
            role: "Assistente de Teste",
            objective: "Ajudar nos testes do ChatManager",
            context: "Você é um assistente usado para testar o ChatManager. Responda de forma concisa."
        };
        
        // Criar o ChatManager
        chatManager = new ChatManager({
            llmConfig,
            agentConfig,
            memoryConfig,
            shareMemoryInstances: true
        });
        
        console.log("ChatManager inicializado para testes.");
    });
    
    after(async function() {
        // Encerrar o ChatManager após os testes
        await chatManager.shutdown();
        console.log("ChatManager encerrado.");
        
        // Remover o banco de dados de teste
        if (fs.existsSync(dbPath)) {
            fs.unlinkSync(dbPath);
            console.log(`Banco de dados de teste removido: ${dbPath}`);
        }
    });
    
    describe('Gerenciamento de Sessões', function() {
        it('deve criar uma nova sessão com ID válido', async function() {
            const session = await chatManager.getOrCreateSession(SESSION_ID_1);
            assert.ok(session, 'Sessão não foi criada');
            assert.strictEqual(session.chatId, SESSION_ID_1, 'chatId da sessão não corresponde ao sessionId fornecido');
        });
        
        it('deve recuperar uma sessão existente', async function() {
            const session1 = await chatManager.getOrCreateSession(SESSION_ID_1);
            const session2 = await chatManager.getOrCreateSession(SESSION_ID_1);
            assert.strictEqual(session1, session2, 'Não recuperou a mesma instância da sessão');
        });
        
        it('deve criar sessões diferentes para IDs diferentes', async function() {
            const session1 = await chatManager.getOrCreateSession(SESSION_ID_1);
            const session2 = await chatManager.getOrCreateSession(SESSION_ID_2);
            assert.notStrictEqual(session1, session2, 'Criou a mesma instância para IDs diferentes');
            assert.strictEqual(session1.chatId, SESSION_ID_1, 'chatId da sessão 1 está incorreto');
            assert.strictEqual(session2.chatId, SESSION_ID_2, 'chatId da sessão 2 está incorreto');
        });
        
        it('deve lançar erro para sessionId inválido', async function() {
            try {
                await chatManager.getOrCreateSession('');
                assert.fail('Deveria ter lançado erro para sessionId vazio');
            } catch (error) {
                assert.ok(error instanceof Error, 'Não lançou um erro');
                assert.ok(error.message.includes('sessionId inválido'), 'Mensagem de erro incorreta');
            }
            
            try {
                await chatManager.getOrCreateSession(null);
                assert.fail('Deveria ter lançado erro para sessionId null');
            } catch (error) {
                assert.ok(error instanceof Error, 'Não lançou um erro');
                assert.ok(error.message.includes('sessionId inválido'), 'Mensagem de erro incorreta');
            }
        });
        
        it('deve encerrar uma sessão existente', async function() {
            // Criar uma sessão
            await chatManager.getOrCreateSession(SESSION_ID_1);
            
            // Verificar se a sessão existe
            assert.ok(chatManager.activeSessions.has(SESSION_ID_1), 'Sessão não foi criada corretamente');
            
            // Encerrar a sessão
            const result = chatManager.endSession(SESSION_ID_1);
            assert.strictEqual(result, true, 'endSession não retornou true para uma sessão existente');
            
            // Verificar se a sessão foi removida
            assert.ok(!chatManager.activeSessions.has(SESSION_ID_1), 'Sessão não foi removida');
        });
        
        it('deve retornar false ao tentar encerrar uma sessão inexistente', async function() {
            const result = chatManager.endSession('sessao-inexistente');
            assert.strictEqual(result, false, 'endSession não retornou false para uma sessão inexistente');
        });
    });
    
    describe('Processamento de Mensagens', function() {
        it('deve processar mensagens e retornar respostas', async function() {
            const response = await chatManager.processMessage(SESSION_ID_1, TEST_MESSAGE_1);
            assert.ok(response, 'Não retornou uma resposta');
            assert.ok(response.text, 'A resposta não contém texto');
            assert.ok(typeof response.text === 'string', 'O texto da resposta não é uma string');
        });
        
        it('deve manter o histórico de conversas separado entre sessões', async function() {
            // Enviar mensagem para a sessão 1
            await chatManager.processMessage(SESSION_ID_1, TEST_MESSAGE_1);
            
            // Enviar mensagem para a sessão 2
            await chatManager.processMessage(SESSION_ID_2, TEST_MESSAGE_3);
            
            // Perguntar o nome em ambas as sessões
            const response1 = await chatManager.processMessage(SESSION_ID_1, TEST_MESSAGE_2);
            const response2 = await chatManager.processMessage(SESSION_ID_2, TEST_MESSAGE_2);
            
            // Verificar se as respostas contêm os nomes corretos
            assert.ok(response1.text.toLowerCase().includes('carlos'), 
                'A resposta da sessão 1 não contém o nome correto');
            assert.ok(response2.text.toLowerCase().includes('ana'), 
                'A resposta da sessão 2 não contém o nome correto');
        });
    });
    
    describe('Gerenciamento de Histórico', function() {
        it('deve limpar o histórico de uma sessão ativa', async function() {
            // Criar uma sessão e enviar uma mensagem
            const session = await chatManager.getOrCreateSession(SESSION_ID_1);
            await chatManager.processMessage(SESSION_ID_1, TEST_MESSAGE_1);
            
            // Verificar se há histórico
            assert.ok(session.conversationHistory.length > 0, 'Não há histórico na sessão');
            
            // Limpar o histórico
            await chatManager.clearSessionHistory(SESSION_ID_1);
            
            // Verificar se o histórico foi limpo
            assert.strictEqual(session.conversationHistory.length, 0, 'O histórico não foi limpo');
        });
        
        it('deve limpar o histórico de uma sessão inativa se houver memória compartilhada', async function() {
            // Criar uma sessão, enviar uma mensagem e depois encerrar a sessão
            await chatManager.getOrCreateSession(SESSION_ID_1);
            await chatManager.processMessage(SESSION_ID_1, TEST_MESSAGE_1);
            chatManager.endSession(SESSION_ID_1);
            
            // Limpar o histórico da sessão inativa
            await chatManager.clearSessionHistory(SESSION_ID_1);
            
            // Recriar a sessão e verificar se o histórico está vazio
            const session = await chatManager.getOrCreateSession(SESSION_ID_1);
            assert.strictEqual(session.conversationHistory.length, 0, 'O histórico não foi limpo');
        });
        
        it('deve lançar erro ao tentar limpar o histórico de uma sessão inexistente sem memória compartilhada', async function() {
            // Criar um ChatManager sem memória compartilhada
            const chatManagerSemMemoria = new ChatManager({
                llmConfig: {
                    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
                    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS
                },
                shareMemoryInstances: false
            });
            
            try {
                await chatManagerSemMemoria.clearSessionHistory('sessao-inexistente');
                assert.fail('Deveria ter lançado erro para sessão inexistente');
            } catch (error) {
                assert.ok(error instanceof Error, 'Não lançou um erro');
                assert.ok(error.message.includes('não encontrada'), 'Mensagem de erro incorreta');
            } finally {
                await chatManagerSemMemoria.shutdown();
            }
        });
    });
});
