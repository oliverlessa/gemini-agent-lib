// tools/weather-tool.js

const ToolBuilder = require('../tool-builder');
const FunctionDeclarationSchemaType = require('../function-declaration-schema-type');
const debug = require('../debug').tools;

/**
 * Implementação da função de clima
 * @param {Object} args - Argumentos da função
 * @returns {Object} - Dados meteorológicos
 */
function weatherImplementation(args) {
    debug(`Chamada para get_weather com args: %o`, args);
    // Retorna dados meteorológicos fictícios
    return {
        location: args.location,
        temperature: Math.floor(Math.random() * 30) + 5, // 5-35°C
        unit: args.unit || "celsius",
        conditions: ["ensolarado", "nublado", "chuvoso", "tempestuoso"][Math.floor(Math.random() * 4)],
        humidity: Math.floor(Math.random() * 60) + 30, // 30-90%
        wind: Math.floor(Math.random() * 30), // 0-30 km/h
        forecast: [
            { day: "hoje", temp: Math.floor(Math.random() * 30) + 5, conditions: "ensolarado" },
            { day: "amanhã", temp: Math.floor(Math.random() * 30) + 5, conditions: "parcialmente nublado" },
            { day: "depois de amanhã", temp: Math.floor(Math.random() * 30) + 5, conditions: "chuvoso" }
        ]
    };
};

// Cria a factory da tool usando ToolBuilder
const weatherTool = ToolBuilder.createTool("weather", "Obtém informações meteorológicas de hoje ou de até dois dias adiante para uma localização específica")
    .addParameter("location", "string", "Nome da cidade ou localização", { required: true })
    .addParameter("unit", "string", "Unidade de temperatura (opcional)", { enum: ["celsius", "fahrenheit"] })
    .setFunction(weatherImplementation)
    .createFactory({
        // Configurações padrão
        unit: "celsius"
    });

/**
 * Factory function para criar instâncias da tool Weather
 * com configurações personalizadas.
 * 
 * @param {Object} config - Configurações personalizadas para a tool
 * @param {string} config.unit - Unidade de temperatura padrão (opcional, padrão: 'celsius')
 * @returns {Object} - Instância configurada da tool Weather
 * 
 * @example
 * // Uso básico (com valores padrão)
 * const defaultTool = weatherTool();
 * 
 * // Uso com configurações personalizadas
 * const fahrenheitTool = weatherTool({
 *   unit: 'fahrenheit'
 * });
 */
module.exports = weatherTool;
