// test-vertex-ai-search-retriever.js
require('dotenv').config();

// A variável GOOGLE_APPLICATION_CREDENTIALS deve estar configurada no ambiente
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');
const vertexSearchRetrieverTool = require('../lib/tools/vertex-ai-search-retriever-tool');

/**
 * Este teste demonstra o uso da ferramenta VertexAISearchRetriever
 * para realizar buscas usando o Google Vertex AI Search.
 * Também demonstra como criar instâncias personalizadas da ferramenta
 * usando a factory function.
 */
async function testVertexAISearchRetriever() {
    try {
        console.log("=== Teste da Ferramenta VertexAISearchRetriever ===");
        
        // Verificar variáveis de ambiente necessárias
        if (!process.env.VERTEX_PROJECT_ID) {
            console.error("Erro: VERTEX_PROJECT_ID não definido no arquivo .env");
            return;
        }
        
        if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
            console.error("Erro: GOOGLE_APPLICATION_CREDENTIALS não definido no arquivo .env");
            return;
        }
        
        console.log("VERTEX_PROJECT_ID:", process.env.VERTEX_PROJECT_ID);
        console.log("GOOGLE_APPLICATION_CREDENTIALS:", process.env.GOOGLE_APPLICATION_CREDENTIALS);
        
        // Criar instância do VertexAILLM
        const vertexLLM = new VertexAILLM({
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001",
            mode: "oneshot",
            generationConfig: {
                maxOutputTokens: 8192,
                temperature: 0.2
            }
        });
        
        // Criar instâncias da ferramenta VertexAISearchRetriever com diferentes configurações
        console.log("\nCriando instâncias da ferramenta com diferentes configurações:");
        
        // 1. Instância padrão (sem configurações personalizadas)
        const defaultTool = vertexSearchRetrieverTool();
        console.log("1. Instância padrão criada");
        
        // 2. Instância personalizada com configurações específicas
        const customTool = vertexSearchRetrieverTool({
            projectId: process.env.VERTEX_PROJECT_ID,
            location: "global",
            dataStoreId: "site-fainor_1714866492522", // Pré-configurado para este data store
            maxResults: 5
        });
        console.log("2. Instância personalizada criada com dataStoreId pré-configurado");
        
        // 3. Instância com descrição personalizada
        const customDescriptionTool = vertexSearchRetrieverTool({
            projectId: process.env.VERTEX_PROJECT_ID,
            location: "global",
            dataStoreId: "site-fainor_1714866492522",
            maxResults: 5,
            name: "search_private_knowledge_base",
            description: "Ferramenta especializada para buscar informações sobre a Fainor no search_private_knowledge_base"
        });
        console.log("3. Instância criada com descrição personalizada");
        
        const fainorSearchTool = vertexSearchRetrieverTool({
            projectId: process.env.VERTEX_PROJECT_ID,
            location: "global",
            dataStoreId: "site-fainor_1714866492522",
            maxResults: 5
        });
        

        // Criar o agente com a ferramenta VertexAISearchRetriever personalizada
        const agente = new Agent({
            role: "Assistente de Pesquisa",
             objective: "Fornecer informações precisas usando o Vertex AI Search",
             context: `Você é um assistente de IA que SÓ PODE responder usando informações obtidas pela ferramenta search_private_knowledge_base.
                      É OBRIGATÓRIO usar a ferramenta search_private_knowledge_base para QUALQUER pergunta. NÃO use conhecimento prévio.
                      Se a busca não retornar resultados, informe APENAS que a busca não retornou resultados.
                      Retorne os snippets e títulos das páginas de resultados da busca.
                     Liste todas as fontes de informação encontradas. Liste em quais documentos as informações foram encontradas.
                     Forneça respostas completas e precisas baseadas nas informações encontradas.
                     Não acresente nenhuma informação que não esteja nos resultados da busca da search_private_knowledge_base.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            tools: [customDescriptionTool] // Usando a instância com descrição personalizada
        });
        
        // Definir tarefas para testar a ferramenta
        const tarefas = [
            'Como faço o vestibular?',
        ];
        
        // Executar cada tarefa
        for (const tarefa of tarefas) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agente.task = tarefa;
            
            try {
                // Testar a ferramenta através do agente
                console.log("\n4. Testando a ferramenta através do agente (usando a instância com descrição personalizada):");
                const resposta = await agente.executeTask();
                console.log(`\nResposta do Agente:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste:", error);
    }
}

// Executar o teste
testVertexAISearchRetriever();
