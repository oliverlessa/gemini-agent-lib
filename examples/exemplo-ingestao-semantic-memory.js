/**
 * Exemplo de ingestão de dados na SemanticMemory usando ChromaDB.
 *
 * Este exemplo demonstra como ingerir dados (do arquivo README.md) em uma
 * SemanticMemory usando o ChromaDBMemoryAdapter e o VertexAIEmbeddingFunction.
 * Ele se conecta a um servidor ChromaDB que deve estar rodando localmente.
 *
 * Pré-requisitos:
 * 1. Servidor ChromaDB rodando localmente (padrão: http://localhost:8000).
 *    Para iniciar um facilmente com Docker:
 *    docker run -p 8000:8000 chromadb/chroma
 * 2. Variáveis de ambiente GOOGLE_CLOUD_PROJECT_ID e GOOGLE_APPLICATION_CREDENTIALS configuradas (ou definidas em um arquivo .env).
 */

require('dotenv').config(); // Carrega variáveis do arquivo .env
const path = require('path');
// Importar componentes do index.js atualizado
const { memory, embedding, loaders } = require('../index');

// --- Configuração ---
// Substitua pelos seus dados reais do Google Cloud e Vertex AI
const GOOGLE_CLOUD_PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT_ID || 'seu-projeto-id'; // Use variável de ambiente ou substitua
const VERTEX_LOCATION = process.env.VERTEX_LOCATION || 'us-east5'; // Use variável de ambiente ou substitua
// const VERTEX_LOCATION = 'us-east5'; // Use variável de ambiente ou substitua
const VERTEX_EMBEDDING_MODEL_ID = 'text-embedding-005'; // Modelo de embedding

const CHROMA_COLLECTION_NAME = 'documentos_rag_exemplo';
const FILE_TO_INGEST = path.join(__dirname, '../README.md'); // Arquivo a ser ingerido
const LOADER_CHUNK_SIZE = 500; // Tamanho menor para o exemplo
const LOADER_CHUNK_OVERLAP = 50;

// --- Função Principal Assíncrona ---
async function main() {
  console.log("Iniciando processo de ingestão para Semantic Memory...");

  // 1. Validar Configuração Básica
  if (GOOGLE_CLOUD_PROJECT_ID === 'seu-projeto-id') {
    console.warn("AVISO: Usando placeholder para GOOGLE_CLOUD_PROJECT_ID. Defina a variável de ambiente ou edite o script.");
    // Poderia lançar um erro aqui se preferir exigir a configuração
    // throw new Error("GOOGLE_CLOUD_PROJECT_ID não configurado.");
  }

  try {
    // 2. Instanciar Componentes
    console.log("Instanciando componentes...");
    const embeddingFunction = new embedding.VertexAIEmbeddingFunction({ // Usar embedding.VertexAIEmbeddingFunction
      projectId: GOOGLE_CLOUD_PROJECT_ID,
      location: VERTEX_LOCATION,
      modelId: VERTEX_EMBEDDING_MODEL_ID,
      // clientOptions: {} // Adicione opções de cliente gRPC se necessário
    });

    // Conectando ao servidor ChromaDB local padrão
    const memoryAdapter = new memory.ChromaDBMemoryAdapter({ // Usar memory.ChromaDBMemoryAdapter
      path: 'http://localhost:8000', // Especifica o caminho para o servidor ChromaDB
      collectionName: CHROMA_COLLECTION_NAME,
      embeddingFunction: embeddingFunction,
      // collectionMetadata: { 'hnsw:space': 'cosine' } // Metadados opcionais da coleção
    });

    const loader = new loaders.TextLoader({ // Usar loaders.TextLoader
      chunkSize: LOADER_CHUNK_SIZE,
      chunkOverlap: LOADER_CHUNK_OVERLAP,
    });

    // 3. Inicializar Adaptador de Memória
    console.log(`Inicializando adaptador ChromaDB para coleção "${CHROMA_COLLECTION_NAME}"...`);
    await memoryAdapter.init(); // Garante que a coleção está pronta

    // 4. Carregar e Dividir o Documento
    console.log(`Carregando e dividindo o arquivo: ${FILE_TO_INGEST}...`);
    const loadedChunks = await loader.load(FILE_TO_INGEST);
    console.log(`Arquivo dividido em ${loadedChunks.length} chunks.`);

    if (loadedChunks.length === 0) {
      console.log("Nenhum chunk gerado. Encerrando.");
      return;
    }

    // 5. Preparar Documentos para Ingestão
    // O ChromaDBMemoryAdapter espera o formato DocumentInput da SemanticMemory
    const documentsToIngest = loadedChunks.map(chunk => ({
      content: chunk.content,
      metadata: chunk.metadata,
      // ID será gerado pelo adaptador se não fornecido
    }));

    // 6. Adicionar Documentos à Memória Semântica
    console.log(`Adicionando ${documentsToIngest.length} chunks à coleção ChromaDB...`);
    const addedIds = await memoryAdapter.add(documentsToIngest);
    console.log(`Documentos adicionados com sucesso. IDs: ${addedIds.join(', ')}`);

    // 7. (Opcional) Verificar com uma busca simples
    if (documentsToIngest.length > 0) {
        console.log("\nRealizando uma busca de exemplo...");
        const query = "O que é gemini-agent-lib?"; // Consulta de exemplo
        const searchResults = await memoryAdapter.search(query, 3); // Buscar os 3 mais relevantes
        console.log(`Resultados da busca para "${query}":`);
        if (searchResults.length > 0) {
            searchResults.forEach((result, index) => {
                console.log(`--- Resultado ${index + 1} (Score: ${result.score?.toFixed(4)}) ---`);
                console.log(`ID: ${result.id}`);
                console.log(`Metadados: ${JSON.stringify(result.metadata)}`);
                console.log(`Conteúdo (trecho): ${result.content.substring(0, 150)}...`);
                console.log("---");
            });
        } else {
            console.log("Nenhum resultado encontrado para a consulta de exemplo.");
        }
    }


    console.log("\nProcesso de ingestão concluído com sucesso!");

  } catch (error) {
    console.error("\nOcorreu um erro durante a ingestão:", error);
    process.exit(1); // Sai com código de erro
  }
}

// --- Executar a Função Principal ---
main();
