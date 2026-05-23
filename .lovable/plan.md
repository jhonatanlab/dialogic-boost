# Normalização automática de telefones BR (com o "9")

## Diagnóstico

O nó HTTP do n8n já tem `apikey` configurada nos headers — então auth não é o problema.

O problema real é **formato do telefone**:

- n8n consulta: `5582999787412` (13 dígitos, **com** o 9)
- banco grava: `558299787412` / `558388907220` / `558796192460` (12 dígitos, **sem** o 9)

A consulta `phone=eq.5582999787412` nunca casa porque o registro está salvo sem o 9. Foi por isso que "antes funcionava" para alguns contatos e agora não — depende de cada contato ter sido cadastrado num formato ou no outro.

A solução proposta por você ("forçar o 9 em todos os 55") é correta e podemos resolver **100% do lado do Supabase**, sem tocar no n8n.

## Plano

### 1. Função SQL `normalize_br_phone(text)`

Regra:
- Remover tudo que não é dígito.
- Se começa com `55`, tem 12 dígitos totais, e o 5º dígito (1º do número local) é `6`, `7`, `8` ou `9` (celular BR) → inserir o `9` após o DDD.
- Senão, devolve como está (mantém fixos, internacionais, etc.).

Exemplos:
- `558299787412` → `5582999787412`
- `558388907220` → `5583989907220` (1º local = 8 → celular → adiciona 9)
- `558796192460` → `5587996192460`
- `5511987654321` (já com 9) → mantém
- `551133334444` (fixo, 1º local = 3) → mantém

### 2. Trigger `BEFORE INSERT OR UPDATE` em `contacts`

Aplica `normalize_br_phone()` na coluna `phone` automaticamente. Garante que **qualquer** origem (formulário, importação CSV, webhooks Meta/Z-API/n8n, check-in público, automações) salve sempre no formato com 9.

### 3. Trigger equivalente em `checkin_records.whatsapp_user`

Mesma lógica, para manter consistência entre o telefone do check-in e o do contato.

### 4. Backfill dos dados existentes

Rodar `UPDATE` único:
```sql
UPDATE contacts SET phone = normalize_br_phone(phone) 
  WHERE phone IS NOT NULL AND phone <> normalize_br_phone(phone);

UPDATE checkin_records SET whatsapp_user = normalize_br_phone(whatsapp_user)
  WHERE whatsapp_user IS NOT NULL AND whatsapp_user <> normalize_br_phone(whatsapp_user);
```

Após isso, os 3 contatos da empresa de teste ficarão:
- Davyd → `5587996192460`
- Jhonatan → `5583989907220`
- (e qualquer outro que aparecer)

### 5. Verificação

Após o backfill, repetir a query que o n8n faz (`phone=eq.5582999787412`) e confirmar que retorna o registro.

## Detalhes técnicos

- Triggers usam `SECURITY DEFINER` e `search_path=public` (padrão do projeto).
- A função é `IMMUTABLE` — pode ser usada em índices futuros se precisar.
- **Cuidado com unicidade**: se já existir constraint `UNIQUE(company_id, phone)` e o backfill gerar colisão (mesmo contato salvo nos dois formatos), o `UPDATE` falha. Antes do backfill, rodo um `SELECT` para detectar duplicatas e te mostro a lista para decidir qual manter — sem deletar nada automaticamente.
- Tabela `ai_control` (telefone como `text` separado) não é tocada aqui; já existe lógica em `delete_contact_cascade` que lida com as duas variantes.

## O que **não** vai mudar

- Nenhum código frontend.
- Nenhum endpoint, nenhuma edge function, nenhuma URL.
- Nada no n8n.

## Risco / reversão

- Backup lógico: o `UPDATE` é trivial de reverter rodando a inversa (remover o 9 dos celulares de 13 dígitos), caso algo dê errado.
- Se aparecer telefone internacional não-BR começando com `55` por coincidência (ex.: outro país com prefixo similar) e 12 dígitos, ele seria normalizado errado. Risco baixo no contexto (SaaS brasileiro), mas vale você confirmar se há clientes não-BR.
