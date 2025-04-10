/**
 * Testes para o RoutingChatManager
 * 
 * Este arquivo contém testes para validar o funcionamento do RoutingChatManager,
 * incluindo o fluxo completo de sub-conversas delegadas.
 */

require('dotenv').config();
const { RoutingChatManager, tools } = require('../index');
const { SubConversation } = tools;

// Configuração de teste
const llmConfig = {
    projectId: process.env.GOOGLE_CLOUD_PROJECT_ID || 'seu-project-id',
    credentialsPath: process.env.GOOGLE_APPLICATION_CREDENTIALS,
    modelName: 'gemini-2.0-flash-001'
};

// Configuração do agente coordenador
const coordinatorConfig = {
    role: 'Coordenador de Atendimento',
    objective: 'Gerenciar o atendimento inicial e encaminhar para especialistas quando necessário',
    context: `Você é um Coordenador de Atendimento responsável por:
1. Receber e analisar solicitações iniciais dos usuários
2. Responder diretamente a perguntas simples e gerais
3. Identificar quando um especialista é necessário e solicitar uma sub-conversa
4. Processar os resultados dos especialistas e dar continuidade ao atendimento

INSTRUÇÕES PARA SUB-CONVERSAS:
- Quando identificar que um especialista é necessário, use a ferramenta 'request_specialist_sub_conversation'
- Forneça o papel exato do especialista, contexto inicial claro e a mensagem do usuário
- Quando receber de volta o controle com um resultado de especialista, analise cuidadosamente:
  * O status da sub-conversa
  * O resultado final fornecido
  * A última mensagem do usuário para o especialista
  * Qualquer mensagem adicional do especialista para você
- Integre essas informações na sua resposta ao usuário de forma natural

ESPECIALISTAS DISPONÍVEIS:
- 'especialista_vendas': Para consultas sobre produtos, preços e promoções
- 'especialista_suporte': Para problemas técnicos e suporte ao produto
`
};

// Configuração dos especialistas
const specialistAgentRegistryConfig = {
    especialista_vendas: {
        role: 'Especialista em Vendas',
        objective: 'Fornecer informações detalhadas sobre produtos e auxiliar em vendas',
        context: `Você é um Especialista em Vendas responsável por:
1. Fornecer informações detalhadas sobre produtos
2. Responder dúvidas sobre preços, disponibilidade e promoções
3. Auxiliar o cliente na escolha do produto mais adequado
4. Coletar informações relevantes para uma possível compra

INSTRUÇÕES PARA FINALIZAR SUB-CONVERSA:
- Quando tiver coletado todas as informações necessárias ou o cliente indicar que está satisfeito
- Ou quando perceber que não pode ajudar mais e o coordenador deve retomar
- Use a ferramenta 'end_specialist_sub_conversation'
- Forneça:
  * Um status claro ('completed', 'needs_handoff', etc.)
  * Um resultado estruturado com as informações coletadas
  * A última mensagem do usuário que levou à conclusão
  * Uma mensagem opcional para o coordenador

PRODUTOS DISPONÍVEIS:
- Smartphone XYZ: R$ 2.499,00
- Notebook ABC: R$ 4.999,00
- Smart TV UVW: R$ 3.299,00
`
    },
    especialista_suporte: {
        role: 'Especialista em Suporte Técnico',
        objective: 'Resolver problemas técnicos e fornecer orientações de uso',
        context: `Você é um Especialista em Suporte Técnico responsável por:
1. Diagnosticar problemas técnicos
2. Fornecer soluções passo a passo
3. Orientar sobre o uso correto dos produtos
4. Registrar problemas que precisam de atendimento presencial

INSTRUÇÕES PARA FINALIZAR SUB-CONVERSA:
- Quando o problema for resolvido ou quando identificar que precisa de atendimento presencial
- Use a ferramenta 'end_specialist_sub_conversation'
- Forneça:
  * Um status claro ('completed', 'needs_handoff', etc.)
  * Um resultado estruturado com o diagnóstico e solução
  * A última mensagem do usuário que levou à conclusão
  * Uma mensagem opcional para o coordenador

PROBLEMAS COMUNS:
- Reinicialização: Segure o botão liga/desliga por 10 segundos
- Conexão Wi-Fi: Verifique se o roteador está funcionando e tente reconectar
- Bateria: Calibre a bateria descarregando completamente e recarregando
`
    }
};

