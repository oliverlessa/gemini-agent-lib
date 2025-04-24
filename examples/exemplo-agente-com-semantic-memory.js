/**
 * Exemplo de uso do ChatAgent com SemanticMemory (RAG)
 *
 * Este exemplo demonstra como configurar um ChatAgent para usar
 * uma SemanticMemory (implementada com ChromaDB e Vertex AI Embeddings)
 * para responder perguntas com base em documentos previamente ingeridos (Retrieval-Augmented Generation - RAG).
 *
 * Pré-requisitos:
 * 1. Servidor ChromaDB rodando localmente (padrão: http://localhost:8000).
 *    Para iniciar um facilmente com Docker:
 *    docker run -p 8000:8000 chromadb/chroma
 * 2. Ter executado o script 'examples/exemplo-ingestao-semantic-memory.js' *enquanto o servidor ChromaDB estava rodando*
 *    para popular a coleção 'documentos_rag_exemplo'.
 * 3. Variáveis de ambiente GOOGLE_CLOUD_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS configuradas.
 * 3. Variáveis de ambiente GOOGLE_CLOUD_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS configuradas.
 */

require('dotenv').config();
const { ChatAgent, VertexAILLM, memory, embedding } = require('../index'); // Importar 'embedding' do index.js atualizado

// --- Configuração ---
// Certifique-se que estas configurações são as mesmas usadas na ingestão
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const VERTEX_EMBEDDING_MODEL_ID = 'text-embedding-005';
const CHROMA_COLLECTION_NAME = 'documentos_rag_exemplo'; // Mesma coleção da ingestão

async function main() {
    console.log("Iniciando exemplo de ChatAgent com Semantic Memory (RAG)...");

    if (!GOOGLE_CLOUD_PROJECT_ID) {
        console.error("Erro: Variável de ambiente GOOGLE_CLOUD_PROJECT_ID não definida.");
        process.exit(1);
    }
    // Não precisamos validar GOOGLE_APPLICATION_CREDENTIALS aqui, pois VertexAILLM fará isso.

    try {
        // 1. Instanciar Componentes de Memória Semântica
        console.log("Instanciando componentes de memória semântica...");
        const embeddingFunction = new embedding.VertexAIEmbeddingFunction({ // Usar embedding.VertexAIEmbeddingFunction
            projectId: GOOGLE_CLOUD_PROJECT_ID,
            location: VERTEX_LOCATION,
            modelId: VERTEX_EMBEDDING_MODEL_ID,
        });

        // Conectando ao servidor ChromaDB local padrão onde os dados foram ingeridos
        const semanticMemoryAdapter = new memory.ChromaDBMemoryAdapter({
            path: 'http://localhost:8000', // Especifica o caminho para o servidor ChromaDB
            collectionName: CHROMA_COLLECTION_NAME,
            embeddingFunction: embeddingFunction,
        });

        // Inicializar o adaptador para garantir a conexão com a coleção
        console.log(`Inicializando adaptador ChromaDB para coleção "${CHROMA_COLLECTION_NAME}"...`);
        await semanticMemoryAdapter.init();
        console.log("Adaptador ChromaDB inicializado.");

        // 2. Instanciar LLM
        console.log("Instanciando LLM (Vertex AI)...");
        const llm = new VertexAILLM({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            // projectId já é pego automaticamente das credenciais ou ambiente
            // credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS, // Opcional se ADC estiver configurado
            modelName: "gemini-2.0-flash-001", // Usar um modelo capaz como o Gemini Flash ou Pro
            mode: "chat",
            generationConfig: {
                maxOutputTokens: 1024,
                temperature: 0.3,
            },
            // Habilitar busca semântica interna do ChatAgent (se disponível)
            // ou instruir via prompt/contexto
        });

        // 3. Instanciar ChatAgent com Semantic Memory
        console.log("Instanciando ChatAgent...");
        const chatAgent = new ChatAgent({
            role: "Assistente de Documentação",
            objective: "Responder perguntas sobre a biblioteca gemini-agent-lib usando a documentação fornecida.",
            context: `Você é um assistente especializado na biblioteca 'gemini-agent-lib'.
Sua principal função é responder perguntas consultando uma base de conhecimento (memória semântica) que contém a documentação da biblioteca (README.md).
Ao receber uma pergunta, siga estes passos:
1. Use a memória semântica para buscar trechos relevantes da documentação relacionados à pergunta do usuário.
2. Baseie sua resposta PRINCIPALMENTE nas informações encontradas na memória semântica.
3. Se a memória não contiver informações relevantes, informe ao usuário que a documentação não cobre aquele tópico específico.
4. Seja claro, conciso e direto ao ponto.`,
            llm,
            // Passando o adaptador de memória semântica para o agente
            // O ChatAgent precisa ser adaptado internamente para usar isso,
            // ou podemos precisar de um agente RAG específico.
            // Por enquanto, vamos assumir que o prompt/contexto o guiará.
            // Uma implementação mais robusta envolveria o agente chamando
            // semanticMemory.search() explicitamente.
            semanticMemory: semanticMemoryAdapter, // Passando a instância do adaptador
            // Outras memórias podem ser adicionadas se necessário
            // conversationMemory: new memory.SQLiteConversationMemoryAdapter({ dbConfig: { dbPath: 'rag_chat.db' } }),
        });

        console.log(`ChatAgent criado com ID de conversa: ${chatAgent.chatId}`);

        // 4. Simular uma conversa
        console.log("\n--- Iniciando consulta RAG ---");

        const pergunta = "O que é a biblioteca gemini-agent-lib e qual seu objetivo?";
        console.log(`\nUsuário: ${pergunta}`);

        // O ChatAgent (idealmente) usará a semanticMemory internamente
        // baseado no contexto ou em lógica específica de RAG.
        const resposta = await chatAgent.processUserMessage(pergunta);

        console.log(`\nAssistente: ${resposta.text}`);

        // Outra pergunta
        const pergunta2 = "Como configuro a memória semântica com ChromaDB?";
        console.log(`\nUsuário: ${pergunta2}`);
        const resposta2 = await chatAgent.processUserMessage(pergunta2);
        console.log(`\nAssistente: ${resposta2.text}`);


        // 5. (Opcional) Fechar conexões se necessário
        // await semanticMemoryAdapter.close(); // ChromaDB in-memory não requer close explícito geralmente

        console.log("\nExemplo RAG concluído.");

    } catch (error) {
        console.error("\nOcorreu um erro durante a execução do exemplo RAG:", error);
        process.exit(1);
    }
}

// Executar o exemplo
main();
