/**
 * Exemplo de uso da SemanticMemoryTool com um Agente
 *
 * Este exemplo demonstra como configurar um Agente (pode ser Agent ou ChatAgent)
 * para usar a SemanticMemoryTool explicitamente. O agente será instruído a
 * chamar a ferramenta 'semantic_memory_search' quando precisar consultar
 * a base de conhecimento.
 *
 * Pré-requisitos:
 * 1. Servidor ChromaDB rodando localmente (padrão: http://localhost:8000).
 *    docker run -p 8000:8000 chromadb/chroma
 * 2. Ter executado 'examples/exemplo-ingestao-semantic-memory.js' para popular
 *    a coleção 'documentos_rag_exemplo'.
 * 3. Variáveis de ambiente GOOGLE_CLOUD_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS.
 */

require('dotenv').config();
const { Agent, VertexAILLM, memory, embedding, tools } = require('../index'); // Importar Agent, LLM, memory, embedding e tools

// --- Configuração ---
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID;
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-central1';
const VERTEX_EMBEDDING_MODEL_ID = 'text-embedding-005';
const CHROMA_COLLECTION_NAME = 'documentos_rag_exemplo'; // Mesma coleção da ingestão

async function main() {
    console.log("Iniciando exemplo de Agente com SemanticMemoryTool...");

    if (!GOOGLE_CLOUD_PROJECT_ID) {
        console.error("Erro: Variável de ambiente GOOGLE_CLOUD_PROJECT_ID não definida.");
        process.exit(1);
    }

    try {
        // 1. Instanciar Componentes de Memória Semântica e Ferramenta
        console.log("Instanciando componentes de memória e ferramenta...");
        const embeddingFunction = new embedding.VertexAIEmbeddingFunction({
            projectId: GOOGLE_CLOUD_PROJECT_ID,
            location: VERTEX_LOCATION,
            modelId: VERTEX_EMBEDDING_MODEL_ID,
        });

        const semanticMemoryAdapter = new memory.ChromaDBMemoryAdapter({
            path: 'http://localhost:8000',
            collectionName: CHROMA_COLLECTION_NAME,
            embeddingFunction: embeddingFunction,
        });

        // NÃO chamamos init() aqui; a ferramenta fará isso (lazy initialization)

        // Instanciar a ferramenta, passando o adaptador
        const semanticMemoryTool = new tools.SemanticMemoryTool({
            semanticMemory: semanticMemoryAdapter
        });
        console.log("SemanticMemoryTool instanciada.");

        // 2. Instanciar LLM
        console.log("Instanciando LLM (Vertex AI)...");
        const llm = new VertexAILLM({
            projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
             modelName: "gemini-2.0-flash-001",
             generationConfig: {
                 maxOutputTokens: 1024,
                 temperature: 0.3,
             },
             // O modo pode ser 'generateContent' ou 'chat', dependendo do Agente base
             // Para o Agent base, 'generateContent' é mais comum
        });

        // 3. Instanciar Agente com a Ferramenta
        console.log("Instanciando Agente...");
        const agent = new Agent({ // Usando o Agent base para simplicidade
            role: "Assistente de Consulta",
            objective: "Responder perguntas usando a ferramenta de busca na memória semântica.",
            context: `Você é um assistente que responde perguntas consultando uma base de conhecimento.
Quando o usuário fizer uma pergunta que possa ser respondida pela base de conhecimento (documentação da biblioteca gemini-agent-lib), você DEVE usar a ferramenta 'semantic_memory_search'.
Formule a 'query' para a ferramenta com base na pergunta do usuário.
Após receber os resultados da ferramenta, use-os para formular sua resposta final ao usuário.
Se a ferramenta não retornar resultados relevantes, informe ao usuário.`,
            llm,
            tools: [semanticMemoryTool], // Passa a INSTÂNCIA da ferramenta
            enableGoogleSearch: false // Desabilitar outras ferramentas automáticas se não forem necessárias
        });

        console.log("Agente criado.");

        // 4. Simular uma consulta que deve acionar a ferramenta
        console.log("\n--- Iniciando consulta com ferramenta explícita ---");

        const pergunta = "Qual a função da classe ChatAgent na biblioteca?";
        console.log(`\nUsuário: ${pergunta}`);

        // Define a tarefa para o agente
        agent.task = pergunta;

        // Executa a tarefa. O LLM deve decidir chamar a semantic_memory_search
        const resposta = await agent.executeTask();

        console.log(`\nAssistente: ${resposta.text || resposta}`); // A resposta pode ser string ou objeto

        // 5. (Opcional) Fechar conexões
        // Se o adaptador ChromaDB precisasse de close, seria chamado aqui ou no final do processo.
        // await semanticMemoryAdapter.close();

        console.log("\nExemplo com SemanticMemoryTool concluído.");

    } catch (error) {
        console.error("\nOcorreu um erro durante a execução do exemplo:", error);
        process.exit(1);
    }
}

// Executar o exemplo
main();
