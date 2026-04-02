/**
 * MINHAS COMPRAS — Histórico de compras do comprador
 * 
 * EXPLICAÇÃO:
 * - Exibe todos os pedidos feitos pelo usuário logado (buyer_id).
 * - Cada pedido mostra: produto, vendedor, status, valor e código de entrega.
 * - O código de entrega (6 dígitos) é gerado na compra e deve ser informado
 *   ao vendedor no momento do encontro para liberar o pagamento.
 * - Botão "Falar com Vendedor" redireciona ao chat.
 */

import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { ArrowLeft, Clock, CheckCircle, XCircle, Truck, MessageCircle } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Aguardando Pagamento", color: "bg-yellow-100 text-yellow-700", icon: Clock },
  paid: { label: "Aguardando Entrega", color: "bg-blue-100 text-blue-700", icon: Clock },
  delivered: { label: "Entregue", color: "bg-green-100 text-green-700", icon: CheckCircle },
  cancelled: { label: "Cancelado", color: "bg-destructive/10 text-destructive", icon: XCircle },
};

const MinhasCompras = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data: orders, isLoading } = useQuery({
    queryKey: ["minhas-compras", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, image_url, price_unit)")
        .eq("buyer_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: sellerProfiles } = useQuery({
    queryKey: ["seller-profiles-compras", orders],
    queryFn: async () => {
      const sellerIds = [...new Set(orders?.map((o) => o.seller_id) ?? [])];
      if (sellerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", sellerIds);
      return data ?? [];
    },
    enabled: !!orders && orders.length > 0,
  });

  if (!user) {
    navigate("/login");
    return null;
  }

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/perfil")} className="active:scale-[0.9] transition-transform">
            <ArrowLeft className="w-5 h-5 text-muted-foreground" />
          </button>
          <h2 className="text-xl font-bold text-foreground">Minhas Compras</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const product = (order as any).products;
              const seller = sellerProfiles?.find((p) => p.user_id === order.seller_id);
              const config = statusConfig[order.status] || statusConfig.pending;
              const StatusIcon = config.icon;

              return (
                <div key={order.id} className="p-4 bg-card rounded-xl border border-border">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")} · Pedido #{order.id.slice(0, 6)}
                    </p>
                    <span className={`text-xs px-2.5 py-1 rounded-full flex items-center gap-1 ${config.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {config.label}
                    </span>
                  </div>

                  {/* Product info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-16 h-16 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {product?.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Vendedor: {seller?.display_name || "Produtor"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Qtd: {order.quantity}
                      </p>
                    </div>
                    <p className="text-base font-bold text-primary">
                      R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {/* Delivery code - shown when paid/awaiting delivery */}
                  {(order.status === "paid" || order.status === "pending") && order.delivery_code && (
                    <div className="p-3 bg-secondary/50 rounded-lg border border-dashed border-border mb-3">
                      <div className="flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-xs text-muted-foreground">
                            O seu pagamento está seguro. Forneça o código abaixo ao vendedor no momento em que receber o produto para liberar o pagamento.
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 p-3 border border-dashed border-border rounded-lg text-center">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Código de Entrega</p>
                        <p className="text-3xl font-bold text-foreground tracking-[0.3em] tabular-nums">
                          {order.delivery_code}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Delivered confirmation */}
                  {order.status === "delivered" && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-3">
                      <p className="text-xs text-green-700 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Produto entregue! Valor liberado ao vendedor.
                      </p>
                    </div>
                  )}

                  {/* Talk to seller button */}
                  <button
                    onClick={() => navigate(`/chat?seller=${order.seller_id}&product=${order.product_id}`)}
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
            <p className="text-muted-foreground text-sm">Nenhuma compra realizada ainda.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MinhasCompras;
