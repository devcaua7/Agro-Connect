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
import { Trash2, Minus, Plus, ShoppingCart, CreditCard, Truck } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const Carrinho = () => {
  const { items, removeItem, updateQuantity, clearCart, totalPrice } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentType, setPaymentType] = useState<"online" | "delivery">("online");
  const [processing, setProcessing] = useState(false);

  if (!user) {
    navigate("/login");
    return null;
  }

  const handleCheckout = async () => {
    if (items.length === 0) return;
    
    // Check for demo items
    const hasDemoItems = items.some(item => item.productId.startsWith("demo-"));
    if (hasDemoItems) {
      toast.success("Pedido de demonstração criado com sucesso! Em produção, os pedidos seriam salvos no banco.");
      clearCart();
      navigate("/perfil");
      return;
    }

    setProcessing(true);

    try {
      const generateCode = () => String(Math.floor(100000 + Math.random() * 900000));

      const orders = items.map((item) => ({
        buyer_id: user.id,
        product_id: item.productId,
        seller_id: item.sellerId,
        quantity: item.quantity,
        total_price: item.price * item.quantity,
        status: "pending",
        payment_type: paymentType,
        payment_method: paymentType === "online" ? "mercado_pago" : "na_entrega",
        delivery_code: generateCode(),
      }));

      const { data, error } = await supabase.from("orders").insert(orders).select();
      if (error) throw error;

      if (paymentType === "online" && data && data.length > 0) {
        clearCart();
        navigate("/pagamento/" + data[0].id);
      } else {
        clearCart();
        toast.success("Pedidos criados! O vendedor será notificado.");
        navigate("/perfil");
      }
    } catch {
      toast.error("Erro ao finalizar compra.");
    } finally {
      setProcessing(false);
    }
  };

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
