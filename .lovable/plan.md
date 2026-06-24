## Objetivo

Adicionar nas Regras de Agendamento a opção de **fixar a duração** dos agendamentos. Quando ativa, o campo "Duração" no modal de novo/editar agendamento fica bloqueado com o valor configurado; quando inativa, o usuário continua escolhendo livremente.

## Mudanças

### 1. Banco de dados (migração)
Adicionar 2 colunas em `appointment_rules`:
- `fixed_duration_enabled boolean not null default false`
- `fixed_duration_minutes integer not null default 60`

Atualizar `resolve_appointment_rules` para retornar esses campos (com defaults quando não há linha).

Atualizar o trigger `validate_appointment_rules`: se `fixed_duration_enabled` estiver ativo e `NEW.duration_minutes <> fixed_duration_minutes`, lançar exceção clara ("Duração fixa de X minutos definida pelas regras").

Atualizar `simulate_appointment_rules` para incluir o check de duração fixa.

### 2. Hook `useAppointmentRules.ts`
Incluir os dois novos campos na interface `AppointmentRules` e nos defaults.

### 3. Página `AppointmentRules.tsx`
Na aba de configuração (empresa e override de usuário), adicionar:
- Switch "Duração fixa para todos os agendamentos"
- Input numérico "Duração (minutos)" — habilitado apenas quando o switch está ativo

### 4. Modal `AppointmentFormDialog.tsx`
- Ler as regras resolvidas via `simulate_appointment_rules` ou expor um novo helper no hook que devolva apenas `{ fixed_duration_enabled, fixed_duration_minutes }` para a empresa/usuário atual.
- Se `fixed_duration_enabled` = true:
  - Forçar `duration_minutes = fixed_duration_minutes` no `defaultValues` e no `reset`
  - Renderizar o input com `disabled` e uma legenda "Duração definida pelas regras de agendamento"
- Caso contrário, comportamento atual (campo livre).

### 5. Simulador (`AppointmentSimulator.tsx`)
- Quando duração fixa estiver ativa, travar o input de duração igual ao modal e exibir o aviso.

## Detalhes técnicos

- Hierarquia de regras: o override de usuário continua tendo prioridade sobre a empresa (já tratado por `resolve_appointment_rules`).
- Validação dupla (frontend bloqueia + backend rejeita via trigger), seguindo o padrão das outras regras.
- Sem migração de dados existentes — default `false` mantém comportamento atual.
