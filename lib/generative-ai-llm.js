const { GoogleGenerativeAI } = require("@google/generative-ai");

class GenerativeAILLM {
    constructor({ apiKey, modelName = "gemini-2.0-flash", mode = "oneshot", generationConfig = {} }) {
        if (!apiKey) {
            throw new Error("API Key do Gemini não fornecida.");
        }
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.modelName = modelName;
        this.generationConfig = generationConfig;
        this.model = this.genAI.getGenerativeModel({ 
            model: this.modelName,
            generationConfig: this.generationConfig
        });
        this.mode = mode; // 'oneshot' or 'chat'
    }

    async generateContent({ prompt, tools, context, history }) {
        try {
            const safetySettings = [ // Configurações de segurança padrão - você pode ajustar
                {
                    category: "HARM_CATEGORY_HARASSMENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_HATE_SPEECH",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
                {
                    category: "HARM_CATEGORY_DANGEROUS_CONTENT",
                    threshold: "BLOCK_MEDIUM_AND_ABOVE"
                },
            ];

            let contents = [];

            if (this.mode === 'chat' && history && Array.isArray(history)) {
                contents = [...history]; // Add history messages first
            }

            // Adiciona o prompt do usuário com contexto se fornecido
            let promptText = prompt;
            if (context) {
                promptText = `${context}\n\n${prompt}`;
            }
            contents.push({ role: "user", parts: [{ text: promptText }] }); // Add current user prompt

            let request = {
                generationConfig: this.generationConfig,
                safetySettings,
                contents: contents
            };

            if (tools && tools.length > 0) {
                request.tools = tools; // Adiciona tools ao request se fornecidas
            }

            const result = await this.model.generateContent(request);
            const response = result.response; // Pega a resposta da API

            if (!response || !response.candidates || response.candidates.length === 0) {
                return { text: "Resposta vazia ou inválida da API Gemini." }; // Trata resposta vazia
            }

            const candidate = response.candidates[0]; // Pega o primeiro candidato (resposta)
            const content = candidate.content;

            if (!content || !content.parts || content.parts.length === 0) {
                return { text: "Resposta de texto vazia da API Gemini." }; // Trata parte de texto vazia
            }

            // Combina o texto de todos os elementos do array parts que possuem a propriedade text
            const text = content.parts
                .filter(part => part.text !== undefined)
                .map(part => part.text)
                .join('\n');

            if (candidate.functionCall) {
                return { functionCall: candidate.functionCall, text: text }; // Retorna functionCall se presente
            } else {
                return { text: text }; // Retorna apenas o texto se não for functionCall
            }


        } catch (error) {
            console.error(`Erro na chamada à API Gemini (${this.modelName}, mode: ${this.mode}):`, error);
            // Adaptação para retornar um objeto de resposta similar ao LLMMock em caso de erro
            return { text: `Erro ao comunicar com a API Gemini (${this.modelName}, mode: ${this.mode}): ${error.message}` };
        }
    }
}

module.exports = GenerativeAILLM;
