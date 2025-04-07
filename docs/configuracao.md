# Configuração do Ambiente (.env)

Este documento detalha a configuração necessária do arquivo `.env` para utilizar corretamente a biblioteca `gemini-agent-lib`.

## Importância do Arquivo .env

O arquivo `.env` é **essencial** para o funcionamento da biblioteca, pois contém as chaves de API e configurações necessárias para acessar os serviços do Google AI (Gemini) e Google Cloud Vertex AI. Sem estas configurações, a biblioteca não conseguirá se conectar aos modelos de IA.

## Configuração Básica

1. **Instale o pacote dotenv**:
   ```bash
   npm install dotenv
   ```

2. **Crie um arquivo `.env` na raiz do seu projeto** com as variáveis necessárias.

3. **Carregue o dotenv no início do seu aplicativo**:
   ```javascript
   require('dotenv').config();
   ```

4. **Adicione o arquivo `.env` ao seu `.gitignore`** para evitar o compartilhamento acidental de chaves de API:
   ```
   # .gitignore
   .env
   ```

## Variáveis de Ambiente Necessárias

Abaixo está um template completo do arquivo `.env` com todas as variáveis possíveis:

```
# Chave de API do Gemini (obrigatória para usar modelos Gemini)
GEMINI_API_KEY=sua_chave_api_gemini

# Configurações do Google Cloud e Vertex AI (necessárias para usar modelos Vertex AI)
VERTEX_API_KEY=sua_chave_api_vertex
GOOGLE_CLOUD_PROJECT_ID=seu_id_projeto_gcp
VERTEX_PROJECT_ID=seu_id_projeto_vertex
VERTEX_LOCATION=regiao_vertex
# VERTEX_CREDENTIALS_PATH foi removido para padronização
GOOGLE_APPLICATION_CREDENTIALS=./caminho_para_arquivo_credenciais.json
```

## Explicação Detalhada das Variáveis

### GEMINI_API_KEY
**Descrição**: Sua chave de API pessoal para acessar os modelos Generative AI do Google (Gemini).  
**Obrigatoriedade**: Essencial para interagir com modelos como `gemini-1.0-pro`.  
**Como obter**: Acesse o [Google AI Studio](https://aistudio.google.com/app/apikey), crie uma conta se necessário, e gere uma chave de API.

### VERTEX_API_KEY
**Descrição**: Chave de API específica para interagir com serviços da plataforma Vertex AI.  
**Obrigatoriedade**: Necessária apenas se você estiver usando autenticação por API Key com Vertex AI.  
**Observação**: Na maioria dos casos, a autenticação via conta de serviço (arquivo JSON) é preferível e mais segura.

### GOOGLE_CLOUD_PROJECT_ID
**Descrição**: O identificador único do seu projeto no Google Cloud Platform.  
**Obrigatoriedade**: Necessário para associar o uso das APIs Vertex AI ao seu projeto GCP.  
**Como obter**: Acesse o [Console do Google Cloud](https://console.cloud.google.com/), selecione ou crie um projeto, e copie o ID do projeto.

### VERTEX_PROJECT_ID
**Descrição**: O ID do projeto Google Cloud especificamente configurado para usar a Vertex AI.  
**Obrigatoriedade**: Necessário para operações com Vertex AI.  
**Observação**: Frequentemente, é o mesmo que `GOOGLE_CLOUD_PROJECT_ID`.

### VERTEX_LOCATION
**Descrição**: A região geográfica do Google Cloud onde seus recursos da Vertex AI estão hospedados.  
**Obrigatoriedade**: Necessário para operações com Vertex AI.  
**Valores comuns**: `us-central1`, `europe-west4`, `asia-east1`.  
**Observação**: Escolha a região mais próxima de seus usuários ou que atenda aos requisitos de residência de dados.

### GOOGLE_APPLICATION_CREDENTIALS
**Descrição**: Variável de ambiente padrão que as bibliotecas do Google Cloud usam para encontrar automaticamente as credenciais de autenticação. O caminho no seu sistema de arquivos para o arquivo JSON contendo a chave da conta de serviço do Google Cloud.  
**Obrigatoriedade**: Necessário para autenticação segura com as APIs do GCP/Vertex AI.  
**Como obter**:
1. Acesse o [Console do Google Cloud](https://console.cloud.google.com/)
2. Navegue até "IAM & Admin" > "Service Accounts"
3. Crie uma nova conta de serviço ou selecione uma existente
4. Adicione as permissões necessárias (pelo menos "Vertex AI User")
5. Crie uma chave para esta conta de serviço (formato JSON)
6. Faça o download do arquivo JSON e salve-o em um local seguro no seu projeto

## Configuração Mínima

Se você estiver usando apenas os modelos Gemini (não Vertex AI), a configuração mínima necessária é:

```
GEMINI_API_KEY=sua_chave_api_gemini
```

## Configuração para Vertex AI

Se você estiver usando modelos do Vertex AI, precisará das seguintes variáveis:

```
GOOGLE_CLOUD_PROJECT_ID=seu_id_projeto_gcp
VERTEX_PROJECT_ID=seu_id_projeto_vertex
VERTEX_LOCATION=regiao_vertex
GOOGLE_APPLICATION_CREDENTIALS=./caminho_para_arquivo_credenciais.json
```

## Segurança

**IMPORTANTE**: Nunca compartilhe seu arquivo `.env` ou suas chaves de API. Estas chaves dão acesso aos serviços do Google em seu nome e podem resultar em cobranças em sua conta.
