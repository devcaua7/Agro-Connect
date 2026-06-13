// Cria uma cobrança PIX via AbacatePay (Checkout Transparente v2).
// Doc: https://docs.abacatepay.com/pages/transparents/create.md
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ABACATE_URL = "https://api.abacatepay.com/v2/transparents/create";

const readAbacateResponse = async (res: Response) => {
  const text = await res.text();
  try {
    return text ? JSON.parse(text) : {};
  } catch (_error) {
    return { error: text || `HTTP ${res.status}` };
  }
};

const getAbacateError = (json: any, fallback: string) => {
  if (!json?.error) return fallback;
  if (typeof json.error === "string") return json.error;
  return json.error.message ?? json.error.code ?? fallback;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!apiKey) throw new Error("ABACATEPAY_API_KEY ausente");

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) throw new Error("Não autenticado");

    const admin = createClient(SUPABASE_URL, SERVICE);

    const { orderIds, totalAmount, description, customer } = await req.json();
    if (!Array.isArray(orderIds) || orderIds.length === 0) throw new Error("orderIds vazios");
    if (typeof totalAmount !== "number" || totalAmount <= 0) throw new Error("totalAmount inválido");

    const amountCents = Math.round(totalAmount * 100);

    const payload: Record<string, unknown> = {
      method: "PIX",
      data: {
        amount: amountCents,
        expiresIn: 600,
        description: description ?? `AgroConnect pedidos ${orderIds.length}`,
        metadata: { orderIds },
        ...(customer ? { customer } : {}),
      },
    };

    const res = await fetch(ABACATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const json = await readAbacateResponse(res);
    if (!res.ok || json.error) {
      console.error("AbacatePay create error", res.status, json);
      throw new Error(getAbacateError(json, `HTTP ${res.status}`));
    }

    const qr = json.data;

    await admin
      .from("orders")
      .update({
        abacatepay_qr_id: qr.id,
        abacatepay_qr_brcode: qr.brCode,
        abacatepay_qr_image: qr.brCodeBase64,
        payment_method: "abacatepay_pix",
      })
      .in("id", orderIds);

    return new Response(
      JSON.stringify({
        id: qr.id,
        brCode: qr.brCode,
        brCodeBase64: qr.brCodeBase64,
        amount: qr.amount,
        expiresAt: qr.expiresAt,
        status: qr.status,
        devMode: qr.devMode,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("create-pix failed:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
