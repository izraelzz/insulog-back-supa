# Autenticacao da API

Configure `AUTH_TOKEN_SECRET` como um segredo aleatorio e persistente no ambiente da API. Em producao, a inicializacao falha se a variavel estiver ausente. Nao compartilhe nem versione o valor. Sem a variavel fora de producao, a API usa um segredo temporario; os tokens deixam de ser validos quando o processo reinicia.

O login em `POST /login` continua retornando o objeto `user` consumido pelo Flutter e inclui `user.token`. O token e um JWT HS256 com validade de 12 horas. O Flutter envia `Authorization: Bearer <token>` nas chamadas feitas pelo `ApiService`; login e cadastro (`POST /usuarios`) permanecem publicos.

## Acesso nesta etapa

- Glicose e insulina exigem token de paciente e verificam que registros, referencias e IDs enviados pertencem ao paciente autenticado.
- Médicos autenticados podem gerar convites e consultar apenas pacientes vinculados ao seu `id_medico`; a API confirma esse vínculo em cada consulta.
- Pacientes autenticados podem consultar e resgatar convites de uso único. O vínculo é gravado na mesma transação que consome o convite.
- Alarmes, configuracoes e CRUD de exportacoes exigem token e limitam consultas ao usuario autenticado.
- A consulta de perfil (`GET /usuarios/:id`) exige o proprio usuario. Listagens globais de usuarios ficam indisponiveis ate existir uma politica administrativa.
- Leituras de periodos e tipos de insulina permanecem publicas; alteracoes exigem token de medico.
- `GET /exportacoes/relatorio` permanece temporariamente publico porque o servico atual do Flutter nao envia o token. O `id_usuario` da query string nao autentica nem autoriza acesso; nao use essa rota com dados reais expostos antes de proteger a chamada no app.
- A leitura global de registros por médicos continua bloqueada; use as rotas `/medicos/pacientes/:id/registros`, que verificam o vínculo.

Senhas em hash scrypt e senhas legadas em texto puro continuam sendo verificadas pelo servico existente.