// Função principal de teste
async function testarRoutingChatManager() {
    console.log('Iniciando teste do RoutingChatManager...');
    
    // Criar instância do RoutingChatManager
    const manager = new RoutingChatManager({
        llmConfig,
        agentConfig: coordinatorConfig,
        specialistAgentRegistryConfig
    });
    
    // ID de sessão para o teste
    const sessionId = 'teste-routing-' + Date.now();
    
    try {
        // Cenário de teste completo
        console.log('\n=== CENÁRIO DE TESTE: FLUXO COMPLETO DE SUB-CONVERSA ===\n');
        
        // 1. Usuário -> Coordenador (mensagem inicial)
        console.log('1. USUÁRIO -> COORDENADOR (MENSAGEM INICIAL)');
        let mensagemUsuario = 'Olá, estou com problemas no meu smartphone. A tela está piscando e a bateria acaba muito rápido.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        let resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do coordenador: "${resposta.text}"`);
        
        // 2. Usuário -> Coordenador (solicitação que deve acionar especialista)
        console.log('\n2. USUÁRIO -> COORDENADOR (SOLICITAÇÃO QUE DEVE ACIONAR ESPECIALISTA)');
        mensagemUsuario = 'Sim, é um problema técnico. Preciso de ajuda para resolver isso urgentemente.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do coordenador: "${resposta.text}"`);
        console.log(`Sinal interno: ${resposta._internalToolSignal ? resposta._internalToolSignal._signal_type : 'Nenhum'}`);
        
        // 3. Usuário -> Especialista (primeira interação)
        console.log('\n3. USUÁRIO -> ESPECIALISTA (PRIMEIRA INTERAÇÃO)');
        mensagemUsuario = 'Já tentei reiniciar, mas o problema continua. O que mais posso fazer?';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do especialista: "${resposta.text}"`);
        
        // 4. Usuário -> Especialista (segunda interação)
        console.log('\n4. USUÁRIO -> ESPECIALISTA (SEGUNDA INTERAÇÃO)');
        mensagemUsuario = 'Vou tentar essas dicas. Se não funcionar, acho que vou precisar levar para a assistência técnica.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do especialista: "${resposta.text}"`);
        
        // 5. Usuário -> Especialista (mensagem que deve finalizar a sub-conversa)
        console.log('\n5. USUÁRIO -> ESPECIALISTA (MENSAGEM QUE DEVE FINALIZAR A SUB-CONVERSA)');
        mensagemUsuario = 'Obrigado pelas dicas! Vou tentar e se não resolver, entro em contato novamente.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do especialista: "${resposta.text}"`);
        console.log(`Sinal interno: ${resposta._internalToolSignal ? resposta._internalToolSignal._signal_type : 'Nenhum'}`);
        
        // 6. Usuário -> Coordenador (nova mensagem após finalização da sub-conversa)
        console.log('\n6. USUÁRIO -> COORDENADOR (NOVA MENSAGEM APÓS FINALIZAÇÃO DA SUB-CONVERSA)');
        mensagemUsuario = 'A propósito, vocês têm alguma promoção para smartphones novos? Caso eu precise trocar o meu.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do coordenador: "${resposta.text}"`);
        
        // 7. Usuário -> Coordenador (solicitação que deve acionar outro especialista)
        console.log('\n7. USUÁRIO -> COORDENADOR (SOLICITAÇÃO QUE DEVE ACIONAR OUTRO ESPECIALISTA)');
        mensagemUsuario = 'Sim, gostaria de saber mais detalhes sobre os smartphones disponíveis e preços.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do coordenador: "${resposta.text}"`);
        console.log(`Sinal interno: ${resposta._internalToolSignal ? resposta._internalToolSignal._signal_type : 'Nenhum'}`);
        
        // 8. Usuário -> Especialista de Vendas
        console.log('\n8. USUÁRIO -> ESPECIALISTA DE VENDAS');
        mensagemUsuario = 'Qual é o smartphone mais recente que vocês têm? Quais são as especificações?';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do especialista de vendas: "${resposta.text}"`);
        
        // 9. Usuário -> Especialista de Vendas (finalização)
        console.log('\n9. USUÁRIO -> ESPECIALISTA DE VENDAS (FINALIZAÇÃO)');
        mensagemUsuario = 'Perfeito! Vou pensar e retorno depois para fazer a compra. Obrigado pelas informações!';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta do especialista de vendas: "${resposta.text}"`);
        console.log(`Sinal interno: ${resposta._internalToolSignal ? resposta._internalToolSignal._signal_type : 'Nenhum'}`);
        
        // 10. Usuário -> Coordenador (mensagem final)
        console.log('\n10. USUÁRIO -> COORDENADOR (MENSAGEM FINAL)');
        mensagemUsuario = 'Obrigado por toda a ajuda hoje! Foi muito útil.';
        console.log(`Mensagem do usuário: "${mensagemUsuario}"`);
        
        resposta = await manager.processMessage(sessionId, mensagemUsuario);
        console.log(`Resposta final do coordenador: "${resposta.text}"`);
        
        console.log('\n=== TESTE CONCLUÍDO COM SUCESSO ===\n');
        
    } catch (error) {
        console.error('Erro durante o teste:', error);
    } finally {
        // Encerrar a sessão e desligar o manager
        await manager.endSession(sessionId);
        await manager.shutdown();
        console.log('Sessão encerrada e manager desligado.');
    }
}

// Executar o teste
testarRoutingChatManager().catch(console.error);
