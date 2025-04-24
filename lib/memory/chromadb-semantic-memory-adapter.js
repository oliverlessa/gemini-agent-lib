const { ChromaClient, OpenAIEmbeddingFunction } = require('chromadb'); // Usaremos nossa própria embedding function
const SemanticMemory = require('./semantic-memory');
const VertexAIEmbeddingFunction = require('../embedding/vertex-ai-embedding'); // Importa nossa função de embedding

/**
 * Adaptador de Memória Semântica que utiliza o ChromaDB como backend.
 * @extends SemanticMemory
 */
class ChromaDBMemoryAdapter extends SemanticMemory {
  /**
   * Construtor do adaptador ChromaDB.
   * @param {Object} config - Configuração do adaptador.
   * @param {string} [config.path] - Caminho para o servidor ChromaDB (ex: "http://localhost:8000"). Se omitido, usa o modo in-memory.
   * @param {string} config.collectionName - Nome da coleção a ser usada no ChromaDB.
   * @param {Object} config.embeddingFunction - Instância da função de embedding a ser usada. Deve ter um método `generate(texts: string[])` ou `embedDocuments(texts: string[])`.
   * @param {Object} [config.collectionMetadata] - Metadados opcionais para a criação da coleção (ex: { 'hnsw:space': 'cosine' }).
   */
  constructor({ path, collectionName, embeddingFunction, collectionMetadata }) {
    super({ path, collectionName, embeddingFunction, collectionMetadata }); // Passa config para a classe base

    if (!collectionName) {
      throw new Error("O nome da coleção (collectionName) é obrigatório para ChromaDBMemoryAdapter.");
    }
    if (!embeddingFunction || (typeof embeddingFunction.generate !== 'function' && typeof embeddingFunction.embedDocuments !== 'function')) {
      throw new Error("A embeddingFunction fornecida é inválida. Deve ser um objeto com um método 'generate' ou 'embedDocuments'.");
    }

    this.client = new ChromaClient({ path });
    this.collectionName = collectionName;
    this.embeddingFunction = embeddingFunction; // Armazena a instância da nossa função
    this.collectionMetadata = collectionMetadata;
    this.collection = null; // Será inicializada em init()
  }

