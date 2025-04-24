const fs = require('fs').promises;

/**
 * @typedef {Object} LoadedDocument
 * @property {string} content - O conteúdo textual do chunk do documento.
 * @property {Object} metadata - Metadados associados ao chunk (ex: nome do arquivo, índice do chunk).
 */

/**
 * Classe para carregar documentos de texto e dividi-los em chunks.
 */
class TextLoader {
  /**
   * Construtor do TextLoader.
   * @param {Object} config - Configuração do loader.
   * @param {number} [config.chunkSize=1000] - Tamanho aproximado desejado para cada chunk (em caracteres).
   * @param {number} [config.chunkOverlap=200] - Número de caracteres de sobreposição entre chunks.
   */
  constructor({ chunkSize = 1000, chunkOverlap = 200 } = {}) {
    if (chunkOverlap >= chunkSize) {
      throw new Error("chunkOverlap deve ser menor que chunkSize.");
    }
    this.chunkSize = chunkSize;
    this.chunkOverlap = chunkOverlap;
  }

  /**
   * Carrega um arquivo de texto e o divide em chunks.
   * @param {string} filePath - O caminho para o arquivo de texto.
   * @returns {Promise<LoadedDocument[]>} Uma promessa que resolve com um array de documentos carregados (chunks).
   */
  async load(filePath) {
    try {
      const text = await fs.readFile(filePath, 'utf-8');
      return this.splitText(text, filePath);
    } catch (error) {
      console.error(`Erro ao carregar o arquivo de texto "${filePath}":`, error);
      throw new Error(`Falha ao carregar o arquivo: ${error.message}`);
    }
  }

  /**
   * Divide um texto longo em chunks menores com sobreposição.
   * Esta é uma implementação simples baseada em caracteres. Estratégias mais
   * sofisticadas (por frases, parágrafos, tokens) podem ser implementadas aqui
   * ou usando bibliotecas como langchain/text_splitter.
   * @param {string} text - O texto completo a ser dividido.
   * @param {string} sourceIdentifier - Identificador da fonte (ex: nome do arquivo) para os metadados.
   * @returns {LoadedDocument[]} Um array de documentos (chunks).
   * @private
   */
  splitText(text, sourceIdentifier) {
    const documents = [];
    let startIndex = 0;
    let chunkIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + this.chunkSize, text.length);
      const chunkContent = text.substring(startIndex, endIndex);

      documents.push({
        content: chunkContent,
        metadata: {
          source: sourceIdentifier,
          chunkIndex: chunkIndex,
          // Poderíamos adicionar mais metadados aqui, como número da linha inicial/final se relevante
        },
      });

      chunkIndex++;
      startIndex += this.chunkSize - this.chunkOverlap;

      // Garante que não entremos em loop infinito se overlap for igual ou maior que size
      if (this.chunkSize - this.chunkOverlap <= 0) {
          startIndex = endIndex; // Avança para o final do chunk atual
      }
      // Evita que startIndex ultrapasse o comprimento do texto desnecessariamente
      if (startIndex >= text.length) break;
    }

    return documents;
  }
}

module.exports = TextLoader;
