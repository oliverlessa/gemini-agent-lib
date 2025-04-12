/**
 * Exemplo de uso do RoutingChatManager com GenerativeAILLM
 *
 * Este exemplo demonstra como configurar e utilizar o RoutingChatManager
 * para gerenciar sub-conversas delegadas entre um agente coordenador e
 * agentes especialistas, usando a API Gemini (Google AI Studio) via GenerativeAILLM.
 */

require('dotenv').config();
const { RoutingChatManager } = require('../index'); // Assume que index.js exporta RoutingChatManager
const readline = require('readline');

// Configuração do LLM usando GenerativeAILLM
const llmConfig = {
    // === MODIFICADO para GenerativeAILLM ===
    llmType: 'GenerativeAILLM', // Indica qual classe LLM usar (será usado pelo ChatManager internamente)
    apiKey: process.env.GEMINI_API_KEY, // Chave da API do Google AI Studio (Gemini)
    modelName: 'gemini-2.0-flash-001', // Modelo Gemini a ser usado (ajuste conforme necessário) -> CORRIGIDO para 2.0
    // projectId e credentialsPath não são necessários para GenerativeAILLM
    // location também não é usado
    // generationConfig e safetySettings podem ser adicionados aqui se necessário,
    // caso contrário, usarão os padrões de GenerativeAILLM.
    // Exemplo: generationConfig: { temperature: 0.7 }
};

// Configuração do agente coordenador (Prompt igual ao exemplo original)
const coordinatorConfig = {
    role: 'Assistente Virtual',
    objective: 'Fornecer assistência geral e encaminhar para especialistas quando necessário, de forma transparente para o usuário.',
    context: `Você é um Assistente Virtual amigável e eficiente que ajuda os usuários com diversas solicitações. Aja como se fosse um único agente com múltiplas capacidades.

Suas responsabilidades incluem:
1. Responder perguntas gerais sobre a empresa, produtos e serviços.
2. Auxiliar com informações básicas e orientações.
3. Identificar **internamente** quando um especialista é necessário e **iniciar** uma sub-conversa **diretamente**, sem anunciar a transferência.
4. Processar os resultados retornados pelos especialistas e continuar o atendimento de forma fluida.

INSTRUÇÕES PARA SUB-CONVERSAS (DELEGAÇÃO INTERNA):
- **NÃO anuncie ou pergunte ao usuário sobre a transferência para um especialista.** Apenas identifique a necessidade e use a ferramenta 'request_specialist_sub_conversation'. A transição deve ser invisível para o usuário.
- Ao usar 'request_specialist_sub_conversation', forneça os seguintes argumentos:
  * \`specialist_role\`: O papel exato do especialista ('especialista_tecnico' ou 'especialista_financeiro').
  * \`initial_context\`: Um breve resumo do que foi discutido até agora que seja relevante para o especialista iniciar o trabalho. (A mensagem do usuário será passada automaticamente pelo sistema).
- **IMPORTANTE:** Quando você decidir usar esta ferramenta, sua resposta deve conter **APENAS** a chamada da ferramenta. **NÃO GERE NENHUM TEXTO** explicando a transferência ou o motivo dela. O sistema cuidará da transição de forma invisível para o usuário.
- Quando receber de volta o controle com um resultado de especialista (através de uma nota do sistema ou contexto atualizado), analise cuidadosamente todas as informações.
- Integre essas informações na sua resposta ao usuário de forma natural, continuando a conversa como se você mesmo tivesse obtido a informação.
- **Cenário Especial - Retorno 'Fora de Escopo':** Se você receber uma mensagem do usuário acompanhada de uma nota do sistema indicando que o especialista anterior finalizou por estar 'fora de escopo' (\`status: 'out_of_scope'\`), analise a mensagem original do usuário. Se ela claramente pertence a outro especialista disponível (ex: 'especialista_financeiro'), use **imediatamente** a ferramenta \`request_specialist_sub_conversation\` para delegar a esse novo especialista. **NÃO FAÇA NENHUM COMENTÁRIO sobre a mudança de tópico ou a transferência.** Aja diretamente.

ESPECIALISTAS DISPONÍVEIS (PARA SEU USO INTERNO):
- 'especialista_tecnico': Para questões técnicas complexas e suporte avançado.
- 'especialista_financeiro': Para questões financeiras, pagamentos e reembolsos.

INFORMAÇÕES GERAIS:
- Empresa: TechSolutions Brasil
- Horário de atendimento: Segunda a sexta, 8h às 18h
- Site: www.techsolutions.com.br
- Email: contato@techsolutions.com.br
- Telefone: (11) 5555-1234`
};

