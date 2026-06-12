// Consulta status de um PIX na AbacatePay. Se pago, marca pedidos como 'paid'
// e cria registros 'held' na carteira (escrow da plataforma).
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
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

    const { qrId, simulate } = await req.json();
    if (!qrId) throw new Error("qrId obrigatório");

    if (simulate) {
      const simRes = await fetch(
        `https://api.abacatepay.com/v1/pixQrCode/simulate-payment?id=${qrId}`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ metadata: {} }),
        }
      );
      const simJson = await simRes.json().catch(() => ({}));
      console.log("simulate-payment response", simRes.status, simJson);
    }

    const res = await fetch(`https://api.abacatepay.com/v1/pixQrCode/check?id=${qrId}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const json = await res.json();
    if (!res.ok || json.error) {
      console.error("check error", res.status, json);
      throw new Error(json.error?.message ?? json.error ?? `HTTP ${res.status}`);
    }

    const status = json.data?.status as string;
    let paid = false;

    if (status === "PAID") {
      paid = true;
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
    console.error("check-pix failed:", e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
