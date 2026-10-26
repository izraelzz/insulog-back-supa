# Vinculo medico-paciente

## Schema e migration

O banco PostgreSQL existente tem `medico(id_usuario, crm)` e `paciente(id_usuario, id_medico)`, com as chaves estrangeiras informadas para `usuario` e `medico`. `paciente.id_medico` era `NOT NULL`, impedindo cadastro de paciente sem vínculo.

`migrations/20261026_medical_link.sql` faz somente estas alterações:

- Remove `NOT NULL` de `paciente.id_medico`, preservando os valores e vínculos existentes.
- Cria `codigo_vinculo_medico`, com hash único, médico emissor, validade, registro de resgate e paciente que resgatou.
- Adiciona índices para médico e convites pendentes por validade.

Segundo o estado informado para esta etapa, a migration foi aplicada manualmente no Supabase. Ela não foi executada nem verificada contra o serviço durante esta revisão. Como o arquivo local foi ajustado depois para remover uma constraint `CHECK` que não existe no MySQL de referência, confirme manualmente se a versão aplicada contém essa constraint antes de considerar os schemas equivalentes.

## Fluxo

- Médico autenticado cria um código `INSU-XXXXXXXX`, válido por 24 horas. Apenas o hash SHA-256 é persistido.
- Paciente autenticado sem vínculo resgata o código em `POST /pacientes/vinculo`.
- A transação bloqueia a linha do paciente e a do convite com `SELECT ... FOR UPDATE`, associa o paciente e marca o convite como resgatado. Resgate reutilizado, expirado ou concorrente é rejeitado.
- `GET /medicos/pacientes`, `GET /medicos/pacientes/:id` e `GET /medicos/pacientes/:id/registros` retornam apenas pacientes cujo `paciente.id_medico` corresponda ao médico autenticado.
- `GET /pacientes/vinculo` informa o vínculo atual. Um paciente já vinculado não pode resgatar outro convite nesta etapa.

O cadastro de paciente grava `id_medico = NULL`; o cliente não pode escolher o médico pelo corpo do cadastro. As rotas não alteram o login ou o JWT.
