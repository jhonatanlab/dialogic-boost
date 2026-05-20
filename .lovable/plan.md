## Causa

O check-in `50F544D1` foi confirmado corretamente, mas nenhum cartão fidelidade foi criado porque **nenhum programa de fidelidade tem `company_id` preenchido** — exatamente o mesmo bug que existia em `checkin_links`.

A função `process_checkin_token` busca programa ativo com `WHERE company_id = p_company_id`. Como todos os 4 programas existentes têm `company_id = NULL`, nenhum é encontrado e a função retorna sem criar/incrementar o cartão.

## Correções

1. **`src/hooks/useFidelityPrograms.ts`** — ao criar um programa, buscar `company_id` do `profiles` do usuário logado e gravar no insert (mesmo padrão já aplicado em `useCheckinLinks.ts`).

2. **Migration de backfill** — preencher `company_id` em programas existentes a partir do `user_id`:
   ```
   UPDATE fidelity_programs SET company_id = p.company_id
   FROM profiles p
   WHERE fidelity_programs.user_id = p.user_id
     AND fidelity_programs.company_id IS NULL;
   ```

3. **Registrar cartão do check-in `50F544D1` retroativamente** — após o backfill, criar um `fidelity_cards` (current_stamps=1) para o contato `873d8c83-…` no programa ativo da empresa `Restaurante Raízes do Sertão`, marcando `last_checkin_id` = `0078491b-…`. Assim ele aparece em "Cartões Ativos".

4. **(Opcional) Reforço defensivo** — adicionar política/trigger ou validação para impedir criação futura de programa sem `company_id`. Posso incluir um `NOT NULL` na coluna após o backfill estar completo, se você quiser.

## Próximo passo

Confirme para eu aplicar (1), (2) e (3). O item (4) só faço se você pedir.
