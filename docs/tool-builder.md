Implementação da classe `ToolBuilder` como uma opção adicional para a construção de tools.

**Implementando a Classe `ToolBuilder`**

**Passo 1: Criar o arquivo `tool-builder.js`**

Crie um novo arquivo chamado `tool-builder.js` na pasta `gemini-chain-lib` (ou na pasta onde você está organizando os arquivos da biblioteca) e copie e cole o seguinte código:

```javascript
// tool-builder.js
const FunctionDeclarationSchemaType = require('./function-declaration-schema-type'); // Importe o enum de tipos

class ToolBuilder {
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

    static createTool(name, description) {
        return new ToolBuilder(name, description);
    }

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


        this.toolDefinition.parameters.properties[name] = {
            type: schemaType,
            description: description,
            ...options // Adiciona outras opções (enum, items, properties para nested objects)
        };

        if (options.required === true) {
            this.setParameterRequired(name); // Usa o método setParameterRequired para manter a consistência
        }


        return this; // Permite encadeamento
    }

    setParameterRequired(parameterName) {
        if (!this.toolDefinition.parameters.properties[parameterName]) {
            throw new Error(`Parameter '${parameterName}' not found in tool definition.`);
        }
        if (!this.toolDefinition.parameters.required.includes(parameterName)) {
            this.toolDefinition.parameters.required.push(parameterName);
        }
        return this; // Permite encadeamento
    }

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


    setFunction(functionReference) {
        if (typeof functionReference !== 'function') {
            throw new Error("Function reference must be a JavaScript function.");
        }
        this.toolDefinition.function = functionReference;
        return this; // Permite encadeamento
    }

    build() {
        if (!this.toolDefinition.function) {
            throw new Error("Tool function is not defined. Call setFunction() to provide the function implementation.");
        }
        return this.toolDefinition;
    }


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
```

**Explicação do Código `ToolBuilder`:**

*   **Import `FunctionDeclarationSchemaType`:** Importa o enum `FunctionDeclarationSchemaType` (assumindo que você já tem ou irá criar este enum para representar os tipos de schema - se não tiver, podemos simplificar para strings por enquanto, mas usar um enum é mais organizado e evita erros de digitação).
*   **Construtor (`constructor(name, description)`):**
    *   Recebe `name` e `description` como argumentos obrigatórios.
    *   Inicializa `this.toolDefinition` com as propriedades básicas: `name`, `description`, `parameters` (inicializado como um objeto com `type: "object"`, `properties: {}`, `required: []`), e `function: undefined`.
*   **`static createTool(name, description)`:** Método estático factory para criar uma instância de `ToolBuilder`. Facilita a criação do builder: `ToolBuilder.createTool(...)`.
*   **`addParameter(name, type, description, options = {})`:**
    *   Adiciona um parâmetro à definição da tool.
    *   Recebe `name`, `type`, `description` como obrigatórios.
    *   `options` é um objeto opcional para propriedades extras (`enum`, `required`, `items`, `properties`).
    *   Valida se `type` é um tipo suportado usando `this.convertTypeToSchemaType(type)`.
    *   Adiciona a definição do parâmetro em `this.toolDefinition.parameters.properties[name]`.
    *   Se `options.required` for `true`, chama `this.setParameterRequired(name)` para adicionar o parâmetro à lista de `required`.
    *   Retorna `this` para permitir o encadeamento de métodos.
*   **`setParameterRequired(parameterName)`:** Marca um parâmetro como obrigatório. Adiciona o `parameterName` ao array `this.toolDefinition.parameters.required`.
*   **`addEnumToParameter(parameterName, enumValues)`:** Adiciona valores `enum` a um parâmetro.
*   **`setFunction(functionReference)`:** Define a função JavaScript da tool. Valida se `functionReference` é realmente uma função.
*   **`build()`:**
    *   Constrói e retorna o objeto final de definição da tool (`this.toolDefinition`).
    *   Verifica se a função da tool foi definida (`this.toolDefinition.function`). Se não, lança um erro, pois a função é obrigatória.
