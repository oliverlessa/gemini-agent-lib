// test-auto-gen-orchestrator-dependencies.js
// Teste para demonstrar o gerenciamento de dependências no AutoGenOrchestrator

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const { AutoGenOrchestrator } = require('../');

// Verifica se as configurações necessárias estão presentes
if (!process.env.VERTEX_PROJECT_ID) {
    console.error("Erro: VERTEX_PROJECT_ID não encontrado nas variáveis de ambiente.");
    process.exit(1);
}

if (!process.env.VERTEX_CREDENTIALS_PATH) {
    console.error("Erro: VERTEX_CREDENTIALS_PATH não encontrado nas variáveis de ambiente.");
    process.exit(1);
}

// Função principal de teste
async function testarDependenciasAutoGenOrchestrator() {
    console.log("\n=== Teste de Dependências do AutoGenOrchestrator ===\n");
    
    try {
        // Instancia o AutoGenOrchestrator com configurações completas da Vertex AI
        const orchestrator = new AutoGenOrchestrator({
            apiKey: process.env.VERTEX_API_KEY,
            credentialsPath: process.env.VERTEX_CREDENTIALS_PATH,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-2.0-flash-001", // Modelo que suporta Google Search
            mode: "oneshot" // Modo oneshot para o orquestrador
        });
        
        console.log("AutoGenOrchestrator instanciado com sucesso.");
        
        // Define uma tarefa complexa que requer dependências entre sub-tarefas
        const userTask = `
            Crie um artigo técnico sobre Inteligência Artificial Generativa seguindo estas etapas:
            
            1. Primeiro, pesquise e liste os principais modelos de IA generativa atuais, suas características e aplicações.
            2. Em seguida, com base nos modelos identificados, analise as tendências e padrões comuns entre eles.
            3. Depois, usando as tendências identificadas, faça previsões sobre o futuro da IA generativa nos próximos 5 anos.
            4. Por fim, com base em toda a análise anterior, elabore um artigo técnico completo que integre todas essas informações.
            
            Observe que cada etapa depende da anterior, então é importante seguir a ordem correta.
        `;
        
        console.log("\nExecutando orquestração para a tarefa com dependências:");
        console.log(userTask);
        
        // Executa a orquestração da tarefa
        const resultado = await orchestrator.orchestrateTask(userTask);
        
        console.log("\n=== Resultado Final da Orquestração com Dependências ===\n");
        console.log(resultado);
        
        console.log("\n=== Teste de Dependências do AutoGenOrchestrator Concluído com Sucesso ===\n");
        
    } catch (error) {
        console.error("\nErro durante o teste de dependências do AutoGenOrchestrator:", error);
    }
}

// Executa o teste
testarDependenciasAutoGenOrchestrator().catch(console.error);
