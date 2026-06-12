// Consulta status de um PIX na AbacatePay. Se pago, marca pedidos como 'paid'
// e cria registros 'held' na carteira (escrow da plataforma).
// Suporta `simulate=true` em devMode (endpoint /simulate-payment da AbacatePay) para o TCC.
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
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await client.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { qrId, simulate } = await req.json();
    if (!qrId) throw new Error("qrId obrigatório");

    // Em devMode/sandbox podemos simular o pagamento
    if (simulate) {
      await fetch(`https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${qrId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: {} }),
      });
    }

    const res = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${qrId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json();
    if (!res.ok || json.error) throw new Error(json.error?.message ?? "Falha ao consultar PIX");

    const status = json.data?.status as string;
    let paid = false;

    if (status === "PAID") {
      paid = true;
      // Pega pedidos com esse qrId
      const { data: orders } = await admin
        .from("orders")
        .select("id, buyer_id, seller_id, total_price, status")
        .eq("abacatepay_qr_id", qrId);

      for (const o of orders ?? []) {
        if (o.status === "paid") continue;
        await admin.from("orders").update({ status: "paid" }).eq("id", o.id);
        await admin.from("wallet_transactions").insert({
          order_id: o.id,
          seller_id: o.seller_id,
          buyer_id: o.buyer_id,
          amount: o.total_price,
          status: "held",
          abacatepay_payin_id: qrId,
        });
      }
    }

    return new Response(JSON.stringify({ status, paid }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
