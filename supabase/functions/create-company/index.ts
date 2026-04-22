import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabaseUser.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const { company_name, cnpj, full_name } = await req.json();

    if (!company_name) {
      return new Response(JSON.stringify({ error: "company_name is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check if user already has a profile
    const { data: existingProfile } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("user_id", userId)
      .maybeSingle();

    if (existingProfile) {
      return new Response(JSON.stringify({ error: "User already has a company" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create company using service role (bypasses RLS)
    const { data: company, error: companyError } = await supabaseAdmin
      .from("companies")
      .insert({ name: company_name, cnpj: cnpj || null })
      .select()
      .single();

    if (companyError) throw companyError;

    // Create profile linking user to company
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .insert({
        user_id: userId,
        company_id: company.id,
        full_name: full_name || null,
        role: "admin",
      });

    if (profileError) throw profileError;

    // Seed 5 example automations (all inactive)
    const exampleAutomations = [
      {
        name: "Boas-Vindas",
        description: "Envia mensagem de boas-vindas na primeira interação",
        trigger_type: "first_message",
        status: "paused",
        user_id: userId,
        company_id: company.id,
        flow_data: {
          nodes: [
            { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Primeira Mensagem", triggerType: "first_message" } },
            { id: "msg-1", type: "message", position: { x: 250, y: 180 }, data: { label: "Boas-Vindas", message: "Olá {nome}! 👋 Seja bem-vindo(a)! Como posso ajudá-lo(a) hoje?" } },
            { id: "q-1", type: "question", position: { x: 250, y: 330 }, data: { label: "Menu Inicial", question: "Escolha uma opção:", options: ["Conhecer produtos", "Falar com atendente", "Suporte técnico"] } },
          ],
          edges: [
            { id: "e1", source: "trigger-1", target: "msg-1", animated: true },
            { id: "e2", source: "msg-1", target: "q-1", animated: true },
          ],
        },
      },
      {
        name: "Follow-Up — 1 hora",
        description: "Reengaja contatos inativos após 1 hora",
        trigger_type: "inactivity",
        inactivity_minutes: 60,
        max_followups: 1,
        status: "paused",
        user_id: userId,
        company_id: company.id,
        flow_data: {
          nodes: [
            { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Inatividade 1h", triggerType: "inactivity", inactivityMinutes: 60, inactivityValue: 1, inactivityUnit: "hours", maxFollowups: 1 } },
            { id: "msg-1", type: "message", position: { x: 250, y: 180 }, data: { label: "Follow-Up", message: "Oi {nome}! Vi que ainda não respondeu. Posso ajudar com algo? 😊" } },
          ],
          edges: [
            { id: "e1", source: "trigger-1", target: "msg-1", animated: true },
          ],
        },
      },
      {
        name: "Qualificação de Leads com Etiquetas",
        description: "Classifica leads automaticamente com perguntas e etiquetas",
        trigger_type: "keyword",
        keyword: "orçamento,preço,valor",
        status: "paused",
        user_id: userId,
        company_id: company.id,
        flow_data: {
          nodes: [
            { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "Palavra-chave", triggerType: "keyword", keyword: "orçamento,preço,valor" } },
            { id: "q-1", type: "question", position: { x: 250, y: 180 }, data: { label: "Qualificar", question: "Qual o seu interesse?", options: ["Comprar agora", "Apenas pesquisando", "Preciso de orçamento"] } },
            { id: "cond-1", type: "condition", position: { x: 100, y: 330 }, data: { label: "Comprar agora?", condition: "resposta contém 'Comprar'" } },
            { id: "tag-1", type: "tag", position: { x: 50, y: 480 }, data: { label: "Lead Quente", action: "add", tagName: "Lead Quente" } },
            { id: "tag-2", type: "tag", position: { x: 350, y: 480 }, data: { label: "Lead Frio", action: "add", tagName: "Lead Frio" } },
          ],
          edges: [
            { id: "e1", source: "trigger-1", target: "q-1", animated: true },
            { id: "e2", source: "q-1", target: "cond-1", animated: true },
            { id: "e3", source: "cond-1", target: "tag-1", animated: true, sourceHandle: "yes" },
            { id: "e4", source: "cond-1", target: "tag-2", animated: true, sourceHandle: "no" },
          ],
        },
      },
      {
        name: "Respostas por Palavras-Chave",
        description: "Responde automaticamente a perguntas frequentes",
        trigger_type: "keyword",
        keyword: "horário,endereço,localização",
        status: "paused",
        user_id: userId,
        company_id: company.id,
        flow_data: {
          nodes: [
            { id: "trigger-1", type: "trigger", position: { x: 250, y: 50 }, data: { label: "FAQ", triggerType: "keyword", keyword: "horário,endereço,localização" } },
            { id: "msg-1", type: "message", position: { x: 250, y: 180 }, data: { label: "Informações", message: "📍 Nosso horário de funcionamento é de segunda a sexta, das 9h às 18h.\n\nPrecisa de mais alguma informação, {nome}?" } },
          ],
          edges: [
            { id: "e1", source: "trigger-1", target: "msg-1", animated: true },
          ],
        },
      },
      {
        name: "Triagem com Múltiplas Condições",
        description: "Direciona o contato para a equipe correta com base nas respostas",
        trigger_type: "first_message",
        status: "paused",
        user_id: userId,
        company_id: company.id,
        flow_data: {
          nodes: [
            { id: "trigger-1", type: "trigger", position: { x: 300, y: 50 }, data: { label: "Nova Conversa", triggerType: "first_message" } },
            { id: "q-1", type: "question", position: { x: 300, y: 180 }, data: { label: "Departamento", question: "Com qual setor deseja falar?", options: ["Vendas", "Suporte", "Financeiro"] } },
            { id: "cond-1", type: "condition", position: { x: 100, y: 330 }, data: { label: "É Vendas?", condition: "resposta contém 'Vendas'" } },
            { id: "cond-2", type: "condition", position: { x: 400, y: 330 }, data: { label: "É Suporte?", condition: "resposta contém 'Suporte'" } },
            { id: "t-1", type: "transfer", position: { x: 50, y: 480 }, data: { label: "Transferir Vendas", teamName: "Vendas" } },
            { id: "t-2", type: "transfer", position: { x: 300, y: 480 }, data: { label: "Transferir Suporte", teamName: "Suporte" } },
            { id: "t-3", type: "transfer", position: { x: 550, y: 480 }, data: { label: "Transferir Financeiro", teamName: "Financeiro" } },
          ],
          edges: [
            { id: "e1", source: "trigger-1", target: "q-1", animated: true },
            { id: "e2", source: "q-1", target: "cond-1", animated: true },
            { id: "e3", source: "cond-1", target: "t-1", animated: true, sourceHandle: "yes" },
            { id: "e4", source: "cond-1", target: "cond-2", animated: true, sourceHandle: "no" },
            { id: "e5", source: "cond-2", target: "t-2", animated: true, sourceHandle: "yes" },
            { id: "e6", source: "cond-2", target: "t-3", animated: true, sourceHandle: "no" },
          ],
        },
      },
    ];

    // Insert example automations (non-blocking, best-effort)
    await supabaseAdmin
      .from("automations")
      .insert(exampleAutomations);

    return new Response(
      JSON.stringify({ company_id: company.id, message: "Company created" }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
