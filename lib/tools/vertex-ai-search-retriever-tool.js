// tools/vertex-ai-search-retriever-tool.js

const ToolBuilder = require('../tool-builder');
const FunctionDeclarationSchemaType = require('../function-declaration-schema-type');
const {SearchServiceClient} = require('@google-cloud/discoveryengine').v1beta;
const debug = require('../debug').tools;

/**
 * Implementação da função de busca usando Vertex AI Search
 * @param {Object} args - Argumentos da função
 * @returns {Object} - Resultados da busca
 */
async function vertexSearchRetrieverImplementation(args) {
    debug(`Chamada para vertex_ai_search com args: %o`, args);
    
    // Validação e valores padrão
    const query = args.query;
    const projectId = args.projectId || process.env.VERTEX_PROJECT_ID;
    const location = args.location || 'global';
    const collectionId = args.collectionId || 'default_collection';
    const dataStoreId = args.dataStoreId;
    const servingConfigId = args.servingConfigId || 'default_config';
    const maxResults = args.maxResults || 10;
    
    // Verificar credenciais
    if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS não definido no ambiente');
    }
    
    // Configurar endpoint da API
    const apiEndpoint = location === 'global'
        ? 'discoveryengine.googleapis.com'
        : `${location}-discoveryengine.googleapis.com`;
    
    // Instanciar cliente
    const client = new SearchServiceClient({apiEndpoint: apiEndpoint});
    
    // Construir nome do recurso
    const name = client.projectLocationCollectionDataStoreServingConfigPath(
        projectId,
        location,
        collectionId,
        dataStoreId,
        servingConfigId
    );
    
    // Construir requisição
    const request = {
        pageSize: maxResults,
        query: query,
        servingConfig: name,
        queryExpansionSpec: {
            condition: 'AUTO'
        },
        spellCorrectionSpec: {
            mode: 'AUTO'
        },
        contentSearchSpec: {
            summarySpec: {
                ignoreAdversarialQuery: true,
                includeCitations: true,
                summaryResultCount: 3,
                snippetSpec: {
                    returnSnippet: true,
                    snippetResultCount: 3
                }
            },
            extractiveContentSpec: {
                maxExtractiveAnswerCount: 3,
                maxExtractiveSegmentCount: 3
            },
            snippetSpec: {
                returnSnippet: true
            }
        }
    };
    
    try {
        debug("Configuração da requisição: %o", {
            apiEndpoint,
            servingConfig: name,
            query: query,
            pageSize: maxResults
        });
        
        // Executar busca
        debug("Executando busca no Vertex AI Search...");
        const response = await client.search(request, {
            autoPaginate: false
        });
        
        debug("Resposta recebida do Vertex AI Search");
        
        // Processar resultados
        const results = response[0].results || [];
        debug(`Número de resultados encontrados: ${results.length}`);
        
        // Formatar resultados
        const formattedResults = results.map(result => {
            const document = result.document;
            
            // Extrair segmentos extrativos (se disponíveis)
            let extractiveSegments = [];
            if (document.derivedStructData?.fields?.extractive_segments?.listValue?.values) {
                extractiveSegments = document.derivedStructData.fields.extractive_segments.listValue.values.map(segment => {
                    const fields = segment.structValue?.fields || {};
                    return {
                        content: fields.content?.stringValue || '',
                        pageContent: fields.pageContent?.stringValue || '',
                        score: fields.score?.numberValue || 0
                    };
                });
            }
            
            // Extrair snippets (se disponíveis)
            let snippets = [];
            if (document.derivedStructData?.fields?.snippets?.listValue?.values) {
                snippets = document.derivedStructData.fields.snippets.listValue.values.map(snippet => {
                    const fields = snippet.structValue?.fields || {};
                    return {
                        snippet: fields.snippet?.stringValue || '',
                        source: fields.source?.stringValue || ''
                    };
                });
            }
            
            // Extrair título e URL (se disponíveis)
            const title = document.derivedStructData?.fields?.title?.stringValue || '';
            const url = document.derivedStructData?.fields?.link?.stringValue || '';
            
            return {
                id: document.id,
                title: title,
                url: url,
                extractiveSegments: extractiveSegments,
                snippets: snippets
            };
        });
        
        return {
            query: query,
            totalResults: results.length,
            results: formattedResults
        };
    } catch (error) {
        console.error('Erro ao executar busca no Vertex AI Search:', error);
        throw new Error(`Erro na busca: ${error.message}`);
    }
};

