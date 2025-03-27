// tool-builder.js
const FunctionDeclarationSchemaType = require('./function-declaration-schema-type'); // Importe o enum de tipos

/**
 * Classe ToolBuilder para facilitar a criação de ferramentas (tools) de forma fluente.
 * Permite a definição de ferramentas usando encadeamento de métodos (method chaining).
 */
class ToolBuilder {
    /**
     * Construtor da classe ToolBuilder.
     * @param {string} name - Nome da ferramenta (obrigatório).
     * @param {string} description - Descrição da ferramenta (obrigatório).
     * @throws {Error} Se name ou description não forem fornecidos.
     */
    constructor(name, description) {
        if (!name) {
            throw new Error("Tool name is required.");
        }
        if (!description) {
            throw new Error("Tool description is required.");
        }
        this.toolDefinition = {
            name: name,
            description: description,
            parameters: {
                type: FunctionDeclarationSchemaType.OBJECT, // Parameters é sempre um objeto por padrão
                properties: {},
                required: []
            },
            function: undefined // Função será definida com setFunction()
        };
    }

    /**
     * Método estático para criar uma nova instância de ToolBuilder.
     * @param {string} name - Nome da ferramenta.
     * @param {string} description - Descrição da ferramenta.
     * @returns {ToolBuilder} Nova instância de ToolBuilder.
     */
    static createTool(name, description) {
        return new ToolBuilder(name, description);
    }

    /**
     * Adiciona um parâmetro à definição da ferramenta.
     * @param {string} name - Nome do parâmetro.
     * @param {string} type - Tipo do parâmetro (string, number, boolean, object, array, null).
     * @param {string} description - Descrição do parâmetro.
     * @param {Object} options - Opções adicionais para o parâmetro (enum, required, items, properties).
     * @returns {ToolBuilder} A instância atual para encadeamento.
     * @throws {Error} Se name, type ou description não forem fornecidos.
     */
    addParameter(name, type, description, options = {}) {
        if (!name) {
            throw new Error("Parameter name is required.");
        }
        if (!type) {
            throw new Error("Parameter type is required.");
        }
        if (!description) {
            throw new Error("Parameter description is required.");
        }

        let schemaType;
        try {
            schemaType = this.convertTypeToSchemaType(type); // Validar o tipo
        } catch (error) {
            throw new Error(`Invalid parameter type '${type}': ${error.message}`);
        }

        // Cria uma cópia das opções sem a propriedade 'required'
        const { required, ...otherOptions } = options;

        this.toolDefinition.parameters.properties[name] = {
            type: schemaType,
            description: description,
            ...otherOptions // Adiciona outras opções (enum, items, properties para nested objects)
        };

        if (required === true) {
            this.setParameterRequired(name); // Usa o método setParameterRequired para manter a consistência
        }


        return this; // Permite encadeamento
    }

    /**
     * Define um parâmetro como obrigatório.
     * @param {string} parameterName - Nome do parâmetro a ser marcado como obrigatório.
     * @returns {ToolBuilder} A instância atual para encadeamento.
     * @throws {Error} Se o parâmetro não existir na definição da ferramenta.
     */
    setParameterRequired(parameterName) {
        if (!this.toolDefinition.parameters.properties[parameterName]) {
            throw new Error(`Parameter '${parameterName}' not found in tool definition.`);
        }
        if (!this.toolDefinition.parameters.required.includes(parameterName)) {
            this.toolDefinition.parameters.required.push(parameterName);
        }
        return this; // Permite encadeamento
    }

    /**
     * Adiciona valores enum a um parâmetro.
     * @param {string} parameterName - Nome do parâmetro.
     * @param {Array} enumValues - Array de valores enum.
     * @returns {ToolBuilder} A instância atual para encadeamento.
     * @throws {Error} Se o parâmetro não existir ou enumValues não for um array.
     */
    addEnumToParameter(parameterName, enumValues) {
        if (!this.toolDefinition.parameters.properties[parameterName]) {
            throw new Error(`Parameter '${parameterName}' not found in tool definition.`);
        }
        if (!Array.isArray(enumValues)) {
            throw new Error("Enum values must be an array.");
        }
        this.toolDefinition.parameters.properties[parameterName].enum = enumValues;
        return this; // Permite encadeamento
    }

    /**
     * Define a função de implementação da ferramenta.
     * @param {Function} functionReference - Referência para a função de implementação.
     * @returns {ToolBuilder} A instância atual para encadeamento.
     * @throws {Error} Se functionReference não for uma função.
     */
    setFunction(functionReference) {
        if (typeof functionReference !== 'function') {
            throw new Error("Function reference must be a JavaScript function.");
        }
        this.toolDefinition.function = functionReference;
        return this; // Permite encadeamento
    }

    /**
     * Constrói e retorna o objeto final de definição da ferramenta.
     * @returns {Object} Objeto de definição da ferramenta.
     * @throws {Error} Se a função da ferramenta não estiver definida.
     */
    build() {
        if (!this.toolDefinition.function) {
            throw new Error("Tool function is not defined. Call setFunction() to provide the function implementation.");
        }
        return this.toolDefinition;
    }

    /**
     * Cria uma factory function que permite instanciar a ferramenta com configurações personalizadas.
     * @param {Object} defaultConfig - Configurações padrão para a ferramenta.
     * @returns {Function} Uma função factory que aceita configurações e retorna uma instância da ferramenta.
     * @throws {Error} Se a função da ferramenta não estiver definida.
     */
    createFactory(defaultConfig = {}) {
        if (!this.toolDefinition.function) {
            throw new Error("Tool function is not defined. Call setFunction() to provide the function implementation.");
        }
        
        const toolDefinition = { ...this.toolDefinition };
        const originalFunction = toolDefinition.function;
        
        // Retorna uma função factory que cria instâncias da ferramenta
        return (config = {}) => {
            // Mesclar configurações padrão com as fornecidas
            const mergedConfig = { ...defaultConfig, ...config };
            
            // Criar uma nova instância da tool com a função modificada
            const toolInstance = { ...toolDefinition };
            
            // Modificar a função para usar as configurações
            toolInstance.function = async (args) => {
                // Mesclar argumentos com configurações, priorizando os argumentos passados na chamada
                const mergedArgs = { ...mergedConfig, ...args };
                return await originalFunction(mergedArgs);
            };
            
            return toolInstance;
        };
    }

    /**
     * Converte uma string de tipo para o enum FunctionDeclarationSchemaType.
     * @param {string|FunctionDeclarationSchemaType} type - Tipo a ser convertido.
     * @returns {FunctionDeclarationSchemaType} Tipo convertido.
     * @throws {Error} Se o tipo não for suportado.
     */
    convertTypeToSchemaType(type) {
        // Converte string type para FunctionDeclarationSchemaType enum
        const typeStr = typeof type === 'string' ? type.toUpperCase() : type;

        switch (typeStr) {
            case 'STRING':
            case 'string':
                return FunctionDeclarationSchemaType.STRING;
            case 'NUMBER':
            case 'number':
                return FunctionDeclarationSchemaType.NUMBER;
            case 'BOOLEAN':
            case 'boolean':
                return FunctionDeclarationSchemaType.BOOLEAN;
            case 'OBJECT':
            case 'object':
                return FunctionDeclarationSchemaType.OBJECT;
            case 'ARRAY':
            case 'array':
                return FunctionDeclarationSchemaType.ARRAY;
            case 'NULL':
            case 'null':
                return FunctionDeclarationSchemaType.NULL;
            default:
                throw new Error(`Unsupported parameter type: '${type}'.`);
        }
    }
}

module.exports = ToolBuilder;
