require('dotenv').config(); // Carrega variáveis de ambiente do .env

const { ChromaDBMemoryAdapter } = require('../lib/memory');
const VertexAIEmbeddingFunction = require('../lib/embedding/vertex-ai-embedding');
// Importa GoogleGenerativeAiEmbeddingFunction do pacote 'chromadb'
const { GoogleGenerativeAiEmbeddingFunction } = require('chromadb');

// --- Exemplo com VertexAIEmbeddingFunction ---

async function exemploComVertexAI() {
  console.log("--- Iniciando Exemplo com Vertex AI Embedding ---");

  // 1. Configurar a função de embedding Vertex AI
  const vertexAIEmbedder = new VertexAIEmbeddingFunction({
    projectId: process.env.VERTEX_PROJECT_ID,
    location: process.env.VERTEX_LOCATION,
    modelId: process.env.VERTEX_EMBEDDING_MODEL_ID || 'text-embedding-005', // Modelo padrão
  });

  // 2. Configurar e inicializar o ChromaDBMemoryAdapter com Vertex AI
  const chromaVertex = new ChromaDBMemoryAdapter({
    collectionName: "colecao_vertex_ai_exemplo",
    embeddingFunction: vertexAIEmbedder,
    // path: "http://localhost:8000" // Descomente se estiver usando um servidor ChromaDB externo
  });

  try {
    await chromaVertex.init(); // Inicializa a coleção
    console.log("ChromaDB com Vertex AI inicializado.");

    // 3. Adicionar documentos
    const documentosVertex = [
      { id: "vtx1", content: "O Vertex AI oferece modelos de embedding de texto.", metadata: { source: "vertex" } },
      { id: "vtx2", content: "A API do Vertex AI é usada para gerar os embeddings.", metadata: { source: "vertex" } },
    ];
    const idsVertex = await chromaVertex.add(documentosVertex);
    console.log("Documentos adicionados com Vertex AI:", idsVertex);

    // 4. Buscar documentos
    const resultadosVertex = await chromaVertex.search("O que são embeddings?", 1);
    console.log("Resultados da busca com Vertex AI:", resultadosVertex);

  } catch (error) {
    console.error("Erro no exemplo com Vertex AI:", error);
  } finally {
    await chromaVertex.close(); // Embora não faça muito no cliente JS atual, é boa prática
  }
  console.log("--- Fim do Exemplo com Vertex AI Embedding ---\n");
}

// --- Exemplo com GoogleGenerativeAiEmbeddingFunction ---

async function exemploComGoogleGemini() {
  console.log("--- Iniciando Exemplo com Google Gemini Embedding ---");

  // 1. Configurar a função de embedding Google Gemini
  // Certifique-se de ter a variável de ambiente GEMINI_API_KEY definida no seu .env
  if (!process.env.GEMINI_API_KEY) {
    console.warn("AVISO: GEMINI_API_KEY não definida. O exemplo com Google Gemini pode falhar.");
    // Você pode querer lançar um erro ou pular este exemplo se a chave não estiver presente
    // throw new Error("GEMINI_API_KEY não encontrada no ambiente.");
  }

  const googleEmbedder = new GoogleGenerativeAiEmbeddingFunction({
    googleApiKey: process.env.GEMINI_API_KEY || "CHAVE_API_PLACEHOLDER", // Use a chave do .env ou um placeholder
    // model: "embedding-001" // Opcional: especifique o modelo, se necessário
    // taskType: "RETRIEVAL_DOCUMENT" // Opcional: ajuste conforme necessário
  });

  // 2. Configurar e inicializar o ChromaDBMemoryAdapter com Google Gemini
  const chromaGoogle = new ChromaDBMemoryAdapter({
    collectionName: "colecao_google_gemini_exemplo",
    embeddingFunction: googleEmbedder,
    // path: "http://localhost:8000" // Descomente se estiver usando um servidor ChromaDB externo
  });

  try {
    await chromaGoogle.init(); // Inicializa a coleção
    console.log("ChromaDB com Google Gemini inicializado.");

    // 3. Adicionar documentos
    const documentosGoogle = [
      { id: "ggl1", content: "Google Gemini também fornece embeddings.", metadata: { source: "google" } },
      { id: "ggl2", content: "A biblioteca @google/generative-ai é usada aqui.", metadata: { source: "google" } },
    ];
    const idsGoogle = await chromaGoogle.add(documentosGoogle);
    console.log("Documentos adicionados com Google Gemini:", idsGoogle);

    // 4. Buscar documentos
    const resultadosGoogle = await chromaGoogle.search("Como gerar embeddings do Google?", 1);
    console.log("Resultados da busca com Google Gemini:", resultadosGoogle);

  } catch (error) {
    console.error("Erro no exemplo com Google Gemini:", error);
    if (error.message.includes('API key not valid')) {
        console.error("Verifique se sua GEMINI_API_KEY está correta e configurada no ambiente (.env).");
    }
  } finally {
    await chromaGoogle.close();
  }
  console.log("--- Fim do Exemplo com Google Gemini Embedding ---");
}

// Executar os exemplos
async function main() {
  await exemploComVertexAI();
  await exemploComGoogleGemini();
}

main().catch(console.error);
