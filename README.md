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

| Variável              | Obrigatória | Descrição                                                                                                         |
| --------------------- | ----------- | ----------------------------------------------------------------------------------------------------------------- |
| `VITE_API_URL`        | Sim         | URL base da API (sem barra no final)                                                                              |
| `VITE_TRILHAS_MOCK`   | Não         | `true` responde as rotas de trilhas com um mock em memória (ver abaixo)                                           |
| `VITE_SUGESTOES_MOCK` | Não         | `true` responde as sugestões da IA pelo mock; `area` também, simulando a IA fora do ar. Sem a variável, usa a API |
| `VITE_AJUDA_IA_MOCK`  | Não         | `true` responde a conversa de ajuda da IA em Trilhas pelo mock. Sem a variável, usa a API                         |

A URL nunca fica fixa no código: o cliente Axios (`src/services/api.ts`)
sempre lê `import.meta.env.VITE_API_URL`.

### Mock temporário das trilhas

Enquanto o backend não expõe todos os endpoints de trilhas (cadastro,
progresso, edição, inativação e atribuição ainda não existem),
`VITE_TRILHAS_MOCK=true` faz o `trilhaService` responder com dados em memória
(`src/services/mocks/trilhasMock.ts`). O mock é um _adapter_ do Axios: os
caminhos, os corpos e os interceptors de sessão são os mesmos da API real, então
trocar para o backend é só mudar a flag para `false`. Os dados voltam ao estado
inicial a cada recarga da página. Os testes ignoram o `.env` e sempre falam com
o MSW.

---

## Autenticação

- `src/services/api.ts` — instância única do Axios. Anexa
  `Authorization: Bearer <token>` em toda requisição (quando há sessão) e,
  ao receber `401`, limpa a sessão e dispara o evento `nexo:unauthorized`.
  Em `403` **mantém** a sessão e deixa o erro subir: falta de permissão não é
  sessão inválida, e quem fez a chamada mostra a mensagem na tela.
- `src/services/authService.ts` — chamadas `POST /api/auth/login` e
  `GET /api/auth/me`; erros da API viram um `AuthError` tipado (`message` +
  `status`), sem expor detalhes do Axios para a UI.
- `src/contexts/AuthContext.tsx` + `src/hooks/useAuth.ts` — estado global de
  autenticação (`user`, `isAuthenticated`, `isLoading`, `login`, `logout`).
  Ao carregar a aplicação, se houver um token salvo, a sessão é restaurada
  chamando `/api/auth/me` (por isso recarregar a página mantém o login).
- A sessão é guardada no `localStorage` (`nexo:token`, mais a validade em
  `nexo:token-expira-em`) — apenas o token; o usuário é sempre revalidado
  contra a API. Passada a validade, o token é descartado já na leitura, sem
  esperar o primeiro `401`. `expiraEm` precisa vir com fuso (o `Instant` da API
  sai em UTC): valor sem fuso ou ilegível conta como vencido.

### Contrato com a API

O backend expõe o domínio em português e o frontend usa os mesmos nomes, sem
tradução intermediária:

| Chamada                | Envia              | Recebe                                         |
| ---------------------- | ------------------ | ---------------------------------------------- |
| `POST /api/auth/login` | `{ email, senha }` | `{ token, tipo, expiraEm, usuario }`           |
| `GET /api/auth/me`     | —                  | `{ id, tenantId, nomeCompleto, email, papel }` |

`papel` é `ADMIN`, `GESTOR` ou `COLABORADOR` (enum `papel_usuario` do banco).

---

## Trilhas

A tela de trilhas tem duas rotas: a listagem (`/trilhas`), com as abas
"Minhas trilhas" e "Catálogo", e o detalhe (`/trilhas/:id`), onde o usuário
acompanha o próprio progresso e onde fica a gestão da trilha.

### Chamadas usadas

