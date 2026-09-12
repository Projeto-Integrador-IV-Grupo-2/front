# Nexo — Front-end

Front-end do projeto Nexo. Este repositório contém a **estrutura base** do
front-end: já roda localmente e está pronta para receber as telas de
**autenticação** e **gestão administrativa**.

## Tecnologias

| Camada        | O que usamos               | Versão |
| ------------- | -------------------------- | ------ |
| Linguagem     | TypeScript                 | 6      |
| UI            | React                      | 19     |
| Build / Dev   | Vite                       | 6      |
| Rotas         | React Router (data router) | 7      |
| Cliente HTTP  | Axios                      | 1      |
| Estilos       | CSS Modules + CSS global   | —      |
| Lint / Format | ESLint + Prettier          | 9 / 3  |
| Testes        | Vitest + Testing Library   | —      |

---

## O que instalar

| Ferramenta  | Versão                                     | Conferir         |
| ----------- | ------------------------------------------ | ---------------- |
| **Node.js** | 20.19+ ou 22.12+ (recomendado: última LTS) | `node --version` |
| **npm**     | vem com o Node                             | `npm --version`  |
| **Git**     | qualquer                                   | `git --version`  |

> Node **20.18 ou anterior não é suportado**: várias dependências atuais
> (Vite, Vitest/jsdom) já exigem o `require(esm)` nativo do Node, disponível
> a partir do 20.19 (LTS) e do 22.12. Veja o aviso no final deste README se
> aparecer um erro `ERR_REQUIRE_ESM`.

---

## Como rodar

```bash
npm install               # 1. instala as dependências
cp .env.example .env      # 2. cria o seu .env local (ver Variáveis de ambiente)
npm run dev                # 3. sobe o servidor de desenvolvimento
```

Pronto. A aplicação está em **http://localhost:5173**.

Por padrão o `.env.example` aponta para a API rodando em
`http://localhost:8080` (ver o
[README do back-end](https://github.com/Projeto-Integrador-IV-Grupo-2/back)).
Ajuste `VITE_API_URL` no seu `.env` se a API estiver em outro endereço.

### Para desligar

No terminal do Vite: aperte **`Ctrl+C`**.

---

## Variáveis de ambiente

Toda variável lida pelo Vite no código do cliente precisa começar com
`VITE_`. O `.env` **não é versionado** (ver `.gitignore`) — cada
integrante mantém o seu, a partir do `.env.example`.

| Variável       | Obrigatória | Descrição                            |
| -------------- | ----------- | ------------------------------------ |
| `VITE_API_URL` | Sim         | URL base da API (sem barra no final) |

A URL nunca fica fixa no código: o cliente Axios (`src/services/api.ts`)
sempre lê `import.meta.env.VITE_API_URL`.

---

## Autenticação

- `src/services/api.ts` — instância única do Axios. Anexa
  `Authorization: Bearer <token>` em toda requisição (quando há sessão) e,
  ao receber `401`, limpa a sessão e dispara o evento `nexo:unauthorized`.
- `src/services/authService.ts` — chamadas `POST /api/auth/login` e
  `GET /api/auth/me`; erros da API viram um `AuthError` tipado (`message` +
  `status`), sem expor detalhes do Axios para a UI.
- `src/contexts/AuthContext.tsx` + `src/hooks/useAuth.ts` — estado global de
  autenticação (`user`, `isAuthenticated`, `isLoading`, `login`, `logout`).
  Ao carregar a aplicação, se houver um token salvo, a sessão é restaurada
  chamando `/api/auth/me` (por isso recarregar a página mantém o login).
- A sessão é guardada no `localStorage` (`nexo:token`) — apenas o token;
  o usuário é sempre revalidado contra a API.

Páginas nunca chamam o Axios diretamente nem reimplementam essa lógica —
sempre via `useAuth()`.

---

## Scripts disponíveis

| Comando                | O que faz                                           |
| ---------------------- | --------------------------------------------------- |
| `npm run dev`          | Sobe o servidor de desenvolvimento (hot reload)     |
| `npm run build`        | Checa os tipos (`tsc -b`) e gera o build em `dist/` |
| `npm run preview`      | Serve o build de produção localmente                |
| `npm run lint`         | Roda o ESLint                                       |
| `npm run lint:fix`     | Roda o ESLint e corrige o que der                   |
| `npm run format`       | Formata o projeto com o Prettier                    |
| `npm run format:check` | Só verifica a formatação (usado na CI)              |
| `npm run test`         | Roda os testes uma vez (usado na CI)                |
| `npm run test:watch`   | Roda os testes em modo watch                        |

---

## Estrutura de pastas

```
src/
├── components/   # componentes reutilizáveis (ex.: components/layout)
├── pages/        # uma página por rota (LoginPage, DashboardPage, ...)
├── routes/       # definição das rotas (React Router)
├── services/     # Axios e chamadas à API — nenhuma página chama o Axios direto
├── contexts/     # estado global (ex.: autenticação)
├── hooks/        # hooks reutilizáveis (ex.: useMediaQuery)
├── types/        # tipos TypeScript compartilhados
├── styles/       # estilos globais e tokens de design
└── test/         # setup dos testes (Vitest + Testing Library)
```

Cada página busca dados através de um serviço (`services/`), nunca chamando
o Axios diretamente. Estado compartilhado (sessão, usuário) vive em
`contexts/`, não dentro das páginas.

---

## Padrões do projeto

- Apresentação (páginas/componentes), serviços (Axios) e estado
  (contexts) ficam separados — uma página nunca chama o Axios diretamente.
- A URL da API nunca fica fixa no código: sempre via `VITE_API_URL`.
- Componentes são reutilizáveis e com responsabilidade única.
- O código segue o ESLint e o Prettier configurados neste repositório
  (`npm run lint` e `npm run format:check`).
- Todo Pull Request roda lint, testes e build automaticamente
  (`.github/workflows/frontend-ci.yml`, check **Frontend CI**).

---

<details>
<summary><b>Erro <code>ERR_REQUIRE_ESM</code> ao rodar testes ou build?</b></summary>

Isso indica que o Node instalado é anterior ao 20.19/22.12 (várias libs do
ecossistema atual já exigem o `require(esm)` nativo do Node para essa
versão). Atualize o Node para a LTS mais recente — no Windows, baixe o
instalador em [nodejs.org](https://nodejs.org/) ou use um gerenciador de
versões (`nvm-windows`, `fnm`, etc.), depois rode `npm install` novamente.

</details>
