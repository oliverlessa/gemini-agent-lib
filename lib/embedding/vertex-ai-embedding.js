const { PredictionServiceClient } = require('@google-cloud/aiplatform').v1;
const { helpers } = require('@google-cloud/aiplatform'); // Helper para converter valores JS para protos

/**
 * Classe para gerar embeddings usando a API Vertex AI.
 */
class VertexAIEmbeddingFunction {
  /**
   * Construtor da classe.
   * @param {Object} config - Configuração para a API Vertex AI.
   * @param {string} config.projectId - O ID do seu projeto Google Cloud.
   * @param {string} config.location - A localização da API (ex: 'us-central1').
   * @param {string} config.modelId - O ID do modelo de embedding a ser usado (ex: 'textembedding-gecko@003').
   * @param {string} [config.apiEndpoint] - (Opcional) O endpoint da API, se diferente do padrão.
   * @param {Object} [config.clientOptions] - (Opcional) Opções adicionais para o cliente gRPC.
   */
  constructor({ projectId, location, modelId, apiEndpoint, clientOptions }) {
    if (!projectId || !location || !modelId) {
      throw new Error("projectId, location, e modelId são obrigatórios na configuração do VertexAIEmbeddingFunction.");
    }
    this.projectId = projectId;
    this.location = location;
    this.modelId = modelId;
    this.apiEndpoint = apiEndpoint || `${location}-aiplatform.googleapis.com`;

    this.client = new PredictionServiceClient({
      apiEndpoint: this.apiEndpoint,
      ...clientOptions,
    });
    this.endpoint = `projects/${this.projectId}/locations/${this.location}/publishers/google/models/${this.modelId}`;
  }

  /**
   * Gera embeddings para um array de textos (documentos).
   * @param {string[]} texts - Um array de strings para gerar embeddings.
   * @returns {Promise<number[][]>} Uma promessa que resolve com um array de embeddings (arrays de números).
   */
  async embedDocuments(texts) {
    if (!Array.isArray(texts) || texts.length === 0) {
      return [];
    }

    // A API pode ter limites no número de instâncias por chamada,
    // pode ser necessário dividir em lotes (batches) se 'texts' for muito grande.
    // Para simplificação inicial, vamos assumir que cabe em uma chamada.
    const instances = texts.map(text => helpers.toValue({ content: text }));
    const parameters = helpers.toValue({
      // Parâmetros específicos do modelo, se houver (ex: task_type)
      // autoTruncate: false // Exemplo
    });

    const request = {
      endpoint: this.endpoint,
      instances: instances,
      parameters: parameters,
    };

    try {
      const [response] = await this.client.predict(request);
      if (!response.predictions || response.predictions.length !== texts.length) {
        throw new Error('Resposta inválida da API de embeddings do Vertex AI.');
      }

      // Extrai os embeddings da resposta
      const embeddings = response.predictions.map(predictionProto => {
        const prediction = helpers.fromValue(predictionProto);
        if (!prediction.embeddings || !prediction.embeddings.values) {
          console.error("Predição sem embeddings:", prediction);
          throw new Error('Formato inesperado na resposta de embeddings.');
        }
        return prediction.embeddings.values;
      });

      return embeddings;
    } catch (error) {
      console.error("Erro ao gerar embeddings de documentos no Vertex AI:", error);
      throw new Error(`Falha ao gerar embeddings de documentos: ${error.message}`);
    }
  }

  /**
   * Gera embedding para um único texto (consulta).
   * @param {string} text - O texto da consulta.
   * @returns {Promise<number[]>} Uma promessa que resolve com o embedding (array de números).
   */
  async embedQuery(text) {
    if (!text) {
      throw new Error("Texto da consulta não pode ser vazio.");
    }
    // Reutiliza embedDocuments para uma única consulta
    const embeddings = await this.embedDocuments([text]);
    if (embeddings.length !== 1) {
      throw new Error("Falha ao gerar embedding para a consulta.");
    }
    return embeddings[0];
  }
}

module.exports = VertexAIEmbeddingFunction;