| Chamada                              | Para quê                                | Quem pode        |
| ------------------------------------ | --------------------------------------- | ---------------- |
| `GET /api/trilhas`                   | listagem, com filtros e paginação       | autenticado      |
| `GET /api/trilhas/{id}`              | detalhe + progresso de quem está logado | autenticado      |
| `POST /api/trilhas`                  | cadastro                                | `ADMIN`          |
| `PUT /api/trilhas/{id}`              | edição                                  | `ADMIN`          |
| `PATCH /api/trilhas/{id}/inativar`   | tira a trilha de circulação             | `ADMIN`          |
| `PATCH /api/trilhas/{id}/ativar`     | devolve a trilha à listagem             | `ADMIN`          |
| `POST /api/trilhas/{id}/atribuicoes` | atribui a colaboradores ou a uma área   | `ADMIN` `GESTOR` |
| `POST /api/trilhas/{id}/progresso`   | inicia a trilha para si                 | autenticado      |
| `PATCH /api/trilhas/{id}/progresso`  | conclui ou retoma a própria trilha      | autenticado      |

Toda chamada passa pelo `trilhaService` — nenhum componente conhece o Axios —,
e os erros chegam à tela como `TrilhaServiceError` (`message`, `status`,
`fieldErrors`), com os erros de validação exibidos no campo correspondente.

### Gestão da trilha (issue #40)

- **Editar e inativar/reativar** ficam no detalhe e só aparecem para `ADMIN`
  (`PERFIS_GESTAO_TRILHA`). A edição reaproveita o `TrilhaFormulario`, que é o
  mesmo diálogo do cadastro — muda só o estado inicial e os textos.
- **Depois de escrever, a tela relê o detalhe.** `PUT /api/trilhas/{id}` e os
  dois `PATCH` de situação respondem com o **resumo** da trilha
  (`TrilhaResumoResponse`), que não traz `descricao`, `prazoDias`, `ativo` nem
  `criadoEm`. Montar o detalhe a partir dele mostraria a trilha errada — como
  inativa, sem data de criação e sem progresso —, então a tela busca o detalhe
  de novo e exibe o que a API guardou, a mesma postura já usada no progresso.
  Continua sem recarregar a página.
- **Inativar pede confirmação** (`ConfirmacaoSituacaoTrilha`) antes de enviar.
  A trilha inativa sai da listagem dos colaboradores e não pode ser atribuída,
  mas o progresso de quem já a recebeu é mantido. Se a API recusar, a mensagem
  aparece no próprio diálogo, que continua aberto; enquanto a requisição está
  em andamento, Esc não fecha.
- **Atribuir** é de `ADMIN` e `GESTOR` (`PERFIS_ATRIBUIR_TRILHA`). O diálogo
  escolhe uma lista de colaboradores **ou** uma área inteira, mais o prazo, e
  a tela mostra quantos receberam e quantos foram ignorados por já terem a
  trilha. Se a lista de colaboradores não vier (um gestor recebe 403 em
  `GET /api/usuarios`), sobra a atribuição por área, e o diálogo avisa.
- **Colaboradores atribuídos** é o painel do protótipo no detalhe, com quem
  recebeu a trilha, o progresso e a situação de cada um. É um resumo (os 10
  primeiros) do mesmo dado da tela de Acompanhamento — lê de
  `GET /api/atribuicoes?trilhaId=...` e aparece para `ADMIN` e `GESTOR`
  (`PERFIS_ACOMPANHAMENTO`). Depois de atribuir, o painel se refaz sozinho.
- **Atraso** aparece onde a pessoa olha primeiro: o selo "Atrasada" e a data
  vencida em destaque, tanto no cartão da listagem quanto no detalhe. Quem
  decide o status é a API — o frontend só apresenta o que ela devolve.

---

### IA na tela de Trilhas (Task 12)

O botão **IA**, ao lado do **PDI**, abre o painel **"Assistente de trilhas"**.
O contador no botão mostra quantas sugestões há.

- **Sugeridas para você:** as trilhas sugeridas, cada uma no `TrilhaCard`
  com o motivo embaixo, como texto simples. Com `geradoPorIa: false` (a IA
  não respondeu) o selo vira "Recomendação por área" e aparece o `aviso` da
  API. Sem sugestões, ou com erro
  na consulta, a seção não aparece (sem mensagem de erro).
- **Peça ajuda à IA:** conversa com atalhos por perfil. Quem cria trilhas
  (`PERFIS_CRIAR_TRILHA`) pode pedir para a IA montar uma trilha. A resposta
  traz um rascunho, e "Criar com este rascunho" abre o cadastro já preenchido.