// Descrição padrão da ferramenta
const DEFAULT_DESCRIPTION = "Busca informações em documentos e bases de conhecimento privadas indexadas pelo Google Vertex AI Search. Use esta ferramenta para responder perguntas que requerem acesso a dados internos da organização e informações específicas não disponíveis publicamente.";

// Nome padrão da ferramenta
const DEFAULT_NAME = "search_private_knowledge_base";

/**
 * Factory function para criar instâncias da tool Vertex AI Search Retriever
 * com configurações personalizadas.
 * 
 * @param {Object} config - Configurações personalizadas para a tool
 * @param {string} config.projectId - ID do projeto Google Cloud (opcional, padrão: process.env.VERTEX_PROJECT_ID)
 * @param {string} config.dataStoreId - ID do data store (opcional, padrão: process.env.VERTEX_DATA_STORE_ID)
 * @param {string} config.location - Localização do serviço (opcional, padrão: 'global')
 * @param {string} config.collectionId - ID da coleção (opcional, padrão: 'default_collection')
 * @param {string} config.servingConfigId - ID da configuração de serviço (opcional, padrão: 'default_config')
 * @param {number} config.maxResults - Número máximo de resultados (opcional, padrão: 10)
 * @param {string} config.description - Descrição personalizada da ferramenta (opcional, padrão: DEFAULT_DESCRIPTION)
 * @param {string} config.name - Nome personalizado da ferramenta (opcional, padrão: DEFAULT_NAME)
 * @returns {Object} - Instância configurada da tool Vertex AI Search Retriever
 * 
 * @example
 * // Uso básico (com valores padrão)
 * const defaultTool = vertexSearchRetrieverTool();
 * 
 * // Uso com configurações personalizadas
 * const customTool = vertexSearchRetrieverTool({
 *   projectId: 'meu-projeto-personalizado',
 *   location: 'us',
 *   maxResults: 5
 * });
 * 
 * // Uso com descrição personalizada
 * const customDescriptionTool = vertexSearchRetrieverTool({
 *   description: 'Busca informações específicas sobre produtos da empresa no Vertex AI Search'
 * });
 */
function vertexSearchRetrieverTool(config = {}) {
    // Extrair configurações ou usar valores padrão
    const toolName = config.name || DEFAULT_NAME;
    const toolDescription = config.description || DEFAULT_DESCRIPTION;
    
    // Configurações padrão para a implementação da ferramenta
    const toolConfig = {
        projectId: config.projectId || process.env.VERTEX_PROJECT_ID,
        location: config.location || 'global',
        collectionId: config.collectionId || 'default_collection',
        dataStoreId: config.dataStoreId,
        servingConfigId: config.servingConfigId || 'default_config',
        maxResults: config.maxResults || 10
    };
    
    // Função wrapper para a implementação que mescla a configuração da instância com os argumentos da chamada
    const wrappedImplementation = async (args) => {
        console.log(`Chamada para a ferramenta ${toolName} com args:`, args);
        // Mesclar configurações da instância com argumentos da chamada
        // Prioridade: argumentos da chamada > configurações da instância
        const mergedArgs = { ...toolConfig, ...args };
        return vertexSearchRetrieverImplementation(mergedArgs);
    };
    
    // Criar a instância da ferramenta com nome e descrição personalizados
    const toolInstance = ToolBuilder.createTool(toolName, toolDescription)
        .addParameter("query", "string", "Consulta de busca", { required: true })
        .setFunction(wrappedImplementation)
        .build();
    
    return toolInstance;
}

module.exports = vertexSearchRetrieverTool;
