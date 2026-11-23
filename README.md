# desafio-enviepro
Desafio EnvieProV2
# Desafio EnviePro — CRM

Sistema de CRM construído com IA para o Desafio EnviePro.

- **Front-end:** Next.js + React (TypeScript, App Router) — pasta `frontend/`
- **Back-end:** Go + Gin — pasta `backend/`
- **Banco de dados:** SQLite (driver `modernc.org/sqlite`, sem necessidade de compilador C)

O sistema tem sidebar retrátil, painel de CRM (clientes, funil de vendas e resumo de vendas) e visual glassmorphism. Todos os dados vêm do banco SQLite.

## Pré-requisitos

Instale e confirme as versões no terminal:

| Programa | Download | Teste |
|----------|----------|-------|
| Git | https://git-scm.com/downloads | `git --version` |
| Node.js (versão LTS) | https://nodejs.org | `node -v` e `npm -v` |
| Go | https://go.dev/dl/ | `go version` |

Depois de instalar, feche e abra o terminal novamente.

## 1. Baixar o projeto

```bash
git clone https://github.com/victor4710hugo-rgb/desafio-enviepro.git
cd desafio-enviepro
```

## 2. Rodar o back-end (terminal 1)

```bash
cd backend
go mod tidy
go run .
```

- A API sobe em **http://localhost:8080**.
- O arquivo `crm.db` **não vem no repositório**: ele é criado automaticamente na primeira execução, e o próprio back-end insere os dados fictícios (20 clientes, oportunidades e vendas) quando o banco está vazio.
- Para gerar os dados novamente, pare o servidor, apague `backend/crm.db` e rode `go run .` de novo.

Teste no navegador:

- http://localhost:8080/health
- http://localhost:8080/clientes
- http://localhost:8080/funil
- http://localhost:8080/vendas/resumo
- http://localhost:8080/vendas

## 3. Rodar o front-end (terminal 2)

Abra um **segundo** terminal na raiz do projeto:

```bash
cd frontend
npm install
npm run dev
```

Abra **http://localhost:3000** no navegador. O back-end precisa estar rodando.

Se a API estiver em outro endereço, crie `frontend/.env.local` com:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Rotas da API

| Rota | O que devolve |
|------|---------------|
| `GET /health` | Status da API |
| `GET /clientes` | Lista de clientes |
| `GET /funil` | Quantidade e valor por etapa do funil |
| `GET /oportunidades` | Lista de oportunidades |
| `GET /vendas/resumo` | Total, quantidade e ticket médio do mês |
| `GET /vendas` | Lista de vendas |

## Estrutura

```
desafio-enviepro/
├── frontend/      Next.js (páginas, sidebar, painel)
├── backend/       Go + Gin (main.go = API, seed.go = dados fictícios)
├── prompts.json   Todos os prompts usados, em ordem
├── RELATORIO.md   Relatório do desafio
└── README.md
```

## Problemas comuns

- **`comando não reconhecido` (git, node, go):** o programa não entrou no PATH. Reinicie o computador ou reinstale marcando a opção de adicionar ao PATH.
- **Tela do front sem dados / erro de conexão:** confirme que o back-end está rodando em `localhost:8080`.
- **Porta ocupada:** feche o programa que usa a porta 3000 ou 8080.