- As sugestões carregam junto com a página (`useSugestoesTrilhas`), sem a
  listagem esperar por elas.
- Trilha já iniciada não entra. Ao iniciar uma trilha, o `trilhaService`
  publica `trilha-iniciada` (`services/eventosTrilha.ts`, Observer) e as
  sugestões, que assinam o evento, tiram a trilha da lista. A ação de iniciar
  não conhece quem ouve.

**Sugestões: dados reais.** Vêm de `GET /api/trilhas/sugestoes` (já na `dev`
do backend), no formato
`{ geradoPorIa, aviso, sugestoes: [{ id, nome, area, objetivos, motivo }] }`.
A API tira só as trilhas **concluídas**; as **em andamento** o front tira
cruzando com "minhas trilhas" (só quando há sugestões). Backend sem o
endpoint responde erro, e a seção apenas não aparece.

**Ajuda (conversa e rascunhos): dados reais.** `POST /api/trilhas/sugestoes/ajuda`
(branch `feat/trilhas-ajuda-ia` do backend) recebe `{ pergunta }` e devolve
`{ texto, rascunho }`. O rascunho só vem quando o pedido é para criar uma
trilha, já dentro dos limites do cadastro, e "Criar com este rascunho" abre o
formulário preenchido — nada é gravado antes de quem cria salvar. IA fora do
ar (503) mostra "A IA não está disponível agora" no painel. Sem o backend,
`VITE_AJUDA_IA_MOCK=true` responde pelo mock.

Para trabalhar sem o backend, `VITE_SUGESTOES_MOCK=true` responde as
sugestões pelo mesmo mock (montadas a partir do catálogo), e `area` simula
a IA fora do ar.

## Conteúdos, etapas e estudo (issue #39)

Os vídeos ficam hospedados no **Vimeo**. O front nunca valida o link por
conta própria: a API consulta o oEmbed do Vimeo ao salvar e, se o link for
inválido, responde 400 com o erro no campo `videoUrl`, que o formulário mostra
embaixo do campo. Duração e miniatura também vêm da API.

| Tela                   | O que faz                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `/categorias`          | Lista; `ADMIN`/`GESTOR` criam e editam                                                                                                      |
| `/conteudos`           | Lista com filtros (título, categoria, área, tipo, situação); `ADMIN`/`GESTOR` criam, editam e publicam, com pré-visualização do vídeo       |
| `/trilhas/:id`         | Seção "Etapas da trilha" para `ADMIN`/`GESTOR`: adicionar, editar, remover e reordenar (botões subir/descer)                                |
| `/trilhas/:id/estudar` | Lista de etapas + player `@vimeo/player`. Vídeo conclui a etapa sozinho ao terminar ou passar de 90%; etapas sem vídeo têm "Concluir etapa" |

A barra de progresso do estudo usa o progresso que a própria resposta de
`POST /etapas/{etapaId}/concluir` traz — atualiza sem recarregar a página.
Colaborador não vê nenhum botão de criar ou editar (`PERFIS_GESTAO_CONTEUDO`)
e só recebe conteúdos publicados da API.

Services: `categoriaService`, `conteudoService` e `etapaService`, todos com
erro normalizado (`message`, `status`, `fieldErrors`).

---

## Conhecimento (issue #48)

