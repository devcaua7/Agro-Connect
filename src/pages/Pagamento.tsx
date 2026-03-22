/**
 * PAGAMENTO PAGE — Simulação de pagamento com Mercado Pago
 * 
 * EXPLICAÇÃO:
 * - Esta página simula o fluxo de pagamento do Mercado Pago.
 * - Em produção, aqui seria integrada a SDK do Mercado Pago para
 *   processar pagamentos reais (PIX, cartão, boleto).
 * - Por enquanto, simula o processo para fins de demonstração no TCC.
 * - O pedido é atualizado no banco com status "paid" ao confirmar.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { CreditCard, QrCode, FileText, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const Pagamento = () => {
  const { productId } = useParams<{ productId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "boleto">("pix");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);

  // Busca o pedido mais recente para este produto
  const { data: order } = useQuery({
    queryKey: ["order", productId, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, price, price_unit, image_url)")
        .eq("product_id", productId!)
        .eq("buyer_id", user!.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: !!productId && !!user,
  });

  // Simula o pagamento
  const processPayment = useMutation({
    mutationFn: async () => {
      setProcessing(true);
      // Simula delay de processamento (em produção seria a API do Mercado Pago)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from("orders")
        .update({ status: "paid", payment_method: "mercado_pago" })
        .eq("id", order!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setPaid(true);
      setProcessing(false);
      toast.success("Pagamento confirmado!");
    },
    onError: () => {
      setProcessing(false);
      toast.error("Erro no pagamento. Tente novamente.");
    },
  });

  if (paid) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-8 max-w-md mx-auto text-center">
          <div className="animate-fade-in-up">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Pagamento Confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-6">
              Seu pedido foi processado com sucesso. O vendedor será notificado.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                         hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Voltar ao Início
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-8 text-center">
          <p className="text-muted-foreground">Nenhum pedido pendente encontrado.</p>
          <button onClick={() => navigate("/")} className="mt-4 text-primary font-medium hover:underline">
            Voltar ao Início
          </button>
        </div>
      </Layout>
    );
  }

  const product = (order as any).products;

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-md mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">Pagamento</h2>

        {/* Resumo do pedido */}
        <div className="p-4 bg-card rounded-xl border border-border mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-2">Resumo do Pedido</h3>
          <p className="text-sm text-muted-foreground">{product?.name}</p>
          <p className="text-sm text-muted-foreground">
            Quantidade: {order.quantity} {product?.price_unit}
          </p>
          <p className="text-lg font-bold text-primary mt-2">
            Total: R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
          </p>
        </div>

        {/* Método de pagamento */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-foreground mb-3">Método de Pagamento</h3>
          <div className="space-y-2">
            {[
              { key: "pix" as const, icon: QrCode, label: "PIX", desc: "Aprovação instantânea" },
              { key: "card" as const, icon: CreditCard, label: "Cartão", desc: "Crédito ou débito" },
              { key: "boleto" as const, icon: FileText, label: "Boleto", desc: "Até 3 dias úteis" },
            ].map((method) => (
              <button
                key={method.key}
                onClick={() => setPaymentMethod(method.key)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]
                  ${paymentMethod === method.key
                    ? "border-primary bg-primary/5"
                    : "border-border bg-card hover:bg-secondary"
                  }`}
              >
                <method.icon className={`w-5 h-5 ${paymentMethod === method.key ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{method.label}</p>
                  <p className="text-xs text-muted-foreground">{method.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* PIX QR Code simulado */}
        {paymentMethod === "pix" && (
          <div className="p-4 bg-card rounded-xl border border-border mb-6 text-center">
            <div className="w-32 h-32 bg-secondary rounded-lg mx-auto mb-3 flex items-center justify-center">
              <QrCode className="w-16 h-16 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">QR Code PIX (simulado)</p>
          </div>
        )}

        {/* Botão pagar */}
        <button
          onClick={() => processPayment.mutate()}
          disabled={processing}
          className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                     hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2
                     disabled:opacity-50"
        >
          {processing ? (
            <>
              <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
              Processando...
            </>
          ) : (
            `Pagar R$ ${Number(order.total_price).toFixed(2).replace(".", ",")}`
          )}
        </button>

        <p className="text-xs text-muted-foreground text-center mt-3">
          Simulação de pagamento Mercado Pago para fins acadêmicos.
        </p>
      </div>
    </Layout>
  );
};

export default Pagamento;
