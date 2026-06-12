/**
 * CARRINHO PAGE — Página do carrinho de compras
 *
 * FLUXO UNIFICADO:
 * 1. Lista itens → escolhe forma de pagamento (online ou na entrega)
 * 2. Se ONLINE: mostra tela de opções (PIX / Cartão / Boleto) com simulação
 *    → depois mostra confirmação com código + botão de chat por produto
 * 3. Se ENTREGA: vai direto para confirmação com código + chat por produto
 */

import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import {
  Trash2, Minus, Plus, ShoppingCart, CreditCard, Truck, MessageCircle,
  Copy, CheckCircle2, QrCode, FileText, ArrowLeft, Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { useState, useEffect, useRef } from "react";

interface DeliveryConfirmation {
  code: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  sellerId: string;
  quantity: number;
  priceUnit: string;
  totalPrice: number;
}

interface PixData {
  qrId: string;
  brCode: string;
  brCodeBase64: string;
  realOrderIds: string[];
  devMode: boolean;
}

type Step = "cart" | "payment-options" | "pix-waiting" | "confirmation";
type OnlineMethod = "pix" | "card" | "boleto";

const Carrinho = () => {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"online" | "delivery">("online");
  const [onlineMethod, setOnlineMethod] = useState<OnlineMethod>("pix");
  const [processing, setProcessing] = useState(false);
  const [step, setStep] = useState<Step>("cart");
  const [confirmations, setConfirmations] = useState<DeliveryConfirmation[] | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const pollRef = useRef<number | null>(null);

  // Campos do cartão (exemplo / simulação)
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [installments, setInstallments] = useState(1);

  const formatCardNumber = (v: string) =>
    v.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 ");
  const formatExpiry = (v: string) => {
    const d = v.replace(/\D/g, "").slice(0, 4);
    return d.length > 2 ? `${d.slice(0, 2)}/${d.slice(2)}` : d;
  };
  const fillExample = () => {
    setCardNumber("4111 1111 1111 1111");
    setCardName("MARIA DA SILVA");
    setCardExpiry("12/29");
    setCardCvv("123");
  };
  const isCardValid =
    cardNumber.replace(/\s/g, "").length === 16 &&
    cardName.trim().length >= 3 &&
    cardExpiry.length === 5 &&
    cardCvv.length >= 3;

  const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

  // Etapa 1: clicar em "Ir para Pagamento" ou "Confirmar Pedido"
  const handleCartContinue = () => {
    if (items.length === 0) return;
    if (paymentType === "online") {
      setStep("payment-options");
    } else {
      finalizeOrder("delivery");
    }
  };

  // Cleanup do poller
  useEffect(() => {
    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
  }, []);

  // Redirect quando não autenticado (depois dos hooks p/ respeitar Rules of Hooks)
  useEffect(() => {
    if (!user) navigate("/login");
  }, [user, navigate]);

  if (!user) return null;

  // Helper: cria orders no Supabase + demo no localStorage. Retorna confirmations e IDs reais.
  const createOrders = async (mode: "online" | "delivery"): Promise<{
    confirmations: DeliveryConfirmation[];
    realOrderIds: string[];
  }> => {
    const demoItems = items.filter((item) => item.productId.startsWith("demo-"));
    const realItems = items.filter((item) => !item.productId.startsWith("demo-"));

    const itemConfirmations: DeliveryConfirmation[] = items.map((item) => ({
      code: generateCode(),
      productId: item.productId,
      productName: item.name,
      imageUrl: item.imageUrl,
      sellerId: item.sellerId,
      quantity: item.quantity,
      priceUnit: item.priceUnit,
      totalPrice: item.price * item.quantity,
    }));

    const paymentMethod =
      mode === "online"
        ? onlineMethod === "pix"
          ? "abacatepay_pix"
          : onlineMethod === "card"
          ? "cartao_simulado"
          : "boleto_simulado"
        : "na_entrega";

    // PIX real fica em pending até confirmar; outros online já como paid
    const initialStatus =
      mode === "online" && onlineMethod !== "pix" ? "paid" : mode === "online" ? "pending" : "pending";

    // Demo orders → localStorage
    if (demoItems.length > 0) {
      const { addDemoOrder, generateDemoId } = await import("@/utils/demoOrders");
      demoItems.forEach((item) => {
        const conf = itemConfirmations.find((c) => c.productId === item.productId)!;
        addDemoOrder({
          id: generateDemoId(),
          product_id: item.productId,
          product_name: item.name,
          product_image: item.imageUrl,
          product_price_unit: item.priceUnit,
          buyer_id: user.id,
          seller_id: item.sellerId,
          seller_name: "Produtor Demo",
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          status: mode === "online" ? "paid" : "pending",
          delivery_code: conf.code,
          payment_type: mode,
          payment_method: paymentMethod,
          created_at: new Date().toISOString(),
        });
      });
    }

    let realOrderIds: string[] = [];
    if (realItems.length > 0) {
      const orders = realItems.map((item) => {
        const conf = itemConfirmations.find((c) => c.productId === item.productId)!;
        return {
          buyer_id: user.id,
          product_id: item.productId,
          seller_id: item.sellerId,
          quantity: item.quantity,
          total_price: item.price * item.quantity,
          status: initialStatus,
          payment_type: mode,
          payment_method: paymentMethod,
          delivery_code: conf.code,
        };
      });
      const { data, error } = await supabase.from("orders").insert(orders).select("id");
      if (error) throw error;
      realOrderIds = (data ?? []).map((o) => o.id);
    }

    return { confirmations: itemConfirmations, realOrderIds };
  };

  // Fluxo geral (entrega, cartão, boleto): cria pedidos e vai pra confirmação
  const finalizeOrder = async (mode: "online" | "delivery") => {
    setProcessing(true);
    try {
      const { confirmations: conf } = await createOrders(mode);
      if (mode === "online") {
        await new Promise((r) => setTimeout(r, 1200));
        toast.success("Pagamento confirmado!");
      }
      setConfirmations(conf);
      setStep("confirmation");
      clearCart();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao finalizar compra.");
    } finally {
      setProcessing(false);
    }
  };

  // Fluxo PIX real (AbacatePay)
  const startPixFlow = async () => {
    setProcessing(true);
    try {
      const { confirmations: conf, realOrderIds } = await createOrders("online");
      const realTotal = items
        .filter((i) => !i.productId.startsWith("demo-"))
        .reduce((s, i) => s + i.price * i.quantity, 0);

      // Sem itens reais → simula direto
      if (realOrderIds.length === 0 || realTotal <= 0) {
        await new Promise((r) => setTimeout(r, 1200));
        toast.success("Pagamento PIX confirmado (modo demo)!");
        setConfirmations(conf);
        setStep("confirmation");
        clearCart();
        return;
      }

      const { data, error } = await supabase.functions.invoke("abacatepay-create-pix", {
        body: { orderIds: realOrderIds, totalAmount: realTotal },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);

      setPixData({
        qrId: data.id,
        brCode: data.brCode,
        brCodeBase64: data.brCodeBase64,
        realOrderIds,
        devMode: !!data.devMode,
      });
      setConfirmations(conf);
      setStep("pix-waiting");

      // Poll a cada 4s
      if (pollRef.current) window.clearInterval(pollRef.current);
      pollRef.current = window.setInterval(() => checkPixStatus(data.id, false), 4000);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message ?? "Erro ao gerar PIX");
    } finally {
      setProcessing(false);
    }
  };

  const checkPixStatus = async (qrId: string, simulate: boolean) => {
    if (checkingPayment) return;
    setCheckingPayment(true);
    try {
      const { data, error } = await supabase.functions.invoke("abacatepay-check-pix", {
        body: { qrId, simulate },
      });
      if (error) throw error;
      if (data?.paid) {
        if (pollRef.current) {
          window.clearInterval(pollRef.current);
          pollRef.current = null;
        }
        toast.success("Pagamento PIX recebido!");
        setStep("confirmation");
        clearCart();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCheckingPayment(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };


  // ============ TELA DE CONFIRMAÇÃO (código + chat) ============
  if (step === "confirmation" && confirmations) {
    const isOnline = paymentType === "online";
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">
              {isOnline ? "Pagamento confirmado!" : "Pedido confirmado!"}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              {isOnline
                ? "Apresente o código abaixo ao vendedor para receber o produto. Você também pode combinar os detalhes pelo chat."
                : "Pagamento será feito na entrega. Combine com o vendedor e apresente o código abaixo no momento da entrega."}
            </p>
          </div>

          <div className="space-y-3 mb-6">
            {confirmations.map((c) => (
              <div key={c.code} className="p-4 bg-card rounded-xl border border-border">
                <div className="flex gap-3 mb-3">
                  <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {c.imageUrl ? (
                      <img src={c.imageUrl} alt={c.productName} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-[10px]">
                        Sem img
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{c.productName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.quantity} {c.priceUnit} · R$ {c.totalPrice.toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>

                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                  <p className="text-[11px] text-muted-foreground mb-1">Código de entrega</p>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xl font-bold text-primary tracking-[0.3em] tabular-nums">{c.code}</span>
                    <button
                      onClick={() => copyCode(c.code)}
                      className="p-2 rounded-lg hover:bg-secondary active:scale-[0.95] transition-all"
                      aria-label="Copiar código"
                    >
                      <Copy className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </div>
                </div>

                <button
                  onClick={() =>
                    navigate(
                      `/chat?seller=${encodeURIComponent(c.sellerId)}&product=${encodeURIComponent(
                        c.productId
                      )}&productName=${encodeURIComponent(c.productName)}${
                        c.sellerId.startsWith("demo-") || c.productId.startsWith("demo-") ? "&demo=true" : ""
                      }`
                    )
                  }
                  className="w-full py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                             hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                  Falar com vendedor sobre este produto
                </button>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => navigate("/minhas-compras")}
              className="py-3 rounded-xl bg-secondary text-foreground font-medium text-sm hover:bg-secondary/80 active:scale-[0.97] transition-all"
            >
              Minhas Compras
            </button>
            <button
              onClick={() => {
                setConfirmations(null);
                setStep("cart");
                navigate("/");
              }}
              className="py-3 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover:opacity-90 active:scale-[0.97] transition-all"
            >
              Continuar comprando
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // ============ TELA DE OPÇÕES DE PAGAMENTO (online) ============
  if (step === "payment-options") {
    const methods = [
      { key: "pix" as const, icon: QrCode, label: "PIX", desc: "Aprovação instantânea" },
      { key: "card" as const, icon: CreditCard, label: "Cartão", desc: "Crédito ou débito" },
      { key: "boleto" as const, icon: FileText, label: "Boleto", desc: "Até 3 dias úteis" },
    ];
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-md mx-auto">
          <button
            onClick={() => setStep("cart")}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Voltar ao carrinho
          </button>

          <h2 className="text-xl font-bold text-foreground mb-6">Pagamento</h2>

          <div className="p-4 bg-card rounded-xl border border-border mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-2">Resumo</h3>
            <p className="text-sm text-muted-foreground">
              {items.length} {items.length === 1 ? "item" : "itens"} no pedido
            </p>
            <p className="text-lg font-bold text-primary mt-2">
              Total: R$ {totalPrice.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold text-foreground mb-3">Método de Pagamento</h3>
            <div className="space-y-2">
              {methods.map((m) => (
                <button
                  key={m.key}
                  onClick={() => setOnlineMethod(m.key)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-[0.98]
                    ${onlineMethod === m.key ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <m.icon className={`w-5 h-5 ${onlineMethod === m.key ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="text-sm font-medium text-foreground">{m.label}</p>
                    <p className="text-xs text-muted-foreground">{m.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {onlineMethod === "pix" && (
            <div className="p-4 bg-card rounded-xl border border-border mb-6 text-center">
              <div className="w-20 h-20 bg-primary/10 rounded-2xl mx-auto mb-3 flex items-center justify-center">
                <QrCode className="w-10 h-10 text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground">QR Code PIX será gerado</p>
              <p className="text-xs text-muted-foreground mt-1">
                Integração real via AbacatePay. O valor fica retido na carteira até a confirmação do recebimento.
              </p>
            </div>
          )}


          {onlineMethod === "card" && (
            <div className="p-4 bg-card rounded-xl border border-border mb-6 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground">Dados do cartão</h4>
                <button
                  type="button"
                  onClick={fillExample}
                  className="text-[11px] text-primary font-medium hover:underline"
                >
                  Usar exemplo
                </button>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Número do cartão</label>
                <input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4111 1111 1111 1111"
                  inputMode="numeric"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
                />
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Nome impresso no cartão</label>
                <input
                  value={cardName}
                  onChange={(e) => setCardName(e.target.value.toUpperCase())}
                  placeholder="MARIA DA SILVA"
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-muted-foreground">Validade</label>
                  <input
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(formatExpiry(e.target.value))}
                    placeholder="MM/AA"
                    inputMode="numeric"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-muted-foreground">CVV</label>
                  <input
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm tabular-nums"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] text-muted-foreground">Parcelamento</label>
                <select
                  value={installments}
                  onChange={(e) => setInstallments(Number(e.target.value))}
                  className="w-full mt-1 px-3 py-2 rounded-lg border border-border bg-background text-sm"
                >
                  {Array.from({ length: 12 }).map((_, i) => {
                    const n = i + 1;
                    const value = totalPrice / n;
                    const label =
                      n === 1
                        ? `1x de R$ ${totalPrice.toFixed(2).replace(".", ",")} (à vista)`
                        : `${n}x de R$ ${value.toFixed(2).replace(".", ",")} sem juros`;
                    return (
                      <option key={n} value={n}>
                        {label}
                      </option>
                    );
                  })}
                </select>
              </div>

              <p className="text-[10px] text-muted-foreground text-center pt-1">
                Ambiente de simulação — nenhum dado real é armazenado.
              </p>
            </div>
          )}

          {onlineMethod === "boleto" && (
            <div className="p-4 bg-card rounded-xl border border-border mb-6 text-center">
              <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Boleto será gerado após a confirmação (simulado).</p>
            </div>
          )}

          <button
            onClick={() => (onlineMethod === "pix" ? startPixFlow() : finalizeOrder("online"))}
            disabled={processing || (onlineMethod === "card" && !isCardValid)}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                       hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {processing ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                {onlineMethod === "pix" ? "Gerando PIX..." : "Processando..."}
              </>
            ) : onlineMethod === "card" && installments > 1 ? (
              `Pagar ${installments}x de R$ ${(totalPrice / installments).toFixed(2).replace(".", ",")}`
            ) : (
              `Pagar R$ ${totalPrice.toFixed(2).replace(".", ",")}`
            )}
          </button>

          <p className="text-xs text-muted-foreground text-center mt-3">
            {onlineMethod === "pix"
              ? "PIX processado em tempo real via AbacatePay."
              : "Simulação de pagamento (cartão / boleto)."}
          </p>
        </div>
      </Layout>
    );
  }

  // ============ TELA PIX REAL (aguardando pagamento) ============
  if (step === "pix-waiting" && pixData) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-md mx-auto">
          <button
            onClick={() => {
              if (pollRef.current) window.clearInterval(pollRef.current);
              setStep("payment-options");
              setPixData(null);
            }}
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> Cancelar
          </button>

          <h2 className="text-xl font-bold text-foreground mb-2">Pague com PIX</h2>
          <p className="text-sm text-muted-foreground mb-6">
            Escaneie o QR Code ou copie o código abaixo. Assim que pagar, o valor fica retido na carteira
            da plataforma até você confirmar o recebimento.
          </p>

          <div className="p-4 bg-card rounded-xl border border-border mb-4 text-center">
            {pixData.brCodeBase64 ? (
              <img
                src={
                  pixData.brCodeBase64.startsWith("data:")
                    ? pixData.brCodeBase64
                    : `data:image/png;base64,${pixData.brCodeBase64}`
                }
                alt="QR Code PIX"
                className="w-56 h-56 mx-auto rounded-lg"
              />
            ) : (
              <div className="w-56 h-56 mx-auto bg-secondary rounded-lg flex items-center justify-center">
                <QrCode className="w-20 h-20 text-muted-foreground" />
              </div>
            )}
            <p className="text-lg font-bold text-primary mt-3">
              R$ {totalPrice.toFixed(2).replace(".", ",")}
            </p>
          </div>

          <div className="p-3 bg-card rounded-xl border border-border mb-4">
            <p className="text-[11px] text-muted-foreground mb-1">PIX Copia e Cola</p>
            <div className="flex items-center gap-2">
              <p className="text-xs text-foreground break-all flex-1 font-mono">{pixData.brCode}</p>
              <button
                onClick={() => copyCode(pixData.brCode)}
                className="p-2 rounded-lg hover:bg-secondary active:scale-[0.95] transition-all flex-shrink-0"
              >
                <Copy className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
          </div>

          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            Aguardando confirmação do pagamento...
          </div>

          {pixData.devMode && (
            <button
              onClick={() => checkPixStatus(pixData.qrId, true)}
              disabled={checkingPayment}
              className="w-full py-2.5 rounded-xl border border-dashed border-primary text-primary
                         text-sm font-medium hover:bg-primary/5 active:scale-[0.97] transition-all disabled:opacity-50"
            >
              {checkingPayment ? "Verificando..." : "Simular pagamento (modo dev)"}
            </button>
          )}
        </div>
      </Layout>
    );
  }

  // ============ TELA PRINCIPAL DO CARRINHO ============
  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <ShoppingCart className="w-5 h-5" /> Carrinho
        </h2>

        {items.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Seu carrinho está vazio.</p>
            <button
              onClick={() => navigate("/")}
              className="mt-4 text-primary text-sm font-medium hover:underline"
            >
              Ver produtos
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-3 bg-card rounded-xl border border-border">
                  <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Sem img
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {item.price.toFixed(2).replace(".", ",")}/{item.priceUnit}
                    </p>

                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center active:scale-[0.9] transition-transform"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-sm font-medium w-8 text-center tabular-nums">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="w-7 h-7 rounded-lg bg-secondary flex items-center justify-center active:scale-[0.9] transition-transform"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end justify-between">
                    <button
                      onClick={() => removeItem(item.productId)}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive active:scale-[0.9] transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <p className="text-sm font-bold text-primary">
                      R$ {(item.price * item.quantity).toFixed(2).replace(".", ",")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mb-6">
              <h3 className="text-sm font-semibold text-foreground mb-3">Forma de pagamento</h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setPaymentType("online")}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all active:scale-[0.98]
                    ${paymentType === "online" ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <CreditCard className={`w-4 h-4 ${paymentType === "online" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Pagar pelo site</p>
                    <p className="text-[10px] text-muted-foreground">PIX, cartão, boleto</p>
                  </div>
                </button>
                <button
                  onClick={() => setPaymentType("delivery")}
                  className={`flex items-center gap-2 p-3 rounded-xl border transition-all active:scale-[0.98]
                    ${paymentType === "delivery" ? "border-primary bg-primary/5" : "border-border bg-card hover:bg-secondary"}`}
                >
                  <Truck className={`w-4 h-4 ${paymentType === "delivery" ? "text-primary" : "text-muted-foreground"}`} />
                  <div className="text-left">
                    <p className="text-xs font-medium text-foreground">Pagar na entrega</p>
                    <p className="text-[10px] text-muted-foreground">Combine com vendedor</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">Total ({items.length} {items.length === 1 ? "item" : "itens"})</span>
                <span className="text-lg font-bold text-primary">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <button
                onClick={handleCartContinue}
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
                ) : paymentType === "online" ? (
                  "Ir para Pagamento"
                ) : (
                  "Confirmar Pedido"
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
};

export default Carrinho;
