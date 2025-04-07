// template-tool.js

const ToolBuilder = require('../tool-builder');
const FunctionDeclarationSchemaType = require('../function-declaration-schema-type');
const debug = require('../debug').tools;

/**
 * Implementação da função template
 * @param {Object} args - Argumentos da função
 * @returns {Object} - Dados retornados pela tool
 */
function templateImplementation(args) {
    debug(`Chamada para template com args: %o`, args);
    
    // Implementação da lógica da tool
    // ...
    
    return {
        // Resultado da tool
    };
}

// Cria a factory da tool usando ToolBuilder
const templateTool = ToolBuilder.createTool("template", "Descrição da tool template")
    .addParameter("param1", "string", "Descrição do parâmetro 1", { required: true })
    .addParameter("param2", "number", "Descrição do parâmetro 2")
    // Adicione mais parâmetros conforme necessário
    .setFunction(templateImplementation)
    .createFactory({
        // Configurações padrão
        param2: 10
    });

/**
 * Factory function para criar instâncias da tool Template
 * com configurações personalizadas.
 * 
 * @param {Object} config - Configurações personalizadas para a tool
 * @param {number} config.param2 - Valor para o parâmetro 2 (opcional, padrão: 10)
 * @returns {Object} - Instância configurada da tool Template
 * 
 * @example
 * // Uso básico (com valores padrão)
 * const defaultTool = templateTool();
 * 
 * // Uso com configurações personalizadas
 * const customTool = templateTool({
 *   param2: 20
 * });
 */
module.exports = templateTool;
