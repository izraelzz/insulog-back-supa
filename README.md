# Insulog Back Supa

API backend do projeto Insulog, construída com Node.js + Express e PostgreSQL/Supabase.

## Requisitos

- Node.js 18 ou superior
- npm
- Banco PostgreSQL acessível (pode ser Supabase ou PostgreSQL local)

## Instalação

1. Clone o projeto e entre na pasta:

```bash
cd insulog-back-supa
```

2. Instale as dependências:

```bash
npm install
```

3. Configure as variáveis de ambiente.

Crie o arquivo .env na pasta do projeto e coloque:

```env
DATABASE_URL=postgresql://postgres:senha@host:5432/postgres
PORT=3000
```

## Como iniciar o projeto

Na raiz do projeto, execute:

```bash
node src/server.js
```

Se tudo estiver correto, a API irá iniciar e exibirá uma mensagem semelhante a:

```bash
Servidor rodando em http://localhost:3000
```

A aplicação também tenta validar a conexão com o banco ao subir.

## Endpoints principais

A API expõe endpoints como:

- `/` — health check
- `/usuarios`
- `/tipos-insulina`
- `/periodos`
- `/registros-glicose`
- `/registros-insulina`
- `/exportacoes`
- `/configuracoes`
- `/alarmes`

## Observações

- O servidor usa `src/server.js` como ponto de entrada.
- A aplicação escuta na porta definida em `PORT` ou, se não houver, usa `3000`.
- O projeto usa `dotenv` para carregar variáveis do arquivo `.env` automaticamente.

## Troubleshooting

Se a aplicação não subir:

1. Verifique se o Node.js está instalado corretamente.
2. Confirme se o arquivo `.env` existe e está preenchido.
3. Verifique se o banco está acessível e a URL/credenciais estão corretas.
4. Rode novamente:

```bash
npm install
node src/server.js
```
