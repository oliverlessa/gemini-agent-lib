/**
 * @typedef {Object} DocumentInput
 * @property {string} content - O conteúdo textual do documento.
 * @property {Object} [metadata] - Metadados associados ao documento.
 * @property {string} [id] - Um ID opcional para o documento. Se não fornecido, pode ser gerado pelo adaptador.
 */

/**
 * @typedef {Object} SearchResult
 * @property {string} id - O ID do documento encontrado.
 * @property {string} content - O conteúdo do documento encontrado.
 * @property {Object} metadata - Os metadados do documento encontrado.
 * @property {number} [score] - A pontuação de similaridade ou relevância (dependente do adaptador).
 */

/**
 * Classe base abstrata para Memória Semântica (Banco de Dados Vetorial).
 * Define a interface que os adaptadores concretos (como ChromaDB, Pinecone, etc.) devem implementar.
 * @abstract
 */
class SemanticMemory {
  /**
   * Construtor da classe base. Pode ser usado para configurações comuns.
   * @param {Object} [config] - Configurações opcionais.
   */
  constructor(config = {}) {
    if (this.constructor === SemanticMemory) {
      throw new Error("A classe abstrata 'SemanticMemory' não pode ser instanciada diretamente.");
    }
    this.config = config;
  }

  /**
   * Adiciona um ou mais documentos à memória semântica.
   * O adaptador é responsável por gerar os embeddings se necessário.
   * @param {DocumentInput[]} documents - Um array de objetos de documento para adicionar.
   * @returns {Promise<string[]>} Uma promessa que resolve com os IDs dos documentos adicionados.
   * @abstract
   */
  async add(documents) {
    throw new Error("O método 'add' deve ser implementado pelo adaptador concreto.");
  }

  /**
   * Busca por documentos semanticamente similares a uma consulta.
   * @param {string} query - O texto da consulta para buscar similaridade.
   * @param {number} [k=5] - O número máximo de resultados a retornar.
   * @param {Object} [filter] - Um filtro opcional baseado em metadados para refinar a busca (a sintaxe do filtro depende do adaptador).
   * @returns {Promise<SearchResult[]>} Uma promessa que resolve com um array de resultados da busca.
   * @abstract
   */
  async search(query, k = 5, filter = undefined) {
    throw new Error("O método 'search' deve ser implementado pelo adaptador concreto.");
  }

  /**
   * Remove documentos da memória semântica pelos seus IDs.
   * @param {string[]} ids - Um array de IDs dos documentos a serem removidos.
   * @returns {Promise<void>} Uma promessa que resolve quando a remoção for concluída.
   * @abstract
   */
  async delete(ids) {
    throw new Error("O método 'delete' deve ser implementado pelo adaptador concreto.");
  }

  /**
   * (Opcional) Método para inicializar a conexão com o banco de dados vetorial, se necessário.
   * @returns {Promise<void>}
   */
  async init() {
    // Implementação opcional pelo adaptador
  }

  /**
   * (Opcional) Método para fechar a conexão com o banco de dados vetorial, se necessário.
   * @returns {Promise<void>}
   */
  async close() {
    // Implementação opcional pelo adaptador
  }
}

module.exports = SemanticMemory;
