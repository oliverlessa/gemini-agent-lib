/**
 * Ferramentas de sinalização para sub-conversas delegadas
 * 
 * Este módulo fornece ferramentas que permitem a sinalização entre agentes
 * e o RoutingChatManager para iniciar e finalizar sub-conversas delegadas.
 */

const FunctionDeclarationSchemaType = require('../function-declaration-schema-type');
const debug = require('../debug');

// Criar um logger específico para as ferramentas de sub-conversa
debug.subconversationTools = debug.create('subconversation-tools');

/**
 * @typedef {import('../agent').ToolDefinition} ToolDefinition
 */

/**
 * @const {ToolDefinition} request_specialist_sub_conversation
 * @description Ferramenta de sinalização usada por um agente coordenador para
 *              solicitar o início de uma sub-conversa com um especialista.
 *              Retorna um sinal estruturado para interceptação pelo RoutingChatManager.
 */
const request_specialist_sub_conversation = {
    name: "request_specialist_sub_conversation",
    description: "(Uso Interno do Sistema) Solicita o início de uma sub-conversa com um agente especialista específico, passando o controle temporário para ele.",
    parameters: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            specialist_role: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "O 'role' (identificador) do agente especialista registrado que deve assumir a conversa."
            },
            initial_context: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Contexto ou instrução inicial a ser passada para o especialista iniciar sua tarefa/conversa."
            }
            // user_message_for_specialist removido - o manager lida com isso internamente
        },
        required: ["specialist_role", "initial_context"] // Removido user_message_for_specialist
    },
    /**
     * @param {object} args
     * @param {string} args.specialist_role
     * @param {string} args.initial_context
     * @returns {Promise<object>} Objeto de sinalização.
     */
    function: async (args) => {
        // Validação atualizada
        if (!args.specialist_role || !args.initial_context) {
            const errorMsg = "[Tool Signal Error] Argumentos inválidos para request_specialist_sub_conversation (specialist_role e initial_context são obrigatórios).";
            console.error(errorMsg, args);
            return { _signal_type: "SIGNAL_ERROR", error: errorMsg, originalArgs: args };
        }
        debug.subconversationTools(`[SIGNAL] request_specialist_sub_conversation chamado com especialista: ${args.specialist_role}`);
        return {
            _signal_type: "REQUEST_SUB_CONVERSATION",
            details: { // Retorna os detalhes para o Manager usar
                specialist_role: args.specialist_role,
                initial_context: args.initial_context
                // user_message_for_specialist não é mais necessário aqui
            }
        };
    }
};

/**
 * @const {ToolDefinition} end_specialist_sub_conversation
 * @description Ferramenta de sinalização usada por um agente especialista para
 *              indicar o fim de sua sub-conversa e devolver o controle.
 *              Retorna um sinal estruturado para interceptação pelo RoutingChatManager.
 */
const end_specialist_sub_conversation = {
    name: "end_specialist_sub_conversation",
    description: "(Uso Interno do Sistema) Sinaliza o fim da sub-conversa atual do especialista, capturando a última mensagem do usuário que levou a esta conclusão, e retorna o controle para o agente principal com um resultado final.",
    parameters: {
        type: FunctionDeclarationSchemaType.OBJECT,
        properties: {
            status: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Status final da tarefa do especialista (ex: 'completed', 'failed', 'user_cancelled', 'needs_handoff')."
            },
            final_result: {
                type: FunctionDeclarationSchemaType.OBJECT, // Alterado de ANY para OBJECT
                description: "O resultado final estruturado (objeto JSON, string, etc.) do trabalho do especialista."
            },
            last_user_message: { // NOVO PARÂMETRO CRUCIAL
                type: FunctionDeclarationSchemaType.STRING,
                description: "O conteúdo da última mensagem do usuário que foi processada pelo especialista e levou à conclusão desta sub-conversa."
            },
            message_to_coordinator: {
                type: FunctionDeclarationSchemaType.STRING,
                description: "Opcional. Mensagem final ou resumo conciso para o agente coordenador processar."
            }
        },
        // last_user_message é essencial para o fluxo correto
        required: ["status", "final_result", "last_user_message"]
    },
    /**
     * @param {object} args
     * @param {string} args.status
     * @param {any} args.final_result
     * @param {string} args.last_user_message
     * @param {string} [args.message_to_coordinator]
     * @returns {Promise<object>} Objeto de sinalização.
     */
    function: async (args) => {
        // Validação inclui last_user_message
        if (!args.status || args.final_result === undefined || args.last_user_message === undefined) {
            const errorMsg = "[Tool Signal Error] Argumentos inválidos para end_specialist_sub_conversation (status, final_result, e last_user_message são obrigatórios).";
            console.error(errorMsg, args);
            return { _signal_type: "SIGNAL_ERROR", error: errorMsg, originalArgs: args };
        }
        debug.subconversationTools(`[SIGNAL] end_specialist_sub_conversation chamado com status: ${args.status}`);
        return {
            _signal_type: "END_SUB_CONVERSATION",
            details: { // Retorna os detalhes, incluindo a última mensagem do usuário
                status: args.status,
                final_result: args.final_result,
                last_user_message: args.last_user_message, // Passa adiante
                message_to_coordinator: args.message_to_coordinator || null
            }
        };
    }
};

module.exports = {
    request_specialist_sub_conversation,
    end_specialist_sub_conversation
};