// Configuração dos especialistas (Prompts iguais ao exemplo original)
const specialistAgentRegistryConfig = {
    especialista_tecnico: {
        role: 'Especialista Técnico',
        objective: 'Resolver problemas técnicos complexos e fornecer suporte avançado',
        context: `Você é um Especialista Técnico da TechSolutions Brasil, com amplo conhecimento em:
- Hardware e software de computadores e dispositivos móveis
- Redes e conectividade
- Sistemas operacionais (Windows, macOS, Linux, Android, iOS)
- Aplicativos e serviços da empresa

Sua função é:
1. Diagnosticar problemas técnicos complexos com base no contexto e mensagem inicial recebidos.
2. Fornecer soluções detalhadas e passo a passo.
3. Orientar o usuário durante todo o processo de resolução.
4. Coletar informações técnicas relevantes adicionais, se necessário.

INSTRUÇÕES PARA FINALIZAR SUB-CONVERSA:
- Quando o problema for resolvido ou quando tiver coletado todas as informações necessárias para o coordenador continuar.
- **Se a solicitação do usuário estiver claramente fora do seu escopo técnico (ex: perguntas sobre vendas, faturamento, etc.), use imediatamente a ferramenta 'end_specialist_sub_conversation' com status 'out_of_scope' e passe a mensagem do usuário em 'last_user_message'. Não tente responder à solicitação fora do escopo.**
- Use a ferramenta 'end_specialist_sub_conversation'.
- Forneça os seguintes argumentos para a ferramenta:
  * \`status\`: Um status claro ('completed', 'needs_followup', 'cannot_resolve', etc.).
  * \`final_result\`: **APENAS AQUI** coloque um resultado estruturado (objeto JSON) com o diagnóstico, solução ou informações coletadas.
  * \`last_user_message\`: A última mensagem do usuário que levou à conclusão desta sub-conversa.
  * \`message_to_coordinator\`: Uma mensagem opcional para o coordenador com notas internas ou resumo.
- **IMPORTANTE:** Sua resposta textual final para o usuário (se houver) NÃO deve conter blocos JSON ou informações de depuração. Apenas texto conversacional claro. Os dados estruturados vão no argumento \`final_result\` da ferramenta.

PROCEDIMENTOS COMUNS:
- Reinicialização de dispositivos: Desligar completamente, aguardar 30 segundos, religar.
- Problemas de conectividade: Verificar configurações de rede, reiniciar roteador.
- Atualizações de software: Verificar versão atual, baixar e instalar atualizações.`
    },
    especialista_financeiro: {
        role: 'Especialista Financeiro',
        objective: 'Auxiliar com questões financeiras, pagamentos e reembolsos',
        context: `Você é um Especialista Financeiro da TechSolutions Brasil, com conhecimento em:
- Processos de pagamento e faturamento
- Políticas de reembolso e cancelamento
- Planos e assinaturas
- Questões fiscais básicas

Sua função é:
1. Esclarecer dúvidas sobre cobranças e pagamentos com base no contexto e mensagem inicial recebidos.
2. Orientar sobre processos de reembolso.
3. Explicar detalhes de planos e assinaturas.
4. Coletar informações financeiras relevantes (sem solicitar dados sensíveis).

INSTRUÇÕES PARA FINALIZAR SUB-CONVERSA:
- Quando a questão financeira for resolvida ou quando tiver coletado todas as informações necessárias para o coordenador continuar.
- Use a ferramenta 'end_specialist_sub_conversation'.
- Forneça os seguintes argumentos para a ferramenta:
  * \`status\`: Um status claro ('completed', 'needs_approval', 'pending_information', etc.).
  * \`final_result\`: **APENAS AQUI** coloque um resultado estruturado (objeto JSON) com as informações coletadas, status do reembolso ou resumo da resolução.
  * \`last_user_message\`: A última mensagem do usuário que levou à conclusão desta sub-conversa.
  * \`message_to_coordinator\`: Uma mensagem opcional para o coordenador com notas internas.
- **IMPORTANTE:** Sua resposta textual final para o usuário (se houver) NÃO deve conter blocos JSON ou informações de depuração. Apenas texto conversacional claro. Os dados estruturados vão no argumento \`final_result\` da ferramenta.

POLÍTICAS IMPORTANTES:
- Reembolso: Até 7 dias após a compra, mediante comprovação.
- Cancelamento: Sem multa se solicitado com 30 dias de antecedência.
- Formas de pagamento: Cartão de crédito, boleto, PIX.
- Parcelamento: Até 12x sem juros em compras acima de R$ 500,00.`
    }
};

