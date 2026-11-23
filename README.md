# Desafio EnviePro — CRM

CRM construído com inteligência artificial para o Desafio EnviePro.

| Camada | Tecnologia | Pasta |
|--------|------------|-------|
| Front-end | Next.js 16 + React 19 + TypeScript + Tailwind CSS 4 | `frontend/` |
| Back-end | Go + Gin | `backend/` |
| Banco de dados | SQLite (driver `modernc.org/sqlite`, sem compilador C) | `backend/crm.db` (gerado ao rodar) |

## O que o sistema tem

- **Sidebar retrátil** em visual glassmorphism: recolhe e expande no computador e vira menu por cima da tela no celular.
- **Início:** página de boas-vindas.
- **CRM:** cards de indicadores, funil de vendas por etapa e tabela de clientes com busca por nome e filtro por status. Clientes sem contato há mais de 15 dias aparecem em vermelho.
- **Clientes, Funil e Vendas:** telas de detalhe de cada área.
- **Dados do banco:** tudo o que aparece na tela vem do SQLite, por meio da API em Go.

## Pré-requisitos

Instale e confirme as versões em um terminal novo:

| Programa | Download | Teste |
|----------|----------|-------|
| Git | https://git-scm.com/downloads | `git --version` |
| Node.js (versão LTS) | https://nodejs.org | `node -v` e `npm -v` |
| Go | https://go.dev/dl/ | `go version` |

Depois de instalar cada programa, feche e abra o terminal de novo.

## 1. Baixar o projeto

```powershell
git clone https://github.com/victor4710hugo-rgb/desafio-enviepro.git
cd desafio-enviepro
```

## 2. Rodar o back-end (terminal 1)

```powershell
cd backend
go mod tidy
go run .
```

- A API sobe em **http://localhost:8080**.
- O `crm.db` **não vem no repositório**. Ele é criado na primeira execução e, se estiver vazio, o próprio back-end insere os dados fictícios (20 clientes, 30 oportunidades e 25 vendas). Não é preciso rodar nenhum comando de seed.
- Para gerar os dados de novo: pare o servidor (`Ctrl+C`), apague `backend/crm.db` e rode `go run .` outra vez.
- O resumo de vendas considera o **mês atual**. Se o banco foi criado em outro mês, apague o `crm.db` para gerar dados novos.

Confira no navegador:

- http://localhost:8080/health
- http://localhost:8080/clientes
- http://localhost:8080/funil
- http://localhost:8080/oportunidades
- http://localhost:8080/vendas/resumo
- http://localhost:8080/vendas

## 3. Rodar o front-end (terminal 2)

Abra um **segundo** terminal na raiz do projeto:

```powershell
cd frontend
npm install
npm run dev
```

Abra **http://localhost:3000**. O back-end precisa estar rodando.

> **Acesse sempre por `localhost`.** O back-end só libera CORS para `http://localhost:3000`. Abrir o front pelo IP da rede (por exemplo `192.168.x.x:3000`) faz as telas aparecerem sem dados e pode gerar erro de WebSocket no modo de desenvolvimento.

Se a API estiver em outro endereço, crie `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:8080
```

## Páginas

| Endereço | Conteúdo |
|----------|----------|
| `/` | Início |
| `/crm` | Painel de CRM (indicadores, funil, clientes) |
| `/clientes` | Lista de clientes |
| `/funil` | Funil de vendas, com clientes de cada etapa |
| `/vendas` | Vendas |
| `/configuracoes` | Configurações |

## Rotas da API

| Rota | O que devolve |
|------|---------------|
| `GET /health` | Status da API |
| `GET /clientes` | Lista de clientes |
| `GET /funil` | Quantidade e valor por etapa (Prospecção, Qualificação, Proposta, Negociação, Fechada) |
| `GET /oportunidades` | Oportunidades com dados do cliente |
| `GET /vendas/resumo` | Total vendido, quantidade e ticket médio do mês |
| `GET /vendas` | Vendas com o nome do cliente |

## Verificar o front-end

```powershell
cd frontend
npm run lint
npm run build
```

## Estrutura

```
desafio-enviepro/
├── frontend/       Next.js (páginas, sidebar, painel)
│   └── app/        crm, clientes, funil, vendas, configuracoes, components
├── backend/
│   ├── main.go     API, rotas e CORS
│   ├── seed.go     dados fictícios
│   └── go.mod
├── prompts.json    prompts usados, em ordem
├── RELATORIO.md    relatório do desafio
└── README.md
```

O `.gitignore` deixa de fora `node_modules`, `.next`, `crm.db`, executáveis `.exe` e arquivos `.env`.

## Histórico de branches

O trabalho foi feito em uma branch por etapa e depois integrado à `main`:

`passo-2-estrutura` → `passo-3-backend` → `passo-3.1-dados-e-rotas` → `passo-3.2-crm-completo` → `passo-4-ajustes`

## Problemas comuns

- **Comando não reconhecido (`git`, `node`, `go`):** o programa não entrou no PATH. Reinicie o computador ou reinstale marcando a opção de adicionar ao PATH.
- **Telas sem dados:** confirme que o back-end está rodando em `localhost:8080` e que o front foi aberto por `localhost:3000`.
- **Porta ocupada:** feche o programa que usa a porta 3000 ou 8080.
- **Avisos `LF will be replaced by CRLF` no Git:** são só conversão de final de linha no Windows e não impedem commit nem push.
