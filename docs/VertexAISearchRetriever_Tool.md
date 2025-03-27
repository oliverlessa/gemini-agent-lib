# Implementar uma tool chamada VertexAISearchRetriever

A tool VertexAISearchRetriever deve funcionar de modo semelhante à tool https://python.langchain.com/docs/integrations/retrievers/google_vertex_ai_search/ do LangChain.

Entretando, a implmentação será feita em Node.js. Um exemplo de teste de uso do recurso do Google Vertex AI Search pode ser visto no código a seguir:

```js
/**
 * TODO(developer): Uncomment these variables before running the sample.
 */
const projectId = '789802124107';
const location = 'global';              // Options: 'global', 'us', 'eu'
const collectionId = 'default_collection';     // Options: 'default_collection'
const dataStoreId = 'site-fainor_1714866492522'       // Create in Cloud Console
// const dataStoreId = 'trabalhos-academicos_1720098783208'       // Create in Cloud Console
const servingConfigId = 'default_config';      // Options: 'default_config'
// const searchQuery = 'Relevância do meio ambiante';

process.env['GOOGLE_APPLICATION_CREDENTIALS'] = '../gcp-fainor-vertex-all-07acd8705b36.json';

const {SearchServiceClient} = require('@google-cloud/discoveryengine').v1beta;

// For more information, refer to:
// https://cloud.google.com/generative-ai-app-builder/docs/locations#specify_a_multi-region_for_your_data_store
const apiEndpoint =
  location === 'global'
    ? 'discoveryengine.googleapis.com'
    : `${location}-discoveryengine.googleapis.com`;

// Instantiates a client
const client = new SearchServiceClient({apiEndpoint: apiEndpoint});

async function search() {
    // The full resource name of the search engine serving configuration.
    // Example: projects/{projectId}/locations/{location}/collections/{collectionId}/dataStores/{dataStoreId}/servingConfigs/{servingConfigId}
    // You must create a search engine in the Cloud Console first.
    const name = client.projectLocationCollectionDataStoreServingConfigPath(
      projectId,
      location,
      collectionId,
      dataStoreId,
      servingConfigId
    );

    const searchQuery = 'Instrução: Responda em portugês do Brasil. Pergunta do usuário: Vestibular';
  
    const request = {
      pageSize: 10,
      query: searchQuery,
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
  
    const IResponseParams = {
      ISearchResult: 0,
      ISearchRequest: 1,
      ISearchResponse: 2,
    };
  
    // Perform search request
    const response = await client.search(request, {
      // Warning: Should always disable autoPaginate to avoid iterate through all pages.
      //
      // By default NodeJS SDK returns an iterable where you can iterate through all
      // search results instead of only the limited number of results requested on
      // pageSize, by sending multiple sequential search requests page-by-page while
      // iterating, until it exhausts all the search results. This will be unexpected and
      // may cause high Search API usage and long wait time, especially when the matched
      // document numbers are huge.
      autoPaginate: false,

      
    });

    // console.log(response);
    // console.log(response[0]);
    // console.log(response.contentSearchSpec);

    // const results = response[IResponseParams.ISearchResponse].results;
    // const results = response[IResponseParams.ISearchResult];
    // const results = response[IResponseParams.ISearchResponse].results;
    // const results = response[IResponseParams.extractive_segments].response;
  
    for (const result of results) {
      // console.log(result.document.derivedStructData.fields.extractive_segments.listValue.values[0].structValue.fields);
      // console.log(result.document.derivedStructData.fields.snippets.listValue.values[0].structValue.fields.snippet);
      console.log(result.document.derivedStructData.fields.extractive_segments.listValue);
    }
    for (const result of results) {
      // console.log(result.document.derivedStructData.fields.extractive_segments.listValue.values[0].structValue.fields);
    }

  }

search();

// projects/789802124107/locations/global/collections/default_collection/dataStores/site-fainor_1714866492522
```

A documentação da Discovery Engine API client for Node.js pode ser encontrata em:
- https://www.npmjs.com/package/@google-cloud/discoveryengine
- https://cloud.google.com/nodejs/docs/reference/discoveryengine/latest