  /**
   * Inicializa a conexão com o ChromaDB e obtém ou cria a coleção.
   * @override
   */
  async init() {
    try {
      // O cliente ChromaDB JS não tem um método explícito de 'conexão'.
      // A inicialização principal é obter/criar a coleção.

      // O ChromaDB JS espera uma *instância* de IEmbeddingFunction com um método 'generate'.
      // Adaptamos a função fornecida se ela tiver 'embedDocuments' em vez de 'generate'.
      let chromaEmbeddingFunction;
      if (typeof this.embeddingFunction.generate === 'function') {
        // A função já tem o método 'generate' esperado pelo ChromaDB
        chromaEmbeddingFunction = this.embeddingFunction;
      } else if (typeof this.embeddingFunction.embedDocuments === 'function') {
        // Adapta a função que tem 'embedDocuments' (como nossa VertexAIEmbeddingFunction)
        chromaEmbeddingFunction = {
          generate: async (texts) => {
            // Chama o método 'embedDocuments' da instância fornecida
            return this.embeddingFunction.embedDocuments(texts);
          }
        };
      } else {
        // Isso não deveria acontecer devido à verificação no construtor, mas é uma segurança extra.
        throw new Error("A embeddingFunction não possui um método 'generate' ou 'embedDocuments' válido.");
      }

      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        embeddingFunction: chromaEmbeddingFunction, // Passa a função original ou adaptada
        metadata: this.collectionMetadata,
      });
      console.log(`Coleção ChromaDB "${this.collectionName}" pronta.`);
    } catch (error) {
      console.error(`Erro ao inicializar a coleção ChromaDB "${this.collectionName}":`, error);
      throw new Error(`Falha ao inicializar ChromaDB: ${error.message}`);
    }
  }

  /**
   * Adiciona documentos à coleção ChromaDB.
   * @param {import('./semantic-memory').DocumentInput[]} documents - Documentos a serem adicionados.
   * @returns {Promise<string[]>} IDs dos documentos adicionados.
   * @override
   */
  async add(documents) {
    if (!this.collection) {
      await this.init(); // Garante que a coleção está inicializada
    }
    if (!Array.isArray(documents) || documents.length === 0) {
      return [];
    }

    const ids = documents.map(doc => doc.id || this._generateUUID()); // Gera IDs se não fornecidos
    const contents = documents.map(doc => doc.content);
    const metadatas = documents.map(doc => doc.metadata || {}); // Garante que metadados sejam objetos

    try {
      // A função de embedding é gerenciada pela coleção, então só passamos os dados.
      await this.collection.add({
        ids: ids,
        documents: contents,
        metadatas: metadatas,
      });
      return ids;
    } catch (error) {
      console.error(`Erro ao adicionar documentos à coleção "${this.collectionName}":`, error);
      // Tenta fornecer mais detalhes se for um erro conhecido do ChromaDB
      if (error.response && error.response.data) {
          console.error("Detalhes do erro ChromaDB:", error.response.data);
      }
      throw new Error(`Falha ao adicionar documentos ao ChromaDB: ${error.message}`);
    }
  }

  /**
   * Busca por documentos similares na coleção ChromaDB.
   * @param {string} query - Texto da consulta.
   * @param {number} [k=5] - Número de resultados a retornar.
   * @param {Object} [filter] - Filtro de metadados (sintaxe 'where' do ChromaDB).
   * @returns {Promise<import('./semantic-memory').SearchResult[]>} Resultados da busca.
   * @override
   */
  async search(query, k = 5, filter = undefined) {
    if (!this.collection) {
      await this.init();
    }

    try {
      // A função de embedding da consulta é gerenciada pela coleção.
      const results = await this.collection.query({
        queryTexts: [query],
        nResults: k,
        where: filter, // Passa o filtro diretamente para o 'where' do ChromaDB
        include: ['metadatas', 'documents', 'distances'] // Inclui metadados, documentos e distâncias (scores)
      });

      // Formata a resposta do ChromaDB para o formato SearchResult
      if (!results || !results.ids || !results.ids[0]) {
        return []; // Sem resultados
      }

      const searchResults = [];
      for (let i = 0; i < results.ids[0].length; i++) {
        searchResults.push({
          id: results.ids[0][i],
          content: results.documents[0][i],
          metadata: results.metadatas[0][i],
          score: results.distances ? results.distances[0][i] : undefined, // Usa a distância como score
        });
      }
      return searchResults;

    } catch (error) {
      console.error(`Erro ao buscar na coleção "${this.collectionName}":`, error);
      if (error.response && error.response.data) {
          console.error("Detalhes do erro ChromaDB:", error.response.data);
      }
      throw new Error(`Falha ao buscar no ChromaDB: ${error.message}`);
    }
  }

  /**
   * Remove documentos da coleção ChromaDB pelos IDs.
   * @param {string[]} ids - IDs dos documentos a serem removidos.
   * @returns {Promise<void>}
   * @override
   */
  async delete(ids) {
    if (!this.collection) {
      await this.init();
    }
    if (!Array.isArray(ids) || ids.length === 0) {
      return;
    }

    try {
      await this.collection.delete({ ids: ids });
    } catch (error) {
      console.error(`Erro ao deletar documentos da coleção "${this.collectionName}":`, error);
      if (error.response && error.response.data) {
          console.error("Detalhes do erro ChromaDB:", error.response.data);
      }
      throw new Error(`Falha ao deletar documentos do ChromaDB: ${error.message}`);
    }
  }

  /**
   * Gera um UUID v4 simples.
   * @private
   */
  _generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * Fecha a conexão (atualmente não aplicável ao cliente JS do ChromaDB).
   * @override
   */
  async close() {
    // O cliente ChromaDB JS atual não parece ter um método close() explícito.
    // A conexão é gerenciada por chamadas HTTP.
    console.log("ChromaDBMemoryAdapter: Nenhuma ação de fechamento explícita necessária para o cliente JS.");
  }
}

module.exports = ChromaDBMemoryAdapter;
