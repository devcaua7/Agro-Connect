/**
 * CARRINHO PAGE — Página do carrinho de compras
 * 
 * EXPLICAÇÃO:
 * - Lista todos os itens adicionados ao carrinho via CartContext.
 * - O usuário pode alterar quantidades ou remover itens.
 * - Opção "Pagar pelo site" (online) ou "Pagar na entrega" (delivery).
 * - Ao finalizar, cria os pedidos no banco e redireciona ao pagamento
 *   ou confirma pedido (se pagamento na entrega).
 */

import { useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartContext";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import { Trash2, Minus, Plus, ShoppingCart, CreditCard, Truck, MessageCircle, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

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

const Carrinho = () => {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"online" | "delivery">("online");
  const [processing, setProcessing] = useState(false);
  const [confirmations, setConfirmations] = useState<DeliveryConfirmation[] | null>(null);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleCheckout = async () => {
    if (items.length === 0) return;

    const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));
    const demoItems = items.filter((item) => item.productId.startsWith("demo-"));
    const realItems = items.filter((item) => !item.productId.startsWith("demo-"));

    setProcessing(true);

    try {
      // Build per-item confirmations (used for "delivery" payment)
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

      // Save demo items to localStorage
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
            status: paymentType === "online" ? "paid" : "pending",
            delivery_code: conf.code,
            payment_type: paymentType,
            payment_method: paymentType === "online" ? "mercado_pago" : "na_entrega",
            created_at: new Date().toISOString(),
          });
        });
      }

      // Save real items to DB
      let firstRealOrderId: string | null = null;
      if (realItems.length > 0) {
        const orders = realItems.map((item) => {
          const conf = itemConfirmations.find((c) => c.productId === item.productId)!;
          return {
            buyer_id: user.id,
            product_id: item.productId,
            seller_id: item.sellerId,
            quantity: item.quantity,
            total_price: item.price * item.quantity,
            status: "pending",
            payment_type: paymentType,
            payment_method: paymentType === "online" ? "mercado_pago" : "na_entrega",
            delivery_code: conf.code,
          };
        });
        const { data, error } = await supabase.from("orders").insert(orders).select();
        if (error) throw error;
        if (data && data.length > 0) firstRealOrderId = data[0].id;
      }

      if (paymentType === "online") {
        clearCart();
        if (firstRealOrderId) {
          navigate("/pagamento/" + firstRealOrderId);
        } else {
          toast.success("Compra realizada! Veja seus pedidos em Minhas Compras.");
          navigate("/minhas-compras");
        }
      } else {
        // Pagamento na entrega — mostrar códigos e botão de chat
        setConfirmations(itemConfirmations);
        clearCart();
      }
    } catch {
      toast.error("Erro ao finalizar compra.");
    } finally {
      setProcessing(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Código copiado!");
  };

  if (confirmations) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-3">
              <CheckCircle2 className="w-7 h-7 text-primary" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Pedido confirmado!</h2>
            <p className="text-sm text-muted-foreground mt-1 max-w-sm">
              Pagamento será feito na entrega. Combine com o vendedor e apresente o código abaixo no momento da entrega.
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
            {/* Lista de itens */}
            <div className="space-y-3 mb-6">
              {items.map((item) => (
                <div key={item.productId} className="flex gap-3 p-3 bg-card rounded-xl border border-border">
                  {/* Imagem */}
                  <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                        Sem img
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {item.price.toFixed(2).replace(".", ",")}/{item.priceUnit}
                    </p>

                    {/* Controles de quantidade */}
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

                  {/* Preço e remover */}
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

            {/* Forma de pagamento */}
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

            {/* Total e finalizar */}
            <div className="p-4 bg-card rounded-xl border border-border">
              <div className="flex justify-between items-center mb-4">
                <span className="text-sm text-muted-foreground">Total ({items.length} {items.length === 1 ? "item" : "itens"})</span>
                <span className="text-lg font-bold text-primary">
                  R$ {totalPrice.toFixed(2).replace(".", ",")}
                </span>
              </div>
              <button
                onClick={handleCheckout}
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
