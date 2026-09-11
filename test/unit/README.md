# Testes unitários do backend

## Executar

Use Node.js 24, a mesma versão configurada no CI:

```bash
npm ci
npm run test:unit
```

São **34 testes em 5 arquivos**, usando `node:test` e `node:assert/strict`, sem biblioteca de testes adicional. Alguns testes percorrem várias entradas para verificar uma mesma regra, portanto o número de cenários de entrada é maior que o número de testes.

Os unitários não precisam de `.env`, API em execução, PostgreSQL ou Supabase. O script executa somente `test/unit/*.test.cjs`. `npm test` mantém seu comportamento anterior e também descobre os testes de outros níveis; o teste de sistema existente exige PostgreSQL local descartável e `TEST_DATABASE_URL`.

## Comportamentos cobertos

| Arquivo | Testes | O que verifica |
| --- | ---: | --- |
| `passwordService.test.cjs` | 3 | Hash scrypt com salt aleatório; senha correta/incorreta; compatibilidade com senha legada; rejeição de hash ausente, incompleto ou inválido. |
| `authService.test.cjs` | 5 | Campos obrigatórios; usuário inexistente; senha incorreta; retorno apenas de dados públicos; propagação de falha na consulta. |
| `userService.test.cjs` | 5 | Campos obrigatórios; tipo de usuário permitido; CRM obrigatório para médico; e-mail duplicado; envio de senha protegida e tipo normalizado no cadastro de paciente e médico. |
| `alarmeService.test.cjs` | 7 | Normalização, ordenação e deduplicação dos dias; campos e dias inválidos; conversão e rejeição de booleanos; preservação das opções omitidas na edição; ID positivo; alarme inexistente. |
| `registroGlicoseService.test.cjs` | 14 | Limites de classificação 69/70/125/126; conversão e arredondamento; média e totais do histórico; histórico vazio; validação do intervalo; média somente do dia atual; consulta por login/ID e limite; criação simples/completa; dados incompletos; edição parcial; remoção explícita de insulina/lembrete; registro inexistente. |

Os limites e mensagens são os comportamentos atualmente implementados pelo projeto. Os testes não introduzem novas regras de negócio.

## Isolamento

`test/helpers/load-service.cjs` substitui dependências no cache CommonJS antes de carregar o serviço. Assim, o serviço real é testado com repositórios simulados, sem carregar o banco. Chamadas a dependências não configuradas falham, permitindo verificar que entradas inválidas não chegam à persistência. O cache é restaurado ao final de cada teste.

Os testes de autenticação e cadastro simulam também o serviço de senha para isolar suas decisões. A implementação real de hash é exercitada em `passwordService.test.cjs`. Os mocks registram argumentos e chamadas relevantes. O teste da média diária fixa o relógio em 11/09/2026, evitando depender do dia da execução.

## Relação com a atividade

O PDF Aula 05 pede rastreabilidade entre comportamento e teste (página 16), CI automático (página 19) e isolamento de função/regra pequena nos testes de unidade (página 20). A tabela acima relaciona os testes aos comportamentos do código. O PDF não fornece os identificadores RF/RN específicos do Insulog; por isso, não foram inventados identificadores nem novas regras.

Foi acrescentado `test:unit` ao `package.json` e uma etapa `npm run test:unit` ao workflow existente, antes da preparação do banco. O workflow já dispara em Pull Requests e pushes. A etapa passa a executar no GitHub quando estas alterações forem enviadas ao repositório.

## Validação local em 11/09/2026

- Node.js 24.19.0 e npm 11.17.0.
- Unitários: **34 aprovados, nenhuma falha**.
- Unitários + smoke + integração já existentes: **37 aprovados, nenhuma falha**, com o comando abaixo:

```bash
node --test test/smoke.test.cjs test/integration/api.integration.test.cjs test/unit/*.test.cjs
```

O teste de sistema com PostgreSQL não foi executado nesta entrega de unitários. Não houve execução remota do GitHub Actions, push ou merge.

Nenhum arquivo de `src/`, dependência, lockfile ou teste preexistente foi alterado. As alterações são os novos testes, seu helper/documentação, o script de execução e a etapa de CI.
