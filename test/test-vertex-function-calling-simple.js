// test-vertex-function-calling-simple.js
require('dotenv').config();
const VertexAILLM = require('../lib/vertex-ai-llm');
const Agent = require('../lib/agent');

// Função principal de teste simplificado
async function testVertexFunctionCallingSimple() {
    try {
        console.log("Iniciando teste simplificado de function calling com Vertex AI...");

        console.log(process.env.GOOGLE_APPLICATION_CREDENTIALS);
        
        // Criar instância do VertexAILLM
        const vertexLLM = new VertexAILLM({
            apiKey: process.env.VERTEX_API_KEY,
            credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
            projectId: process.env.VERTEX_PROJECT_ID,
            location: process.env.VERTEX_LOCATION || "us-central1",
            modelName: "gemini-1.0-pro",
            mode: "oneshot"
        });
        
        // Definir uma única tool (função) para o agente
        const tools = [
            {
                name: "getDadosFicticios",
                description: "Obtém dados fictícios para qualquer tipo de consulta",
                parameters: {
                    type: "object",
                    properties: {
                        consulta: {
                            type: "string",
                            description: "O tipo de dados que você deseja obter"
                        },
                        quantidade: {
                            type: "number",
                            description: "Quantidade de itens a retornar (opcional)"
                        }
                    },
                    required: ["consulta"]
                },
                function: async (args) => {
                    console.log(`Chamada para getDadosFicticios com args:`, args);
                    
                    const consulta = args.consulta.toLowerCase();
                    const quantidade = args.quantidade || 3;
                    
                    // Diferentes tipos de dados fictícios baseados na consulta
                    if (consulta.includes("clima") || consulta.includes("tempo") || consulta.includes("meteorologia")) {
                        return {
                            tipo: "dados_climaticos",
                            cidade: consulta.includes("são paulo") ? "São Paulo" : 
                                   consulta.includes("rio") ? "Rio de Janeiro" : "Cidade não especificada",
                            temperatura: Math.floor(Math.random() * 30) + 5,
                            condicao: ["ensolarado", "nublado", "chuvoso", "tempestuoso"][Math.floor(Math.random() * 4)],
                            umidade: Math.floor(Math.random() * 60) + 30,
                            previsao: [
                                { dia: "hoje", temp: Math.floor(Math.random() * 30) + 5 },
                                { dia: "amanhã", temp: Math.floor(Math.random() * 30) + 5 },
                                { dia: "depois de amanhã", temp: Math.floor(Math.random() * 30) + 5 }
                            ]
                        };
                    } 
                    else if (consulta.includes("produto") || consulta.includes("loja") || consulta.includes("compra")) {
                        return {
                            tipo: "produtos",
                            categoria: consulta.includes("eletrônico") ? "Eletrônicos" : 
                                      consulta.includes("roupa") ? "Vestuário" : "Geral",
                            produtos: Array.from({ length: quantidade }, (_, i) => ({
                                id: i + 1,
                                nome: `Produto Fictício ${i + 1}`,
                                preco: Math.floor(Math.random() * 1000) + 50,
                                avaliacao: (Math.floor(Math.random() * 50) + 1) / 10
                            }))
                        };
                    }
                    else if (consulta.includes("notícia") || consulta.includes("jornal") || consulta.includes("informação")) {
                        return {
                            tipo: "noticias",
                            categoria: consulta.includes("esporte") ? "Esportes" : 
                                      consulta.includes("política") ? "Política" : "Geral",
                            noticias: Array.from({ length: quantidade }, (_, i) => ({
                                id: i + 1,
                                titulo: `Notícia Fictícia ${i + 1}`,
                                resumo: `Este é um resumo fictício para a notícia ${i + 1}`,
                                data: new Date().toISOString().split('T')[0]
                            }))
                        };
                    }
                    else {
                        // Dados genéricos para qualquer outra consulta
                        return {
                            tipo: "dados_genericos",
                            consulta: args.consulta,
                            resultados: Array.from({ length: quantidade }, (_, i) => ({
                                id: i + 1,
                                titulo: `Resultado ${i + 1} para "${args.consulta}"`,
                                descricao: `Esta é uma descrição fictícia para o resultado ${i + 1}`,
                                relevancia: Math.floor(Math.random() * 100) / 100
                            }))
                        };
                    }
                }
            }
        ];
        
        // Criar o agente com a tool
        const agenteSimples = new Agent({
            role: "Assistente de Dados Fictícios",
            objective: "Fornecer dados fictícios para demonstração",
            context: `Você é um assistente de IA que tem acesso a uma ferramenta que fornece dados fictícios.
                     Quando o usuário fizer qualquer pergunta que exija dados externos, use a ferramenta getDadosFicticios para obter esses dados.
                     Após receber os resultados da ferramenta, forneça uma resposta clara e informativa baseada nesses dados.
                     Lembre-se que todos os dados são fictícios e apenas para demonstração.`,
            task: "", // Será definida abaixo
            llm: vertexLLM,
            tools: tools
        });
        
        // Definir tarefas para testar
        const tarefasSimples = [
            "Como está o clima em São Paulo hoje?",
            "Quais são os produtos mais vendidos na loja?",
            "Me mostre as últimas notícias sobre política",
            "Quais são os melhores restaurantes da cidade?",
            "Qual é a previsão do tempo para o Rio de Janeiro?"
        ];
        
        // Executar cada tarefa
        for (const tarefa of tarefasSimples) {
            console.log(`\n\n--- Executando tarefa: "${tarefa}" ---`);
            agenteSimples.task = tarefa;
            
            try {
                const resposta = await agenteSimples.executeTask();
                console.log(`\nResposta do Agente:\n${resposta}`);
            } catch (error) {
                console.error(`Erro ao executar tarefa "${tarefa}":`, error);
            }
        }
        
    } catch (error) {
        console.error("Erro ao executar o teste simplificado:", error);
    }
}

// Executar o teste
testVertexFunctionCallingSimple();
