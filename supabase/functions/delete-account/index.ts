import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // Handle CORS preflight — mobile browsers send this before the real request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  const auth = req.headers.get("Authorization");
  if (!auth) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  // Resolve the calling user from their JWT
  const userClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Unauthorized — could not resolve user." }),
      {
        status: 401,
        headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
      },
    );
  }

  // Use service role to perform privileged deletes
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  // Explicitly wipe user-owned rows (belt-and-braces alongside FK cascades)
  const uid = user.id;
  await admin
    .from("reviews")
    .delete()
    .or(`reviewer_id.eq.${uid},seller_id.eq.${uid}`);
  await admin.from("saved_listings").delete().eq("user_id", uid);
  await admin.from("listing_engagements").delete().eq("user_id", uid);
  await admin.from("reports").delete().eq("reporter_id", uid);
  await admin.from("notifications").delete().eq("user_id", uid);
  await admin.from("contact_numbers").delete().eq("user_id", uid);
  await admin.from("notification_preferences").delete().eq("user_id", uid);
  await admin.from("privacy_settings").delete().eq("user_id", uid);
  await admin.from("trust_logs").delete().eq("profile_id", uid);
  await admin.from("listings").delete().eq("seller_id", uid);
  await admin.from("profiles").delete().eq("id", uid);

  // Finally delete the auth user — triggers any remaining FK cascades
  const { error: deleteError } = await admin.auth.admin.deleteUser(uid);
  if (deleteError) {
    return new Response(JSON.stringify({ error: deleteError.message }), {
      status: 500,
      headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
});
