// Libera o valor retido para o vendedor via transferência PIX (AbacatePay /v2/pix/send).
// Chamado pelo PRÓPRIO VENDEDOR após digitar o código de entrega de 6 dígitos.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const readAbacateResponse = async (res: Response) => {
  const text = await res.text();
  console.log("[AbacatePay] status:", res.status, "body:", text);
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

    const { orderId, deliveryCode } = await req.json();
    if (!orderId) throw new Error("orderId obrigatório");
    if (!deliveryCode || String(deliveryCode).length !== 6) {
      throw new Error("Código de entrega de 6 dígitos obrigatório");
    }

    const { data: order } = await admin
      .from("orders")
      .select("id, buyer_id, seller_id, total_price, status, delivery_code, payment_method")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) throw new Error("Pedido não encontrado");
    if (order.seller_id !== userData.user.id) throw new Error("Só o vendedor pode confirmar a entrega");
    if (order.status !== "paid") throw new Error("Pedido não está aguardando entrega");
    if (String(order.delivery_code) !== String(deliveryCode)) throw new Error("Código de entrega incorreto");

    // Se não é PIX, apenas marca como entregue (sem chamar AbacatePay)
    if (order.payment_method !== "abacatepay_pix") {
      await admin
        .from("orders")
        .update({
          status: "delivered",
          buyer_confirmed_receipt: true,
        })
        .eq("id", order.id);
      return new Response(JSON.stringify({ success: true, payoutId: null, receiptUrl: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("pix_key, pix_key_type, display_name")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (!sellerProfile?.pix_key || !sellerProfile?.pix_key_type) {
      throw new Error("Cadastre sua chave PIX no perfil para receber o pagamento");
    }

    const amountCents = Math.round(Number(order.total_price) * 100);

    // A doc tem inconsistência: o exemplo usa pixKey/pixKeyType no raiz,
    // mas o OpenAPI spec usa pix: { key, type }.
    // Testando com pixKey/pixKeyType no raiz (formato do exemplo da doc):
    const requestBody = {
      amount: amountCents,
      externalId: `order-${order.id}`,
      description: `Repasse AgroConnect pedido ${order.id.slice(0, 8)}`,
      pixKey: sellerProfile.pix_key,
      pixKeyType: sellerProfile.pix_key_type,
    };

    console.log("[AbacatePay] POST /v2/pix/send body:", JSON.stringify(requestBody));

    const res = await fetch("https://api.abacatepay.com/v2/pix/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
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
        abacatepay_receipt_url: tx.receiptUrl ?? null,
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

    return new Response(JSON.stringify({ success: true, payoutId: tx.id, receiptUrl: tx.receiptUrl ?? null }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("release-payout failed:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