`/conhecimento` é a base de documentos da empresa, com item próprio no menu
para todos os perfis. Usa os mesmos `conteudoService` e `categoriaService`; o
documento é um conteúdo do tipo `DOCUMENTO` (back #54).

- A tela abre nos documentos: `criarFiltroInicial()` já vem com o tipo
  `DOCUMENTO`, e "Limpar filtros" volta para ele.
- Busca por título (sai só quando a pessoa para de digitar, com
  `useValorAdiado`) e filtros de categoria, área e tipo, combinados entre si.
  `ADMIN` e `GESTOR` também filtram por status; o colaborador não vê esse
  filtro e a tela nem envia status (a API já devolve só os publicados).
- Qualquer mudança de filtro volta para a página 1.
- Lista com título, categoria, área, tipo e data de atualização: tabela no
  desktop, cartões no celular.
- Lista vazia tem mensagem própria (diferente quando há filtro), separada do
  erro, que oferece "Tentar novamente".

---

## Rotas e permissões

| Rota                   | Quem acessa                                               |
| ---------------------- | --------------------------------------------------------- |
| `/login`               | qualquer visitante                                        |
| `/dashboard`           | qualquer usuário autenticado                              |
| `/trilhas`             | qualquer usuário autenticado                              |
| `/trilhas/:id`         | qualquer usuário autenticado                              |
| `/trilhas/:id/estudar` | qualquer usuário autenticado                              |
| `/conteudos`           | qualquer usuário autenticado (ações só `ADMIN`/`GESTOR`)  |
| `/categorias`          | qualquer usuário autenticado (ações só `ADMIN`/`GESTOR`)  |
| `/conhecimento`        | qualquer usuário autenticado (status só `ADMIN`/`GESTOR`) |
| `/usuarios`            | apenas `ADMIN`                                            |

`/` leva ao dashboard, que por sua vez exige sessão.

- `src/routes/paths.ts` — os caminhos ficam aqui, não espalhados em strings.
- `src/routes/permissions.ts` — **a regra de permissão do frontend mora só
  aqui**. `ITENS_MENU` alimenta o menu e `temPermissao` decide a rota, então a
  navegação nunca oferece algo que a rota vá recusar.
- `src/components/auth/ProtectedRoute.tsx` — rota de layout que protege tudo
  abaixo dela. Enquanto a sessão salva é validada mostra um indicador; sem
  sessão redireciona ao login guardando o destino em `state.from` (depois de
  entrar, o usuário volta para onde tentou ir); com sessão mas sem o perfil
  exigido, renderiza a tela de acesso negado mantendo a URL e o histórico.

Nada disso é segurança: **a autoridade final é o backend**. O frontend só
orienta a navegação e evita telas que o usuário não poderia usar.

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
└── test/         # setup, fábricas e mocks HTTP (Vitest + Testing Library + MSW)
```

Nos testes, as requisições são interceptadas pelo [MSW](https://mswjs.io/):
`src/test/msw/handlers.ts` define as respostas padrão e cada teste sobrescreve
o que precisar com `server.use(...)`. Requisição sem handler falha de
propósito, para nenhum teste escapar para a rede de verdade. Os caminhos dos
handlers usam curinga (`*/api/...`) porque `VITE_API_URL` existe no ambiente
local e não existe na etapa de testes da CI.

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

---

## Visão geral — dashboards (issue de Dashboard)

A rota `/dashboard` escolhe o painel por meio de `usePermissao`, usando a
mesma política central de `src/routes/permissions.ts`:

- `COLABORADOR`: `GET /api/dashboard/colaborador`, com total e status das
  próprias trilhas, percentual médio, prazos próximos e últimas interações.
- `ADMIN` e `GESTOR`: `GET /api/dashboard/gestao`, com trilhas ativas,
  atribuições por status, taxa de conclusão, áreas com mais atraso e trilhas
  mais iniciadas.

Os contratos TypeScript ficam em `src/types/dashboard.ts`, e as chamadas e a
normalização dos erros ficam em `src/services/dashboardService.ts`. Os
componentes não acessam Axios diretamente. Cada bloco representa seu estado de
carregamento, erro ou vazio e trata separadamente campos inválidos para que um
bloco incompatível não desmonte os demais. Como a API entrega todos os dados de
cada painel em uma resposta única, uma falha HTTP dessa chamada é compartilhada
pelos blocos desse mesmo painel.

Os gráficos usam barras CSS, mostram os valores numéricos e expõem a descrição
para leitores de tela. Os estilos são CSS Modules e usam os tokens de cor da
aplicação; o tema escuro acompanha a preferência do sistema operacional.

Os testes Vitest da página usam MSW para simular os dois endpoints e cobrem
`COLABORADOR`, `GESTOR`, `ADMIN`, a seleção exclusiva do endpoint de cada perfil,
dados vazios, erros HTTP 403/500 e erro isolado de um bloco. Execute
`npm test -- src/pages/DashboardPage.test.tsx` para rodar esse conjunto e
`npm run build` para validar TypeScript e o bundle de produção.
