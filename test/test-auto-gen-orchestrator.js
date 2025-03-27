// test-auto-gen-orchestrator.js
// Teste para o AutoGenOrchestrator - Orquestrador Autônomo de Agentes

require('dotenv').config(); // Carrega variáveis de ambiente do arquivo .env

const { AutoGenOrchestrator } = require('../');

console.log(process.env.VERTEX_PROJECT_ID);

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
async function testarAutoGenOrchestrator() {
    console.log("\n=== Teste do AutoGenOrchestrator - Orquestrador Autônomo de Agentes ===\n");
    
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
        
        // Define uma tarefa complexa para testar o orquestrador
        const userTask = "Crie artigo longo e detalhado detalhado, com pelo menos 2000 palavras, sobre inteligência artificial generativa, incluindo suas aplicações atuais, limitações e perspectivas futuras. Inclua exemplos de uso em diferentes setores como saúde, educação e negócios. Após a conclusãom, inclua uma seção de referências listando as fontes utilizadas para a elaboração do artigo e citando trechos das fontes.";
        
        console.log("\nExecutando orquestração para a tarefa:");
        console.log(userTask);
        
        // Executa a orquestração da tarefa
        const resultado = await orchestrator.orchestrateTask(userTask);
        
        console.log("\n=== Resultado Final da Orquestração ===\n");
        console.log(resultado);
        
        console.log("\n=== Teste do AutoGenOrchestrator Concluído com Sucesso ===\n");
        
    } catch (error) {
        console.error("\nErro durante o teste do AutoGenOrchestrator:", error);
    }
}

// Executa o teste
testarAutoGenOrchestrator().catch(console.error);
