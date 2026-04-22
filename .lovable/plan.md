
## Diagnóstico

Esses dois contatos não foram apagados porque eles pertencem a outro usuário da mesma empresa.

Hoje a tela de Contatos permite visualizar contatos da empresa inteira, mas a regra de exclusão no banco ainda permite apagar apenas contatos cujo `user_id` seja igual ao usuário logado.

No caso mostrado:

- Os contatos “Cliente” pertencem ao usuário administrador que os criou.
- Você está logado como gerente.
- A listagem aparece porque existe permissão para ver contatos da empresa.
- A exclusão não acontece porque a política atual de DELETE ainda é baseada no dono do contato.
- Como o banco bloqueia a exclusão via segurança, a operação não remove nenhuma linha.

Além disso, o frontend hoje não valida se algum registro foi realmente apagado. Então pode parecer que tentou excluir, mas o contato continua na lista.

## Plano de correção

### 1. Corrigir permissão de exclusão de contatos

Vou ajustar as regras do banco para permitir que usuários com perfil `admin` ou `manager` apaguem contatos da própria empresa.

A regra será:

- `admin`: pode apagar contatos da empresa.
- `manager`: pode apagar contatos da empresa.
- `agent`: não pode apagar contatos de outros usuários.
- Todos continuam isolados por `company_id`.

Isso mantém o isolamento multiempresa e resolve o caso em que um gerente precisa excluir contatos criados por outro membro.

### 2. Manter segurança por empresa

A nova política de exclusão usará o vínculo da empresa do usuário logado.

A exclusão só será permitida quando:

```text
contact.company_id = empresa_do_usuario_logado
AND usuario.role IN ('admin', 'manager')
```

Assim, ninguém poderá apagar contatos de outra empresa.

### 3. Melhorar feedback da tela de Contatos

Vou ajustar `useDeleteContact` em `src/hooks/useContacts.ts` para verificar se o contato realmente foi excluído.

Hoje o código faz:

```ts
.delete().eq("id", id)
```

Vou mudar para retornar os registros excluídos e validar o resultado.

Resultado esperado:

- Se apagou corretamente: mostrar “Contato excluído com sucesso”.
- Se não apagou nada: mostrar uma mensagem clara, como “Você não tem permissão para excluir este contato”.
- Se houver erro real do banco: mostrar erro detalhado no console e mensagem amigável na tela.

### 4. Fechar painel e atualizar a lista corretamente

Após a exclusão bem-sucedida:

- invalidar a query de contatos;
- remover o contato da lista;
- fechar o painel lateral se o contato excluído estiver aberto.

### 5. Atenção ao histórico de conversas

O banco já possui vínculos em cascata para contatos, conversas e mensagens.

Isso significa que excluir um contato pode também excluir:

- conversas vinculadas;
- mensagens vinculadas;
- etiquetas do contato;
- notas do contato;
- resumos de IA;
- registros de follow-up vinculados.

Vou manter esse comportamento atual, mas posso incluir uma mensagem de confirmação mais clara para avisar que a exclusão remove também o histórico relacionado ao contato.

## Arquivos envolvidos

- `supabase/migrations/...`
  - adicionar/corrigir política de DELETE para contatos por empresa e cargo.
- `src/hooks/useContacts.ts`
  - validar se o DELETE realmente apagou algo.
  - melhorar mensagens de erro.
- `src/pages/Contacts.tsx`
  - ajustar confirmação de exclusão, se necessário.

## Resultado esperado

Depois da correção:

- Gerentes conseguirão excluir contatos da própria empresa.
- Atendentes continuarão sem permissão para apagar contatos de outros usuários.
- A tela não mostrará sucesso quando a exclusão for bloqueada.
- Os dois contatos exibidos poderão ser apagados corretamente por um gerente/admin da empresa.
