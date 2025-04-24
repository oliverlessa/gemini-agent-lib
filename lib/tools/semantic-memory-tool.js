const SemanticMemory = require('../memory/semantic-memory');
const FunctionDeclarationSchemaType = require('../function-declaration-schema-type');
const debug = require('../debug');

/**
 * Ferramenta que permite aos agentes interagir com uma instância de SemanticMemory
 * para realizar buscas semânticas explicitamente.
 */
class SemanticMemoryTool {
  name = 'semantic_memory_search'; // Nome da função para o LLM
  description = "Busca na memória semântica por informações relevantes para uma consulta específica. Use esta ferramenta para encontrar documentos, trechos de texto ou dados previamente armazenados que possam responder à pergunta do usuário ou fornecer contexto adicional.";
  parameters = {
    type: FunctionDeclarationSchemaType.OBJECT,
    properties: {
      query: {
        type: FunctionDeclarationSchemaType.STRING,
        description: "O texto da consulta ou pergunta a ser usado na busca semântica."
      },
      k: {
        type: FunctionDeclarationSchemaType.NUMBER,
        description: "O número máximo de resultados semanticamente similares a retornar. O padrão é 3 se não especificado."
      },
      filter: {
        type: FunctionDeclarationSchemaType.OBJECT,
        description: "Um filtro opcional baseado em metadados para refinar a busca. A estrutura exata do filtro depende do banco de dados vetorial subjacente (ex: ChromaDB). Consulte a documentação do adaptador de memória para detalhes sobre a sintaxe do filtro."
      }
    },
    required: ["query"]
  };
  function; // Propriedade para a função executora (padrão antigo)

  #semanticMemory; // Instância privada da SemanticMemory
  #isMemoryInitialized = false; // Flag para controlar inicialização

  /**
   * Cria uma instância da SemanticMemoryTool.
   * @param {Object} config - Configuração da ferramenta.
   * @param {SemanticMemory} config.semanticMemory - Uma instância de uma classe que estende SemanticMemory (ex: ChromaDBMemoryAdapter).
   */
  constructor({ semanticMemory }) {
    if (!semanticMemory || !(semanticMemory instanceof SemanticMemory)) {
      throw new Error("A configuração 'semanticMemory' é obrigatória e deve ser uma instância de SemanticMemory.");
    }
    this.#semanticMemory = semanticMemory;
    this.#isMemoryInitialized = false; // Garante que começa como não inicializada
    // Atribui o método execute (vinculado à instância) à propriedade 'function'
    this.function = this.execute.bind(this);
    debug.tools(`SemanticMemoryTool criada com adaptador: ${semanticMemory.constructor.name}`);
  }

  /**
   * Retorna a declaração da função (tool declaration) para o LLM.
   * @returns {Object} A declaração da ferramenta no formato esperado pelo LLM (ex: Google Function Calling).
   * @deprecated A classe Agent agora lê as propriedades name, description e parameters diretamente.
   */
  getToolDeclaration() {
    // Este método pode ser mantido para compatibilidade ou removido se não for mais usado.
    // A classe Agent.prepareToolsForLLM agora lê as propriedades diretamente.
    return {
      name: this.name,
      description: this.description,
      parameters: this.parameters
    };
  }

  /**
   * Executa a busca na memória semântica.
   * Este método é chamado pelo agente quando o LLM decide usar esta ferramenta.
   * @param {Object} args - Argumentos fornecidos pelo LLM.
   * @param {string} args.query - A consulta para a busca.
   * @param {number} [args.k=3] - O número de resultados a retornar.
   * @param {Object} [args.filter] - O filtro de metadados.
   * @returns {Promise<string>} Uma string formatada contendo os resultados da busca, ou uma mensagem indicando que nada foi encontrado ou que ocorreu um erro.
   */
  async execute({ query, k = 3, filter = undefined }) {
    debug.tools(`Executando ${this.name} com query: "${query}", k: ${k}, filter: %o`, filter);
    if (!query) {
      debug.tools(`${this.name}: Erro - Parâmetro 'query' ausente.`);
      return "Erro: O parâmetro 'query' é obrigatório para a busca na memória semântica.";
    }

    try {
      // Tratamento de Inicialização (Lazy Initialization):
      // Verifica se o método init existe e se a memória ainda não foi inicializada
      if (typeof this.#semanticMemory.init === 'function' && !this.#isMemoryInitialized) {
        debug.tools(`Inicializando adaptador ${this.#semanticMemory.constructor.name} antes da busca...`);
        await this.#semanticMemory.init();
        this.#isMemoryInitialized = true; // Marca como inicializado após sucesso
        debug.tools(`Adaptador ${this.#semanticMemory.constructor.name} inicializado.`);
      }

      // Execução da Busca:
      const searchResults = await this.#semanticMemory.search(query, k, filter);

      // Formatação dos Resultados:
      if (!searchResults || searchResults.length === 0) {
        debug.tools(`${this.name}: Nenhum resultado encontrado para a consulta.`);
        return "Nenhuma informação relevante encontrada na memória semântica para esta consulta.";
      }

      debug.tools(`${this.name}: ${searchResults.length} resultados encontrados.`);
      const formattedResults = searchResults.map((result, index) => {
        // Verifica se metadata existe e não está vazio antes de stringify
        const metadataString = result.metadata && Object.keys(result.metadata).length > 0 ? JSON.stringify(result.metadata) : null;
        const metadataInfo = metadataString ? ` (Metadados: ${metadataString})` : '';
        const scoreInfo = result.score !== undefined ? ` [Score: ${result.score.toFixed(4)}]` : '';
        return `Resultado ${index + 1}:${scoreInfo}\nConteúdo: ${result.content}${metadataInfo}`;
      }).join('\n\n---\n\n');

      return `Resultados da busca na memória semântica para "${query}":\n\n${formattedResults}`;

    } catch (error) {
      console.error(`[SemanticMemoryTool] Erro ao executar busca:`, error);
      debug.tools(`${this.name}: Erro durante a execução: ${error.message}`);
      // Retorna uma mensagem de erro mais genérica para o LLM, mas loga o detalhe
      return `Erro ao realizar a busca na memória semântica. Por favor, verifique os logs para detalhes.`;
    }
  }
}

module.exports = SemanticMemoryTool;
