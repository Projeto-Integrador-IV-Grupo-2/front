## Descrição

<!-- O que este PR faz e por quê. Dê ao revisor o contexto necessário. -->

Closes #

## Tipo de mudança

- [ ] feat — nova funcionalidade
- [ ] fix — correção de bug
- [ ] refactor — mudança interna sem alterar comportamento
- [ ] docs — apenas documentação
- [ ] test — apenas testes
- [ ] chore — build, CI, dependências

## Como testar

<!-- Passos para o revisor validar localmente. -->

1.
2.

## Checklist de Definition of Done (DoD)

- [ ] O código segue a organização de pastas do projeto (`components`, `pages`, `services`, `contexts`, `hooks`, `routes`, `types`)
- [ ] Apresentação, serviços (Axios) e estado da aplicação estão separados — nenhuma página chama o Axios diretamente
- [ ] Nenhuma URL de API fica fixa no código (`VITE_API_URL` é a única fonte)
- [ ] `npm run lint` e `npm run format:check` passam localmente
- [ ] `npm run test` passa localmente, com testes para os comportamentos novos
- [ ] `npm run build` passa localmente
- [ ] Layout validado em desktop e mobile
- [ ] Nenhum segredo, token ou arquivo `.env` foi versionado
- [ ] `README.md` atualizado caso o setup tenha mudado
- [ ] Branch nomeada no padrão e commits em Conventional Commits
- [ ] O check **Frontend CI** está verde
- [ ] PR com escopo único e pequeno o suficiente para revisão
