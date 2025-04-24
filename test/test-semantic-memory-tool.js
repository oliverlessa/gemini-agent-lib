const assert = require('assert');
const SemanticMemoryTool = require('../lib/tools/semantic-memory-tool');
const SemanticMemory = require('../lib/memory/semantic-memory');
const FunctionDeclarationSchemaType = require('../lib/function-declaration-schema-type');

// Mock da classe SemanticMemory para testes
class MockSemanticMemory extends SemanticMemory {
    constructor() {
        super(); // Chama construtor da classe base abstrata (necessário para instanceof)
        this.initCalled = false;
        this.searchCalledWith = null;
        this.shouldThrowOnInit = false;
        this.shouldThrowOnSearch = false;
        this.searchResults = [];
    }

    async init() {
        this.initCalled = true;
        if (this.shouldThrowOnInit) {
            throw new Error("Mock init error");
        }
    }

    async search(query, k, filter) {
        this.searchCalledWith = { query, k, filter };
        if (this.shouldThrowOnSearch) {
            throw new Error("Mock search error");
        }
        // Retorna cópia para evitar modificação externa
        return JSON.parse(JSON.stringify(this.searchResults));
    }

    // Métodos não usados no teste, mas necessários para estender a classe abstrata
    async add(documents) { throw new Error("Not implemented in mock"); }
    async delete(ids) { throw new Error("Not implemented in mock"); }
}

describe('SemanticMemoryTool', () => {
    let mockMemory;
    let tool;

    beforeEach(() => {
        // Cria uma nova instância mock antes de cada teste
        mockMemory = new MockSemanticMemory();
        tool = new SemanticMemoryTool({ semanticMemory: mockMemory });
    });

    describe('constructor', () => {
        it('deve instanciar corretamente com uma SemanticMemory válida', () => {
            assert.ok(tool instanceof SemanticMemoryTool);
        });

        it('deve lançar erro se semanticMemory não for fornecida', () => {
            assert.throws(() => {
                new SemanticMemoryTool({});
            }, /A configuração 'semanticMemory' é obrigatória/);
        });

        it('deve lançar erro se semanticMemory não for instância de SemanticMemory', () => {
            assert.throws(() => {
                new SemanticMemoryTool({ semanticMemory: {} }); // Passando objeto vazio
            }, /deve ser uma instância de SemanticMemory/);
        });
    });

    describe('getToolDeclaration', () => {
        it('deve retornar a declaração da ferramenta no formato correto', () => {
            const declaration = tool.getToolDeclaration();
            assert.strictEqual(declaration.name, 'semantic_memory_search');
            assert.ok(declaration.description);
            assert.deepStrictEqual(declaration.parameters.type, FunctionDeclarationSchemaType.OBJECT);
            assert.ok(declaration.parameters.properties.query);
            assert.strictEqual(declaration.parameters.properties.query.type, FunctionDeclarationSchemaType.STRING);
            assert.ok(declaration.parameters.properties.k);
            assert.strictEqual(declaration.parameters.properties.k.type, FunctionDeclarationSchemaType.NUMBER);
            assert.ok(declaration.parameters.properties.filter);
            assert.strictEqual(declaration.parameters.properties.filter.type, FunctionDeclarationSchemaType.OBJECT);
            assert.deepStrictEqual(declaration.parameters.required, ['query']);
        });
    });

    describe('execute', () => {
        it('deve retornar erro se query não for fornecida', async () => {
            const result = await tool.execute({}); // Sem query
            assert.match(result, /Erro: O parâmetro 'query' é obrigatório/);
        });

        it('deve chamar search na memória com os parâmetros corretos e formatar resultados', async () => {
            mockMemory.searchResults = [
                { id: 'doc1', content: 'Conteúdo do doc 1', metadata: { source: 'file1.txt' }, score: 0.9 },
                { id: 'doc2', content: 'Conteúdo do doc 2', metadata: {}, score: 0.85 } // Sem metadados
            ];
            const query = "teste de busca";
            const k = 2;
            const filter = { type: 'test' };

            const result = await tool.execute({ query, k, filter });

            assert.deepStrictEqual(mockMemory.searchCalledWith, { query, k, filter });
            assert.match(result, /Resultados da busca na memória semântica para "teste de busca":/);
            assert.match(result, /Resultado 1: \[Score: 0\.9000\]\nConteúdo: Conteúdo do doc 1 \(Metadados: {"source":"file1\.txt"}\)/);
            assert.match(result, /---\n\nResultado 2: \[Score: 0\.8500\]\nConteúdo: Conteúdo do doc 2/); // Verifica que não adiciona metadados vazios
        });

         it('deve usar k padrão = 3 se não for fornecido', async () => {
            const query = "teste k padrão";
            await tool.execute({ query });
            assert.strictEqual(mockMemory.searchCalledWith.k, 3);
         });

        it('deve retornar mensagem específica se nenhum resultado for encontrado', async () => {
            mockMemory.searchResults = []; // Nenhum resultado
            const result = await tool.execute({ query: "busca sem resultado" });
            assert.match(result, /Nenhuma informação relevante encontrada/);
        });

        it('deve retornar mensagem de erro se search falhar', async () => {
            mockMemory.shouldThrowOnSearch = true;
            const result = await tool.execute({ query: "busca com erro" });
            assert.match(result, /Erro ao realizar a busca na memória semântica/);
            // Poderíamos também verificar se console.error foi chamado, se tivéssemos um spy/stub
        });

        it('deve chamar init da memória apenas na primeira execução (lazy initialization)', async () => {
            assert.strictEqual(mockMemory.initCalled, false); // Não chamado ainda

            // Primeira execução
            await tool.execute({ query: "primeira busca" });
            assert.strictEqual(mockMemory.initCalled, true); // Deve ter chamado init
            assert.ok(mockMemory.searchCalledWith); // E search

            // Resetar para verificar a segunda chamada
            mockMemory.initCalled = false; // Resetar flag do mock manualmente para o teste
            mockMemory.searchCalledWith = null;

            // Segunda execução
            await tool.execute({ query: "segunda busca" });
            assert.strictEqual(mockMemory.initCalled, false); // NÃO deve ter chamado init novamente
            assert.ok(mockMemory.searchCalledWith); // Mas deve ter chamado search
        });

        it('deve retornar erro se init falhar', async () => {
            mockMemory.shouldThrowOnInit = true;
            const result = await tool.execute({ query: "busca com erro no init" });
            assert.match(result, /Erro ao realizar a busca na memória semântica/); // A mensagem de erro genérica é retornada
            assert.strictEqual(mockMemory.initCalled, true); // Tentou chamar init
            assert.strictEqual(mockMemory.searchCalledWith, null); // Não chegou a chamar search
        });

         it('deve passar filtro undefined se não for fornecido', async () => {
            const query = "teste sem filtro";
            await tool.execute({ query });
            assert.strictEqual(mockMemory.searchCalledWith.filter, undefined);
         });
    });
});
