/**
 * MINHAS VENDAS — Histórico de vendas do vendedor
 * - Pedidos reais + demo
 * - Soft delete (hidden_by_seller) + apagar todo o histórico
 * - Mostra saldo da carteira (held vs released) e link do comprovante PIX
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import {
  ArrowLeft, CheckCircle, Package, MessageCircle, ShieldCheck, Wallet, Trash2, Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { getDemoOrders, updateDemoOrderStatus, type DemoOrder } from "@/utils/demoOrders";

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "Aguardando Pagamento", color: "bg-yellow-100 text-yellow-700" },
  paid: { label: "Pago - Aguardando Entrega", color: "bg-blue-100 text-blue-700" },
  delivered: { label: "Entregue - Pago", color: "bg-green-100 text-green-700" },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive" },
};

const MinhasVendas = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [codeInputs, setCodeInputs] = useState<Record<string, string>>({});
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>([]);

  const reloadDemo = () => {
    if (user) {
      const hidden: string[] = JSON.parse(localStorage.getItem("hidden_demo_vendas_" + user.id) || "[]");
      setDemoOrders(getDemoOrders().filter((o) => !hidden.includes(o.id)));
    }
  };

  useEffect(() => {
    reloadDemo();
  }, [user]);

  const { data: dbOrders, isLoading } = useQuery({
    queryKey: ["minhas-vendas", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, image_url)")
        .eq("seller_id", user!.id)
        .eq("hidden_by_seller", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: wallet } = useQuery({
    queryKey: ["wallet", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("wallet_transactions")
        .select("amount, status")
        .eq("seller_id", user!.id);
      return data ?? [];
    },
    enabled: !!user,
  });

  const heldAmount = (wallet ?? []).filter((w) => w.status === "held").reduce((s, w) => s + Number(w.amount), 0);
  const releasedAmount = (wallet ?? []).filter((w) => w.status === "released").reduce((s, w) => s + Number(w.amount), 0);

  const { data: buyerProfiles } = useQuery({
    queryKey: ["buyer-profiles-vendas", dbOrders?.map((o) => o.buyer_id).join(",")],
    queryFn: async () => {
      const buyerIds = [...new Set(dbOrders?.map((o) => o.buyer_id) ?? [])];
      if (buyerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, city, phone")
        .in("user_id", buyerIds);
      return data ?? [];
    },
    enabled: !!dbOrders && dbOrders.length > 0,
  });

  // Mantém o fluxo de demo (vendedor digita código), não usado em PIX real
  const confirmDeliveryDemo = useMutation({
    mutationFn: async ({ orderId, code }: { orderId: string; code: string }) => {
      const order = demoOrders.find((o) => o.id === orderId);
      if (!order) throw new Error("Pedido não encontrado");
      if (order.delivery_code !== code) throw new Error("Código incorreto");
      updateDemoOrderStatus(orderId, "delivered");
      setDemoOrders((prev) => prev.map((o) => (o.id === orderId ? { ...o, status: "delivered" } : o)));
    },
    onSuccess: () => toast.success("Entrega confirmada (demo)!"),
    onError: (err: Error) => toast.error(err.message),
  });

  const hideOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ hidden_by_seller: true })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido removido do seu histórico.");
      queryClient.invalidateQueries({ queryKey: ["minhas-vendas"] });
    },
  });

  const hideDemo = (orderId: string) => {
    if (!user) return;
    const key = "hidden_demo_vendas_" + user.id;
    const h: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    if (!h.includes(orderId)) h.push(orderId);
    localStorage.setItem(key, JSON.stringify(h));
    reloadDemo();
    toast.success("Pedido removido do seu histórico.");
  };

  const clearAllHistory = async () => {
    if (!user) return;
    if (!confirm("Apagar TODO o histórico de vendas? Os compradores continuarão vendo. Esta ação é apenas para o seu lado.")) return;
    await supabase.from("orders").update({ hidden_by_seller: true }).eq("seller_id", user.id);
    const all = getDemoOrders().map((o) => o.id);
    localStorage.setItem("hidden_demo_vendas_" + user.id, JSON.stringify(all));
    reloadDemo();
    queryClient.invalidateQueries({ queryKey: ["minhas-vendas"] });
    toast.success("Histórico apagado.");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const allOrders = [
    ...(dbOrders ?? []).map((order) => {
      const product = (order as any).products;
      const buyer = buyerProfiles?.find((p) => p.user_id === order.buyer_id);
      return {
        id: order.id,
        productName: product?.name ?? "Produto",
        productImage: product?.image_url ?? null,
        buyerName: buyer?.display_name ?? "Comprador",
        buyerCity: buyer?.city,
        quantity: order.quantity,
        totalPrice: Number(order.total_price),
        status: order.status,
        deliveryCode: order.delivery_code,
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        receiptUrl: (order as any).abacatepay_receipt_url,
        isDemo: false,
      };
    }),
    ...demoOrders.map((order) => ({
      id: order.id,
      productName: order.product_name,
      productImage: order.product_image,
      buyerName: "Comprador Demo",
      buyerCity: null as string | null,
      quantity: order.quantity,
      totalPrice: order.total_price,
      status: order.status,
      deliveryCode: order.delivery_code,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      receiptUrl: null as string | null,
      isDemo: true,
    })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate("/perfil")} className="active:scale-[0.9] transition-transform">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <h2 className="text-xl font-bold text-foreground">Minhas Vendas</h2>
          </div>
          {allOrders.length > 0 && (
            <button
              onClick={clearAllHistory}
              className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 transition-colors"
            >
              <Eraser className="w-3.5 h-3.5" /> Apagar histórico
            </button>
          )}
        </div>

        {/* Carteira */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="p-3 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-yellow-600" />
              <p className="text-xs text-muted-foreground">A receber</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              R$ {heldAmount.toFixed(2).replace(".", ",")}
            </p>
          </div>
          <div className="p-3 bg-card rounded-xl border border-border">
            <div className="flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-green-600" />
              <p className="text-xs text-muted-foreground">Já recebido</p>
            </div>
            <p className="text-lg font-bold text-foreground">
              R$ {releasedAmount.toFixed(2).replace(".", ",")}
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : allOrders.length > 0 ? (
          <div className="space-y-4">
            {allOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const codeValue = codeInputs[order.id] || "";
              const isPix = order.paymentMethod === "abacatepay_pix";

              return (
                <div key={order.id} className="p-4 bg-card rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")} · Pedido #{order.id.slice(0, 6)}
                      {order.isDemo && <span className="ml-1 text-primary">(Demo)</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full ${config.color}`}>{config.label}</span>
                      <button
                        onClick={() => (order.isDemo ? hideDemo(order.id) : hideOrder.mutate(order.id))}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
                        title="Remover do meu histórico"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {order.productImage ? (
                        <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{order.productName}</p>
                      <p className="text-xs text-muted-foreground">Comprador: {order.buyerName}</p>
                      {order.buyerCity && <p className="text-xs text-muted-foreground">Cidade: {order.buyerCity}</p>}
                      <p className="text-xs text-muted-foreground">Qtd: {order.quantity}</p>
                    </div>
                    <p className="text-base font-bold text-primary">
                      R$ {order.totalPrice.toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {order.status === "paid" && isPix && !order.isDemo && (
                    <div className="p-3 bg-yellow-50 dark:bg-yellow-950/30 rounded-lg border border-yellow-200 dark:border-yellow-900 mb-3">
                      <p className="text-xs text-yellow-800 dark:text-yellow-200">
                        💰 Valor retido. Será enviado pra sua chave PIX assim que o comprador confirmar o recebimento.
                      </p>
                    </div>
                  )}

                  {order.status === "paid" && order.deliveryCode && order.isDemo && (
                    <div className="p-3 bg-secondary/50 rounded-lg border border-dashed border-border mb-3">
                      <div className="flex items-start gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Peça o código ao comprador para simular a confirmação da entrega.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={codeValue}
                          onChange={(e) =>
                            setCodeInputs((prev) => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, "") }))
                          }
                          placeholder="000000"
                          className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-center text-lg font-bold tracking-[0.3em] tabular-nums text-foreground placeholder:text-muted-foreground/40"
                        />
                        <button
                          onClick={() => confirmDeliveryDemo.mutate({ orderId: order.id, code: codeValue })}
                          disabled={codeValue.length !== 6 || confirmDeliveryDemo.isPending}
                          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}

                  {order.status === "delivered" && (
                    <div className="p-3 bg-green-50 dark:bg-green-950/30 rounded-lg border border-green-200 dark:border-green-900 mb-3">
                      <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Entrega confirmada! Pagamento liberado.
                      </p>
                      {order.receiptUrl && (
                        <a href={order.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline mt-1 inline-block">
                          Ver comprovante PIX
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/chat`)}
                    className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-foreground hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Falar com Comprador
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma venda no histórico.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MinhasVendas;
