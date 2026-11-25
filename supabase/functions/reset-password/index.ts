// Peace Staff — admin password reset edge function.
// Deploy: Supabase Dashboard → Edge Functions → New Function → name it
// "reset-password" → paste this code → Deploy.
// The function verifies the caller is an admin before resetting.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // 1. Identify the caller from their JWT
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await userClient.auth.getUser();
    if (userErr || !user) {
      return json({ ok: false, error: "Not signed in." }, 401);
    }

    // 2. Caller must be an admin
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") {
      return json({ ok: false, error: "Only administrators can reset passwords." }, 403);
    }

    // 3. Read target + new password
    const { userId, newPassword } = await req.json();
    if (!userId || !newPassword || newPassword.length < 6) {
      return json({ ok: false, error: "User and a 6+ character password are required." }, 400);
    }
    if (userId === user.id) {
      return json({ ok: false, error: "Use Change My Password for your own account." }, 400);
    }

    // 4. Reset via Admin API + flag must-change
    const { error: updErr } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword,
    });
    if (updErr) return json({ ok: false, error: updErr.message }, 400);
    await adminClient.from("profiles").update({ must_change_password: true }).eq("id", userId);

    return json({ ok: true });
  } catch (e) {
    return json({ ok: false, error: e.message || "Reset failed." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
