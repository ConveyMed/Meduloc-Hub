import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // The public /support page (the store support URL) posts here signed out,
    // so the project anon key is accepted. The gateway (verify_jwt) has already
    // checked the token's signature; here we only read its role.
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    let role = "";
    try {
      role = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/"))).role || "";
    } catch (_) {
      role = "";
    }
    if (role !== "anon" && role !== "authenticated") {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const name = String(body.name || "").trim().slice(0, 200);
    const email = String(body.email || "").trim().slice(0, 320);
    const subject = String(body.subject || "").trim().slice(0, 200);
    const message = String(body.message || "").trim().slice(0, 5000);
    const app_name = String(body.app_name || "").trim().slice(0, 100);

    if (!name || !email || !message || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return new Response(
        JSON.stringify({ error: "Name, email, and message are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const appLabel = app_name || "ConveyMed App";
    const subjectLine = subject || `Support Request from ${name}`;
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Store in support_requests table
    const insertRes = await fetch(`${supabaseUrl}/rest/v1/support_requests`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": supabaseKey,
        "Authorization": `Bearer ${supabaseKey}`,
      },
      body: JSON.stringify({
        name,
        email,
        subject: subjectLine,
        message,
        app_name: appLabel,
      }),
    });

    if (!insertRes.ok) {
      console.error("Insert failed:", await insertRes.text());
    }

    // Notify admins via OneSignal push. Targets admin/owner user ids only;
    // this used to go to the "All" segment, i.e. every user's phone.
    const onesignalAppId = Deno.env.get("ONESIGNAL_APP_ID");
    const onesignalKey = Deno.env.get("ONESIGNAL_REST_API_KEY");

    const adminsRes = await fetch(
      `${supabaseUrl}/rest/v1/users?select=id&or=(is_admin.eq.true,is_owner.eq.true)`,
      { headers: { "apikey": supabaseKey, "Authorization": `Bearer ${supabaseKey}` } }
    );
    const adminIds: string[] = adminsRes.ok ? (await adminsRes.json()).map((a: { id: string }) => a.id) : [];

    if (onesignalAppId && onesignalKey && adminIds.length) {
      await fetch("https://api.onesignal.com/notifications", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Key ${onesignalKey}`,
        },
        body: JSON.stringify({
          app_id: onesignalAppId,
          include_aliases: { external_id: adminIds },
          target_channel: "push",
          headings: { en: `Support: ${appLabel}` },
          contents: { en: `${name}: ${message.substring(0, 100)}` },
          data: { type: "support_request" },
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Support contact error:", err);
    return new Response(
      JSON.stringify({ error: "Failed to submit" }),
      { status: 500, headers: { "Access-Control-Allow-Origin": "*", "Content-Type": "application/json" } }
    );
  }
});
