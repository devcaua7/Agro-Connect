// Confirma a entrega e libera o valor retido para o vendedor (apenas DB).
// Chamado pelo PRÓPRIO VENDEDOR após digitar o código de entrega de 6 dígitos.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
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

    const now = new Date().toISOString();

    // Marca pedido como entregue
    await admin
      .from("orders")
      .update({
        status: "delivered",
        buyer_confirmed_receipt: true,
      })
      .eq("id", order.id);

    // Libera a wallet_transaction (simula o repasse ao vendedor)
    await admin
      .from("wallet_transactions")
      .update({
        status: "released",
        released_at: now,
      })
      .eq("order_id", order.id);

    return new Response(JSON.stringify({ success: true }), {
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
