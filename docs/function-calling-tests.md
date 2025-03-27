# Testes de Function Calling com Vertex AI

Este repositório contém scripts para testar a funcionalidade de function calling (chamada de função) usando o Vertex AI da Google Cloud através da biblioteca `gemini-chain-lib`.

## Arquivos de Teste

1. **test-vertex-function-calling.js**: Teste completo com múltiplas ferramentas (getWeather, searchDatabase, calculateStatistics)
2. **test-vertex-function-calling-simple.js**: Teste simplificado com uma única ferramenta (getDadosFicticios)

## Pré-requisitos

Para executar estes testes, você precisa:

1. Uma conta no Google Cloud com acesso ao Vertex AI
2. Um projeto configurado no Google Cloud
3. Credenciais de autenticação (API Key ou arquivo de credenciais)
4. Node.js instalado em seu ambiente

## Configuração

1. Clone este repositório (se ainda não o fez)
2. Instale as dependências:
   ```
   npm install
   ```
3. Configure as variáveis de ambiente necessárias em um arquivo `.env` na raiz do projeto:

```
# Credenciais do Vertex AI
VERTEX_API_KEY=sua_api_key_aqui
# OU
VERTEX_CREDENTIALS_PATH=/caminho/para/seu/arquivo-de-credenciais.json

# Configurações do Projeto
VERTEX_PROJECT_ID=seu_project_id_do_google_cloud
VERTEX_LOCATION=us-central1
```

## Executando os Testes

### Teste Completo

Para executar o teste completo com múltiplas ferramentas:

```
node test-vertex-function-calling.js
```

Este teste executará várias tarefas que incentivam o LLM a usar diferentes ferramentas:
- Consulta de clima
- Pesquisa em banco de dados
- Cálculo de estatísticas

### Teste Simplificado

Para executar o teste simplificado com uma única ferramenta:

```
node test-vertex-function-calling-simple.js
```

Este teste usa uma única ferramenta `getDadosFicticios` que retorna diferentes tipos de dados fictícios dependendo da consulta.

## Como Funciona

1. Os scripts criam uma instância de `VertexAILLM` com suas credenciais
2. Definem uma ou mais ferramentas (tools) que podem ser chamadas pelo LLM
3. Criam um agente que usa o LLM e as ferramentas
4. Executam várias tarefas que incentivam o LLM a usar as ferramentas
5. Exibem as respostas do agente

## Estrutura das Ferramentas

Cada ferramenta (tool) é definida com:

1. **name**: Nome da função que o LLM pode chamar
2. **description**: Descrição do que a função faz
3. **parameters**: Esquema dos parâmetros que a função aceita
4. **function**: A implementação real da função que será executada quando chamada

## Observações

- Todos os dados retornados pelas ferramentas são fictícios e gerados aleatoriamente
- Os testes podem ser adaptados para usar diferentes modelos do Vertex AI
- É possível adicionar novas ferramentas ou modificar as existentes conforme necessário

## Solução de Problemas

Se encontrar erros ao executar os testes:

1. Verifique se as credenciais do Vertex AI estão corretas
2. Confirme se o projeto e a localização estão configurados corretamente
3. Verifique se o modelo especificado está disponível em sua conta
4. Certifique-se de que todas as dependências estão instaladas

## Recursos Adicionais

- [Documentação do Vertex AI](https://cloud.google.com/vertex-ai/docs)
- [Documentação do Gemini API](https://cloud.google.com/vertex-ai/docs/generative-ai/model-reference/gemini)
- [Function Calling no Vertex AI](https://cloud.google.com/vertex-ai/docs/generative-ai/multimodal/function-calling)
