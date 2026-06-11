// Cria uma cobrança PIX via AbacatePay e marca os pedidos com o QR code retornado.
// Mantém valor na carteira (status 'held') depois que o pagamento for confirmado pelo check.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const ABACATE_URL = "https://api.abacatepay.com/v1/pixQrCode/create";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("ABACATEPAY_API_KEY");
    if (!apiKey) throw new Error("ABACATEPAY_API_KEY ausente");

    const authHeader = req.headers.get("Authorization") ?? "";
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: userData } = await supabaseClient.auth.getUser();
    if (!userData?.user) throw new Error("Não autenticado");

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { orderIds, totalAmount, description } = await req.json();
    if (!Array.isArray(orderIds) || orderIds.length === 0) throw new Error("orderIds vazios");
    if (typeof totalAmount !== "number" || totalAmount <= 0) throw new Error("totalAmount inválido");

    const amountCents = Math.round(totalAmount * 100);

    const res = await fetch(ABACATE_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: amountCents,
        expiresIn: 600,
        description: description ?? `AgroConnect pedidos ${orderIds.length}`,
      }),
    });

    const json = await res.json();
    if (!res.ok || json.error) {
      console.error("AbacatePay create error", json);
      throw new Error(json.error?.message ?? "Falha ao criar PIX");
    }

    const qr = json.data;
    // Salva o ID nos pedidos para que o check encontre depois
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
    console.error(e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
