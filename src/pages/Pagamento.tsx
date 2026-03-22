/**
 * PAGAMENTO PAGE — Pagamento com QR Code PIX (timer de 5 minutos)
 * 
 * EXPLICAÇÃO:
 * - Agora busca o pedido pelo ID do pedido (não mais pelo productId).
 * - O QR Code PIX tem um timer de 5 minutos. Se expirar, o pedido é cancelado.
 * - useEffect com setInterval cria um countdown (contagem regressiva).
 * - O valor só é "liberado" ao vendedor quando o comprador confirmar recebimento
 *   (na página de perfil, botão "Confirmar Recebimento").
 * - Suporta PIX, cartão e boleto como métodos.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { CreditCard, QrCode, FileText, CheckCircle, Clock, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect } from "react";

const QR_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutos

const Pagamento = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [paymentMethod, setPaymentMethod] = useState<"pix" | "card" | "boleto">("pix");
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(false);
  const [expired, setExpired] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QR_TIMEOUT_MS);
  const [timerStarted, setTimerStarted] = useState(false);

  // Busca o pedido pelo ID
  const { data: order } = useQuery({
    queryKey: ["order", orderId],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, price, price_unit, image_url)")
        .eq("id", orderId!)
        .maybeSingle();
      return data;
    },
    enabled: !!orderId && !!user,
  });

  // Timer de 5 minutos para o QR Code
  useEffect(() => {
    if (paymentMethod !== "pix" || paid || expired) return;
    if (!timerStarted) {
      setTimerStarted(true);
      setTimeLeft(QR_TIMEOUT_MS);
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1000) {
          clearInterval(interval);
          setExpired(true);
          // Cancela o pedido automaticamente
          if (order?.id) {
            supabase.from("orders").update({ status: "cancelled" }).eq("id", order.id);
          }
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [paymentMethod, paid, expired, timerStarted, order?.id]);

  const minutes = Math.floor(timeLeft / 60000);
  const seconds = Math.floor((timeLeft % 60000) / 1000);

  // Simula o pagamento
  const processPayment = useMutation({
    mutationFn: async () => {
      if (expired) throw new Error("QR Code expirado");
      setProcessing(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const { error } = await supabase
        .from("orders")
        .update({
          status: "paid",
          payment_method: paymentMethod === "pix" ? "mercado_pago_pix" : paymentMethod === "card" ? "mercado_pago_cartao" : "mercado_pago_boleto",
        })
        .eq("id", order!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setPaid(true);
      setProcessing(false);
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      toast.success("Pagamento confirmado!");
    },
    onError: () => {
      setProcessing(false);
      toast.error("Erro no pagamento. Tente novamente.");
    },
  });

  // Tela de QR expirado
  if (expired && !paid) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-8 max-w-md mx-auto text-center">
          <AlertTriangle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-xl font-bold text-foreground mb-2">QR Code Expirado</h2>
          <p className="text-sm text-muted-foreground mb-6">
            O tempo de 5 minutos expirou e o pedido foi cancelado automaticamente.
          </p>
          <button
            onClick={() => navigate("/")}
            className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                       hover:opacity-90 active:scale-[0.97] transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      </Layout>
    );
  }

  if (paid) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-8 max-w-md mx-auto text-center">
          <div className="animate-fade-in-up">
            <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
            <h2 className="text-xl font-bold text-foreground mb-2">Pagamento Confirmado!</h2>
            <p className="text-sm text-muted-foreground mb-2">
              Seu pedido foi processado com sucesso.
            </p>
            <p className="text-xs text-muted-foreground mb-6 bg-secondary/50 p-3 rounded-lg">
              💡 O valor será liberado ao vendedor somente após você confirmar o recebimento do produto
              na aba "Meus Pedidos" do seu perfil.
            </p>
            <button
              onClick={() => navigate("/perfil")}
              className="px-6 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                         hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Ver Meus Pedidos
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
          <p className="text-muted-foreground">Pedido não encontrado.</p>
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

        {/* Resumo */}
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

        {/* PIX QR Code com timer */}
        {paymentMethod === "pix" && (
          <div className="p-4 bg-card rounded-xl border border-border mb-6 text-center">
            <div className="w-32 h-32 bg-secondary rounded-lg mx-auto mb-3 flex items-center justify-center">
              <QrCode className="w-16 h-16 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground mb-2">QR Code PIX (simulado)</p>
            {/* Timer */}
            <div className={`flex items-center justify-center gap-1 text-sm font-medium
              ${timeLeft < 60000 ? "text-destructive" : "text-muted-foreground"}`}>
              <Clock className="w-4 h-4" />
              <span className="tabular-nums">{String(minutes).padStart(2, "0")}:{String(seconds).padStart(2, "0")}</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">Expira em 5 minutos</p>
          </div>
        )}

        {/* Botão pagar */}
        <button
          onClick={() => processPayment.mutate()}
          disabled={processing || expired}
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
          Simulação de pagamento Mercado Pago. O valor será liberado ao vendedor após confirmação de recebimento.
        </p>
      </div>
    </Layout>
  );
};

export default Pagamento;
