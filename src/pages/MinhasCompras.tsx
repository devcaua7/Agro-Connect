/**
 * MINHAS COMPRAS — Histórico de compras do comprador
 * - Pedidos reais (banco) + pedidos demo (localStorage)
 * - Suporta soft delete por pedido e "apagar todo o histórico" (oculta para o comprador)
 * - Botão "Confirmar Recebimento" libera o PIX via AbacatePay para o vendedor
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import {
  ArrowLeft, Clock, CheckCircle, XCircle, Truck, MessageCircle, Trash2, Eraser,
} from "lucide-react";
import { toast } from "sonner";
import { getDemoOrders, type DemoOrder } from "@/utils/demoOrders";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Aguardando Pagamento", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  paid: { label: "Aguardando Entrega", color: "bg-blue-100 text-blue-700", icon: Clock },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const MinhasCompras = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [demoOrders, setDemoOrders] = useState<DemoOrder[]>([]);

  const reloadDemo = () => {
    if (user) {
      const hiddenIds: string[] = JSON.parse(localStorage.getItem("hidden_demo_compras_" + user.id) || "[]");
      const all = getDemoOrders().filter((o) => o.buyer_id === user.id && !hiddenIds.includes(o.id));
      setDemoOrders(all);
    }
  };

  useEffect(() => {
    reloadDemo();
  }, [user]);

  const { data: dbOrders, isLoading } = useQuery({
    queryKey: ["minhas-compras", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, image_url, price_unit)")
        .eq("buyer_id", user!.id)
        .eq("hidden_by_buyer", false)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: sellerProfiles } = useQuery({
    queryKey: ["seller-profiles-compras", dbOrders?.map((o) => o.seller_id).join(",")],
    queryFn: async () => {
      const sellerIds = [...new Set(dbOrders?.map((o) => o.seller_id) ?? [])];
      if (sellerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", sellerIds);
      return data ?? [];
    },
    enabled: !!dbOrders && dbOrders.length > 0,
  });

  const releasePayment = useMutation({
    mutationFn: async (orderId: string) => {
      const { data, error } = await supabase.functions.invoke("abacatepay-release-payout", {
        body: { orderId },
      });
      if (error || data?.error) throw new Error(data?.error ?? error?.message);
      return data;
    },
    onSuccess: () => {
      toast.success("Recebimento confirmado! PIX enviado ao vendedor.");
      queryClient.invalidateQueries({ queryKey: ["minhas-compras"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  // Confirma recebimento de pedidos que não usaram PIX (ex.: cartão, entrega)
  const confirmManual = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", buyer_confirmed_receipt: true })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento confirmado!");
      queryClient.invalidateQueries({ queryKey: ["minhas-compras"] });
    },
  });

  const hideOrder = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase
        .from("orders")
        .update({ hidden_by_buyer: true })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Pedido removido do seu histórico.");
      queryClient.invalidateQueries({ queryKey: ["minhas-compras"] });
    },
  });

  const hideDemo = (orderId: string) => {
    if (!user) return;
    const key = "hidden_demo_compras_" + user.id;
    const hidden: string[] = JSON.parse(localStorage.getItem(key) || "[]");
    if (!hidden.includes(orderId)) hidden.push(orderId);
    localStorage.setItem(key, JSON.stringify(hidden));
    reloadDemo();
    toast.success("Pedido removido do seu histórico.");
  };

  const clearAllHistory = async () => {
    if (!user) return;
    if (!confirm("Apagar TODO o histórico de compras? Os vendedores continuarão vendo os pedidos. Esta ação é apenas para o seu lado.")) return;
    const { error } = await supabase
      .from("orders")
      .update({ hidden_by_buyer: true })
      .eq("buyer_id", user.id);
    if (error) {
      toast.error("Erro ao apagar histórico real.");
    }
    // Demo: marca todos como hidden
    const all = getDemoOrders().filter((o) => o.buyer_id === user.id).map((o) => o.id);
    localStorage.setItem("hidden_demo_compras_" + user.id, JSON.stringify(all));
    reloadDemo();
    queryClient.invalidateQueries({ queryKey: ["minhas-compras"] });
    toast.success("Histórico apagado.");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const allOrders = [
    ...(dbOrders ?? []).map((order) => {
      const product = (order as any).products;
      const seller = sellerProfiles?.find((p) => p.user_id === order.seller_id);
      return {
        id: order.id,
        productName: product?.name ?? "Produto",
        productImage: product?.image_url ?? null,
        sellerName: seller?.display_name ?? "Produtor",
        quantity: order.quantity,
        totalPrice: Number(order.total_price),
        status: order.status,
        deliveryCode: order.delivery_code,
        paymentMethod: order.payment_method,
        createdAt: order.created_at,
        sellerId: order.seller_id,
        productId: order.product_id,
        receiptUrl: (order as any).abacatepay_receipt_url,
        isDemo: false,
      };
    }),
    ...demoOrders.map((order) => ({
      id: order.id,
      productName: order.product_name,
      productImage: order.product_image,
      sellerName: order.seller_name,
      quantity: order.quantity,
      totalPrice: order.total_price,
      status: order.status,
      deliveryCode: order.delivery_code,
      paymentMethod: order.payment_method,
      createdAt: order.created_at,
      sellerId: order.seller_id,
      productId: order.product_id,
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
            <h2 className="text-xl font-bold text-foreground">Minhas Compras</h2>
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

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : allOrders.length > 0 ? (
          <div className="space-y-4">
            {allOrders.map((order) => {
              const config = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = config.icon;
              const isPix = order.paymentMethod === "abacatepay_pix";

              return (
                <div key={order.id} className="p-4 bg-card rounded-xl border border-border">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.createdAt).toLocaleDateString("pt-BR")} · Pedido #{order.id.slice(0, 6)}
                      {order.isDemo && <span className="ml-1 text-primary">(Demo)</span>}
                    </p>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${config.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {config.label}
                      </span>
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
                    <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {order.productImage ? (
                        <img src={order.productImage} alt={order.productName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{order.productName}</p>
                      <p className="text-xs text-muted-foreground">Vendedor: {order.sellerName}</p>
                      <p className="text-xs text-muted-foreground">Qtd: {order.quantity}</p>
                    </div>
                    <p className="text-base font-bold text-primary">
                      R$ {order.totalPrice.toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {order.status === "paid" && order.deliveryCode && (
                    <div className="p-3 bg-secondary/50 rounded-lg border border-dashed border-border mb-3">
                      <p className="text-xs text-muted-foreground mb-2">
                        {isPix
                          ? "💰 Valor retido na carteira da plataforma. Confirme o recebimento para liberar o PIX ao vendedor."
                          : "Forneça o código abaixo ao vendedor no momento da entrega."}
                      </p>
                      <div className="p-3 border border-dashed border-border rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Código de Entrega</p>
                        <p className="text-3xl font-bold text-foreground tracking-[0.3em] tabular-nums">
                          {order.deliveryCode}
                        </p>
                      </div>
                      {!order.isDemo && (
                        <button
                          onClick={() =>
                            isPix ? releasePayment.mutate(order.id) : confirmManual.mutate(order.id)
                          }
                          disabled={releasePayment.isPending || confirmManual.isPending}
                          className="w-full mt-3 py-2 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          {isPix ? "Confirmar recebimento e liberar PIX" : "Confirmar recebimento"}
                        </button>
                      )}
                    </div>
                  )}

                  {order.status === "delivered" && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-3 dark:bg-green-950/30 dark:border-green-900">
                      <p className="text-xs text-green-700 dark:text-green-300 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Produto entregue! Valor liberado ao vendedor.
                      </p>
                      {order.receiptUrl && (
                        <a
                          href={order.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-primary hover:underline mt-1 inline-block"
                        >
                          Ver comprovante PIX
                        </a>
                      )}
                    </div>
                  )}

                  <button
                    onClick={() => navigate(`/chat?seller=${order.sellerId}&product=${order.productId}`)}
                    className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-foreground
                               hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Falar com Vendedor
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <Truck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">Nenhuma compra no histórico.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MinhasCompras;
