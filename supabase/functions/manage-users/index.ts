import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
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

    // Verify caller identity
    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user: caller }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !caller) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get caller's profile to find company_id
    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("company_id, role")
      .eq("user_id", caller.id)
      .single();

    if (!callerProfile) {
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only admins and managers can manage users
    const allowedRoles = ["admin", "manager"];
    if (!allowedRoles.includes(callerProfile.role)) {
      return new Response(JSON.stringify({ error: "Only admins and managers can manage users" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action } = body;

    // LIST users in the same company
    if (action === "list") {
      const { data: profiles, error } = await supabaseAdmin
        .from("profiles")
        .select("id, user_id, full_name, role, created_at")
        .eq("company_id", callerProfile.company_id);

      if (error) throw error;

      // Get emails from auth.users
      const userIds = profiles?.map((p) => p.user_id) || [];
      const usersWithEmail = [];

      for (const profile of profiles || []) {
        const { data: { user } } = await supabaseAdmin.auth.admin.getUserById(profile.user_id);
        usersWithEmail.push({
          ...profile,
          email: user?.email || "—",
        });
      }

      return new Response(JSON.stringify({ users: usersWithEmail }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // INVITE a new user
    if (action === "invite") {
      const { email, full_name, role } = body;

      if (!email || !role) {
        return new Response(JSON.stringify({ error: "email and role are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validRoles = ["manager", "agent"];
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Role must be manager or agent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Always use invite flow — avoids cross-tenant user enumeration
      let userId: string;

      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(email);
      
      if (inviteError) {
        if (inviteError.message?.includes("already been registered") || inviteError.message?.includes("already exists")) {
          const { data: existingUsersList } = await supabaseAdmin.auth.admin.listUsers();
          const existingUser = existingUsersList?.users?.find((u) => u.email === email);
          
          if (!existingUser) {
            throw new Error("User exists but could not be resolved");
          }

          const { data: existingProfile } = await supabaseAdmin
            .from("profiles")
            .select("id")
            .eq("user_id", existingUser.id)
            .eq("company_id", callerProfile.company_id)
            .maybeSingle();

          if (existingProfile) {
            return new Response(JSON.stringify({ error: "User already belongs to this company" }), {
              status: 409,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            });
          }

          userId = existingUser.id;
        } else {
          throw inviteError;
        }
      } else {
        userId = inviteData.user.id;
      }

      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: userId,
          company_id: callerProfile.company_id,
          full_name: full_name || null,
          role,
        });

      if (profileError) throw profileError;

      const roleMapping: Record<string, string> = { manager: "manager", agent: "agent" };
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({
          user_id: userId,
          role: roleMapping[role],
        });

      if (roleError) throw roleError;

      return new Response(JSON.stringify({ message: "User invited successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE a new user with password (no invite email)
    if (action === "create_user") {
      const { email, password, full_name, role } = body;

      if (!email || !password || !role) {
        return new Response(JSON.stringify({ error: "email, password and role are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validRoles = ["manager", "agent"];
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Role must be manager or agent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user with password
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createUserError) throw createUserError;

      // Create profile
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: newUser.user.id,
          company_id: callerProfile.company_id,
          full_name: full_name || null,
          role,
        });

      if (profileError) throw profileError;

      // Create user_role entry
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role });

      if (roleError) throw roleError;

      return new Response(JSON.stringify({ message: "User created successfully" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // UPDATE role
    if (action === "update_role") {
      const { user_id, role } = body;

      if (!user_id || !role) {
        return new Response(JSON.stringify({ error: "user_id and role are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Can't change own role
      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot change your own role" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const validRoles = ["manager", "agent"];
      if (!validRoles.includes(role)) {
        return new Response(JSON.stringify({ error: "Role must be manager or agent" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update profile role
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .update({ role })
        .eq("user_id", user_id)
        .eq("company_id", callerProfile.company_id);

      if (profileError) throw profileError;

      // Update user_roles
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);

      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id, role });

      if (roleError) throw roleError;

      return new Response(JSON.stringify({ message: "Role updated" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // REMOVE user from company
    if (action === "remove") {
      const { user_id } = body;

      if (!user_id) {
        return new Response(JSON.stringify({ error: "user_id is required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (user_id === caller.id) {
        return new Response(JSON.stringify({ error: "Cannot remove yourself" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Delete profile for this company
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .delete()
        .eq("user_id", user_id)
        .eq("company_id", callerProfile.company_id);

      if (profileError) throw profileError;

      // Delete user_roles
      await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user_id);

      return new Response(JSON.stringify({ message: "User removed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // CREATE COMPANY WITH USER (admin SaaS)
    if (action === "create_company_with_user") {
      const { email, password, full_name, company_name, cnpj } = body;

      if (!email || !password || !company_name) {
        return new Response(JSON.stringify({ error: "email, password and company_name are required" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Create auth user with password
      const { data: newUser, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });

      if (createUserError) throw createUserError;

      // Create company
      const { data: company, error: companyError } = await supabaseAdmin
        .from("companies")
        .insert({ name: company_name, cnpj: cnpj || null })
        .select()
        .single();

      if (companyError) throw companyError;

      // Create profile linking user to company as admin
      const { error: profileError } = await supabaseAdmin
        .from("profiles")
        .insert({
          user_id: newUser.user.id,
          company_id: company.id,
          full_name: full_name || null,
          role: "admin",
        });

      if (profileError) throw profileError;

      // Create admin user_role
      const { error: roleError } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: newUser.user.id, role: "admin" });

      if (roleError) throw roleError;

      return new Response(JSON.stringify({ message: "Company and user created", company_id: company.id }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
