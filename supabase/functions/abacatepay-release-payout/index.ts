// Libera o valor retido para o vendedor via PIX (AbacatePay /v2/pix/send).
// Chamado quando o comprador confirma o recebimento.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!apiKey) throw new Error("ABACATEPAY_API_KEY ausente");

    const authHeader = req.headers.get("Authorization") ?? "";
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orderId } = await req.json();
    if (!orderId) throw new Error("orderId obrigatório");

    const { data: order } = await admin
      .from("orders")
      .select("id, buyer_id, seller_id, total_price, status")
      .eq("id", orderId)
      .maybeSingle();

    if (!order) throw new Error("Pedido não encontrado");
    if (order.buyer_id !== userData.user.id) throw new Error("Só o comprador pode liberar");

    // Pega chave PIX do vendedor
    const { data: sellerProfile } = await admin
      .from("profiles")
      .select("pix_key, pix_key_type, display_name")
      .eq("user_id", order.seller_id)
      .maybeSingle();

    if (!sellerProfile?.pix_key || !sellerProfile?.pix_key_type) {
      throw new Error("Vendedor não cadastrou chave PIX no perfil");
    }

    const amountCents = Math.round(Number(order.total_price) * 100);

    const res = await fetch("https://api.abacatepay.com/v2/pix/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCents,
        externalId: `order-${order.id}`,
        description: `Repasse AgroConnect - pedido ${order.id.slice(0, 8)}`,
        pix: {
          key: sellerProfile.pix_key,
          type: sellerProfile.pix_key_type,
        },
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      console.error("AbacatePay payout error", json);
      throw new Error(json.error?.message ?? "Falha ao enviar PIX ao vendedor");
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
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
