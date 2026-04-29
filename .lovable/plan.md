## Mudanças no Inbox: aba "Atendimento" + filtros avançados

### 1. Substituir aba "Todos" por "Atendimento"

Na barra de abas (linhas ~1056-1064 de `src/pages/Inbox.tsx`):
- Renomear o botão `Todos` para `Atendimento`.
- Trocar o valor do filtro `"all"` por `"in_service"` (no estado `activeFilter` e no `switch`).
- Mudar a regra de filtragem: ao invés de mostrar todas as conversas com `status !== "closed"`, mostrar apenas conversas **em atendimento ativo**, ou seja:
  - `c.assigned_to !== null` (já tem atendente)
  - `c.status === "open"` (não está concluída nem em fila)
- Manter visível somente para gerentes e admin (regra atual `isManagerOrAdmin` permanece).
- Trocar o ícone `Users` por `UserCheck` para refletir "em atendimento".

### 2. Adicionar três novos filtros (dropdowns)

Logo abaixo do campo de busca (linha ~1074), adicionar uma linha com três `Select` compactos. Cada filtro é um estado independente combinado por AND com o filtro de aba e a busca atual.

**Filtro por Equipe** (todos os perfis)
- Estado novo: `teamFilter: string` ("all" por padrão).
- Opções: "Todas as equipes" + lista de `companyTeams` (já carregada).
- Aplicação: `c.assigned_team === teamFilter`.

**Filtro por Vendedor/Atendente** (apenas admin/manager)
- Estado novo: `agentFilter: string` ("all" por padrão).
- Renderizado condicionalmente com `isManagerOrAdmin`.
- Opções: "Todos os atendentes" + "Sem atribuição" + lista de `companyAgents` (já carregada). Incluir o próprio usuário atual também (atualmente é filtrado fora — ajustar a query da linha 463 para não excluir o próprio usuário, ou criar lista separada para o filtro).
- Aplicação: `c.assigned_to === agentFilter` (ou `=== null` para "Sem atribuição").

**Filtro por Canal** (apenas canais conectados)
- Carregar lista de canais conectados na empresa: query a `whatsapp_integrations` por `company_id` filtrando `status = 'connected'`. Para o MVP inicial, como hoje o sistema só usa `whatsapp`, mapear: se houver pelo menos uma integração WhatsApp conectada → adicionar opção "WhatsApp". Estrutura preparada para Instagram/Telegram/Messenger no futuro (já existem ícones no `ChannelIcon`).
- Estado novo: `channelFilter: string` ("all" por padrão).
- Opções: "Todos os canais" + cada canal conectado.
- Aplicação: `c.channel === channelFilter`.
- Se houver apenas um canal conectado, o filtro pode aparecer desabilitado mostrando o canal ativo (apenas informativo).

### 3. Atualizar a lógica `filteredConversations`

No bloco das linhas 940-968:
```ts
switch (activeFilter) {
  case "mine": ...                              // inalterado
  case "in_service":                            // novo
    filtered = filtered.filter(c => c.assigned_to && c.status === "open");
    break;
  case "queue": ...                             // inalterado
  case "closed": ...                            // inalterado
}

if (teamFilter !== "all")    filtered = filtered.filter(c => c.assigned_team === teamFilter);
if (agentFilter !== "all")   filtered = filtered.filter(c =>
  agentFilter === "unassigned" ? !c.assigned_to : c.assigned_to === agentFilter
);
if (channelFilter !== "all") filtered = filtered.filter(c => c.channel === channelFilter);
```

### Detalhes técnicos

**Arquivo único alterado:** `src/pages/Inbox.tsx`

**Novos estados:**
```ts
const [teamFilter, setTeamFilter]       = useState<string>("all");
const [agentFilter, setAgentFilter]     = useState<string>("all");
const [channelFilter, setChannelFilter] = useState<string>("all");
const [connectedChannels, setConnectedChannels] = useState<string[]>([]);
```

**Carregamento de canais conectados** (dentro do `useEffect` existente da linha 442, após buscar teams):
```ts
const { data: integ } = await supabase
  .from("whatsapp_integrations")
  .select("status")
  .eq("company_id", profile.company_id)
  .eq("status", "connected");
setConnectedChannels(integ && integ.length > 0 ? ["whatsapp"] : []);
```

**Visual:** três `Select` lado a lado em um `flex gap-2`, altura `h-8`, texto `text-xs`, no mesmo container do search (logo abaixo). Em telas estreitas, quebra para a próxima linha (`flex-wrap`).

**Persistência:** filtros são apenas em memória (não persistidos). A aba `activeFilter` continua local.

**Realtime/Performance:** filtros são aplicados client-side sobre a lista já carregada por `useConversations` — sem nova query.

### Fora do escopo
- Não mexer em RLS nem nas queries do hook `useConversations` (já carrega todas as conversas da empresa).
- Não adicionar persistência dos filtros entre sessões.
- Não criar entidade `channels` separada — usar `whatsapp_integrations` como fonte por enquanto.