*   **`convertTypeToSchemaType(type)`:**  Função auxiliar (similar à que já temos na classe `Agent`) para converter strings de tipo (ex: `"string"`, `"number"`) para o enum `FunctionDeclarationSchemaType` (ou para strings uppercase se você não quiser usar enum no momento). Se o tipo não for suportado, lança um erro.

**Passo 2: Criar o enum `FunctionDeclarationSchemaType` (se ainda não existir)**

Se você já não tiver um arquivo `function-declaration-schema-type.js` com a definição do enum de tipos, crie este arquivo na mesma pasta e adicione o seguinte código:

```javascript
// function-declaration-schema-type.js
const FunctionDeclarationSchemaType = {
    STRING: 'STRING',
    NUMBER: 'NUMBER',
    BOOLEAN: 'BOOLEAN',
    OBJECT: 'OBJECT',
    ARRAY: 'ARRAY',
    NULL: 'NULL',
    ANY: 'ANY' // Ou pode remover ANY se não quiser explicitar um tipo "genérico"
};

module.exports = FunctionDeclarationSchemaType;
```

**Passo 3: Atualizar `test-vertex-multiple-functions.js` para usar `ToolBuilder`**

Agora, modifique o arquivo `test-vertex-multiple-functions.js` para usar a classe `ToolBuilder` para definir *algumas* das tools (mantenha algumas tools definidas no formato de objeto JavaScript direto para comparação).

Exemplo de como você pode modificar a definição da `weatherTool` e `restaurantTool` em `test-vertex-multiple-functions.js` para usar `ToolBuilder`:

```javascript
// ... (imports e configuração inicial) ...
const ToolBuilder = require('./gemini-chain-lib/tool-builder'); // Importe ToolBuilder

// ... (funções weatherFunction e restaurantFunction - mantenha-as como estão) ...


console.log("Definindo as ferramentas usando ToolBuilder...");

// Definir as ferramentas usando ToolBuilder
const weatherTool = ToolBuilder.createTool("get_weather", "Obtém informações meteorológicas...")
    .addParameter("location", "string", "Nome da cidade ou localização", { required: true })
    .addParameter("unit", "string", "Unidade de temperatura (opcional)", { enum: ["celsius", "fahrenheit"] })
    .setFunction(weatherFunction)
    .build();


const restaurantTool = ToolBuilder.createTool("search_restaurants", "Pesquisa restaurantes em uma determinada localização")
    .addParameter("location", "string", "Nome da cidade ou localização", { required: true })
    .addParameter("cuisine", "string", "Tipo de culinária (opcional)")
    .addParameter("price_range", "string", "Faixa de preço (opcional)", { enum: ["barato", "médio", "caro"] })
    .addParameter("limit", "number", "Número máximo de resultados (opcional)")
    .setFunction(restaurantFunction)
    .build();


// Array de tools (agora usando as tools definidas com ToolBuilder)
const tools = [
    weatherTool,
    restaurantTool
];

// ... (restante do código testVertexMultipleFunctions, instanciando Agent e executando tarefas) ...
```

**Passo 4: Execute `test-vertex-multiple-functions.js`**

Execute o arquivo `test-vertex-multiple-functions.js` para verificar se as tools definidas com `ToolBuilder` estão funcionando corretamente e se não há erros.

**Próximos Passos:**

1.  Após implementar a classe `ToolBuilder` e atualizar o `test-vertex-multiple-functions.js`, **teste cuidadosamente e verifique se tudo funciona como esperado.**
2.  **Documente a classe `ToolBuilder` na documentação.** Explique como usá-la, seus métodos, e forneça exemplos de código na documentação para mostrar como definir tools com `ToolBuilder`.
3.  **Colete feedback:** Se possível, peça a outros desenvolvedores para experimentar a classe `ToolBuilder` e coletar feedback sobre se ela realmente facilita a criação de tools e se é útil.