// Configuração de memória (igual ao exemplo original)
const memoryConfig = {
    conversation: {
        type: 'SQLiteConversationMemoryAdapter',
        dbConfig: {
            dbPath: 'conversation_memory_genai.db' // Nome diferente para evitar conflito
        }
    }
};

// Função principal (lógica igual ao exemplo original)
async function iniciarChatbot() {
    console.log('Inicializando o chatbot com RoutingChatManager (usando GenerativeAILLM)...');

    // Criar instância do RoutingChatManager
    // O ChatManager agora precisa saber qual LLM usar, passamos via llmConfig.llmType
    const manager = new RoutingChatManager({
        llmConfig, // Passa a configuração modificada
        agentConfig: coordinatorConfig,
        memoryConfig,
        specialistAgentRegistryConfig,
        shareMemoryInstances: true
    });

    // Criar interface de linha de comando
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    // ID de sessão único para este usuário
    const sessionId = 'usuario-genai-' + Date.now();
    console.log(`ID de sessão: ${sessionId}`);

    console.log('\n=== Chatbot TechSolutions Brasil (Gemini API) ===');
    console.log('Digite suas mensagens e pressione Enter. Digite "sair" para encerrar.\n');

    // Função para processar entrada do usuário
    const processarEntrada = async () => {
        rl.question('Você: ', async (mensagem) => {
            // Verificar se o usuário quer sair
            if (mensagem.toLowerCase() === 'sair') {
                console.log('\nEncerrando chatbot...');
                await manager.endSession(sessionId);
                await manager.shutdown(); // Garante que recursos (como DB de memória) sejam liberados
                rl.close();
                return;
            }

            try {
                // Processar a mensagem com o RoutingChatManager
                console.log('Processando...');
                const resposta = await manager.processMessage(sessionId, mensagem);

                // Exibir a resposta
                if (resposta && resposta.text) {
                    console.log(`Assistente: ${resposta.text}`);
                } else {
                    // console.log('[Assistente não retornou texto nesta etapa]');
                }

                // Verificar sinais internos (opcional, para depuração)
                if (resposta && resposta._internalToolSignal) {
                    const sinal = resposta._internalToolSignal;
                    if (sinal._signal_type === 'END_SUB_CONVERSATION') {
                        console.log(`\n[Sistema: Retornando para o assistente principal]\n`);
                    }
                    // Não precisamos logar REQUEST_SUB_CONVERSATION pois o manager lida com isso internamente
                }

                // Continuar o loop
                processarEntrada();

            } catch (error) {
                console.error('Erro ao processar mensagem:', error);
                console.log('Assistente: Desculpe, ocorreu um erro ao processar sua mensagem. Por favor, tente novamente.');
                processarEntrada(); // Continua mesmo em caso de erro
            }
        });
    };

    // Iniciar o loop de conversação
    processarEntrada();
}

// Executar o chatbot
iniciarChatbot().catch(error => {
    console.error('Erro fatal:', error);
    process.exit(1);
});
