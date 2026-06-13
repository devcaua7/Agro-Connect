// Libera o valor retido para o vendedor via transferência PIX (AbacatePay /v2/pix/create).
// Chamado quando o comprador confirma o recebimento.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId obrigatório");

    const { data: order } = await admin
      .from("orders")
      .select("id, buyer_id, seller_id, total_price, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) throw new Error("Pedido não encontrado");
    if (order.buyer_id !== userData.user.id) throw new Error("Só o comprador pode liberar");

    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("pix_key, pix_key_type, display_name")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (!sellerProfile?.pix_key || !sellerProfile?.pix_key_type) {
      throw new Error("Vendedor não cadastrou chave PIX no perfil");
    }

    const amountCents = Math.round(Number(order.total_price) * 100);

    const res = await fetch("https://api.abacatepay.com/v2/pix/create", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCents,
        externalId: `order-${order.id}`,
        description: `Repasse AgroConnect pedido ${order.id.slice(0, 8)}`,
        pixKey: sellerProfile.pix_key,
        pixKeyType: sellerProfile.pix_key_type,
      }),
    });

    const json = await readAbacateResponse(res);
    if (!res.ok || json.error) {
      console.error("AbacatePay payout error", res.status, json);
      throw new Error(getAbacateError(json, `HTTP ${res.status}`));
    }

    const tx = json.data;

    await admin
      .from("orders")
      .update({
        status: "delivered",
        buyer_confirmed_receipt: true,
        abacatepay_payout_id: tx.id,
        abacatepay_receipt_url: tx.receiptUrl,
      })
      .eq("id", order.id);

    await admin
      .from("wallet_transactions")
      .update({
        status: "released",
        released_at: new Date().toISOString(),
        abacatepay_payout_id: tx.id,
      })
      .eq("order_id", order.id);

    return new Response(
      JSON.stringify({ success: true, payoutId: tx.id, receiptUrl: tx.receiptUrl }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("release-payout failed:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
