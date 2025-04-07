// tools/restaurant-tool.js

const ToolBuilder = require('../tool-builder');
const FunctionDeclarationSchemaType = require('../function-declaration-schema-type');
const debug = require('../debug').tools;

/**
 * Implementação da função de restaurantes
 * @param {Object} args - Argumentos da função
 * @returns {Object} - Dados de restaurantes
 */
function restaurantImplementation(args) {
    debug(`Chamada para search_restaurants com args: %o`, args);
    const limit = args.limit || 3;
    const cuisine = args.cuisine ? ` de culinária ${args.cuisine}` : "";
    const priceRange = args.price_range ? ` com preço ${args.price_range}` : "";
    
    // Retorna restaurantes fictícios
    return {
        location: args.location,
        cuisine: args.cuisine || "todos",
        price_range: args.price_range || "todos",
        restaurants: Array.from({ length: limit }, (_, i) => ({
            id: i + 1,
            name: `Restaurante Fictício ${i + 1}${cuisine}${priceRange}`,
            rating: (Math.floor(Math.random() * 40) + 10) / 10, // 1.0-5.0
            price_level: ["$", "$$", "$$$"][Math.floor(Math.random() * 3)],
            cuisine_type: args.cuisine || ["Italiana", "Japonesa", "Brasileira", "Francesa", "Mexicana"][Math.floor(Math.random() * 5)],
            address: `Rua Fictícia, ${Math.floor(Math.random() * 1000) + 1}, ${args.location}`,
            open_now: Math.random() > 0.3 // 70% de chance de estar aberto
        }))
    };
};

// Cria a factory da tool usando ToolBuilder
const restaurantTool = ToolBuilder.createTool("restaurant", "Pesquisa restaurantes em uma determinada localização")
    .addParameter("location", "string", "Nome da cidade ou localização", { required: true })
    .addParameter("cuisine", "string", "Tipo de culinária (opcional)")
    .addParameter("price_range", "string", "Faixa de preço (opcional)", { enum: ["barato", "médio", "caro"] })
    .addParameter("limit", "number", "Número máximo de resultados (opcional)")
    .setFunction(restaurantImplementation)
    .createFactory({
        // Configurações padrão
        limit: 3
    });

/**
 * Factory function para criar instâncias da tool Restaurant
 * com configurações personalizadas.
 * 
 * @param {Object} config - Configurações personalizadas para a tool
 * @param {string} config.cuisine - Tipo de culinária padrão (opcional)
 * @param {string} config.price_range - Faixa de preço padrão (opcional)
 * @param {number} config.limit - Número máximo de resultados padrão (opcional, padrão: 3)
 * @returns {Object} - Instância configurada da tool Restaurant
 * 
 * @example
 * // Uso básico (com valores padrão)
 * const defaultTool = restaurantTool();
 * 
 * // Uso com configurações personalizadas
 * const italianRestaurantTool = restaurantTool({
 *   cuisine: 'Italiana',
 *   price_range: 'médio',
 *   limit: 5
 * });
 */
module.exports = restaurantTool;
