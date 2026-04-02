/**
 * MINHAS VENDAS — Histórico de vendas do vendedor
 * 
 * EXPLICAÇÃO:
 * - Exibe todos os pedidos recebidos pelo vendedor (seller_id).
 * - O vendedor vê: produto, comprador, status e campo para digitar o código.
 * - Quando o vendedor digita o código correto de 6 dígitos, o status muda
 *   para "delivered" e o pagamento é liberado.
 * - Isso simula o fluxo de entrega: comprador informa código → vendedor valida.
 */

import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { ArrowLeft, Clock, CheckCircle, XCircle, Package, MessageCircle, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

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

  const { data: orders, isLoading } = useQuery({
    queryKey: ["minhas-vendas", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name, image_url)")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: buyerProfiles } = useQuery({
    queryKey: ["buyer-profiles-vendas", orders],
    queryFn: async () => {
      const buyerIds = [...new Set(orders?.map((o) => o.buyer_id) ?? [])];
      if (buyerIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name, city, phone")
        .in("user_id", buyerIds);
      return data ?? [];
    },
    enabled: !!orders && orders.length > 0,
  });

  const confirmDelivery = useMutation({
    mutationFn: async ({ orderId, code }: { orderId: string; code: string }) => {
      // Find the order to check the code
      const order = orders?.find((o) => o.id === orderId);
      if (!order) throw new Error("Pedido não encontrado");
      if (order.delivery_code !== code) throw new Error("Código incorreto");

      const { error } = await supabase
        .from("orders")
        .update({ status: "delivered", buyer_confirmed_receipt: true })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Entrega confirmada! Pagamento liberado.");
      queryClient.invalidateQueries({ queryKey: ["minhas-vendas"] });
    },
    onError: (err: Error) => {
      if (err.message === "Código incorreto") {
        toast.error("Código incorreto! Peça o código correto ao comprador.");
      } else {
        toast.error("Erro ao confirmar entrega.");
      }
    },
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
          <h2 className="text-xl font-bold text-foreground">Minhas Vendas</h2>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : orders && orders.length > 0 ? (
          <div className="space-y-4">
            {orders.map((order) => {
              const product = (order as any).products;
              const buyer = buyerProfiles?.find((p) => p.user_id === order.buyer_id);
              const config = statusConfig[order.status] || statusConfig.pending;
              const codeValue = codeInputs[order.id] || "";

              return (
                <div key={order.id} className="p-4 bg-card rounded-xl border border-border">
                  {/* Header */}
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-muted-foreground">
                      {new Date(order.created_at).toLocaleDateString("pt-BR")} · Pedido #{order.id.slice(0, 6)}
                    </p>
                    <span className={`text-xs px-2.5 py-1 rounded-full ${config.color}`}>
                      {config.label}
                    </span>
                  </div>

                  {/* Product + buyer info */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-14 h-14 rounded-lg bg-secondary overflow-hidden flex-shrink-0">
                      {product?.image_url ? (
                        <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">Sem img</div>
                      )}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">{product?.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Comprador: {buyer?.display_name || "Usuário"}
                      </p>
                      {buyer?.city && (
                        <p className="text-xs text-muted-foreground">Cidade: {buyer.city}</p>
                      )}
                      <p className="text-xs text-muted-foreground">Qtd: {order.quantity}</p>
                    </div>
                    <p className="text-base font-bold text-primary">
                      R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
                    </p>
                  </div>

                  {/* Code input for delivery confirmation - only for paid orders */}
                  {order.status === "paid" && order.delivery_code && (
                    <div className="p-3 bg-secondary/50 rounded-lg border border-dashed border-border mb-3">
                      <div className="flex items-start gap-2 mb-3">
                        <ShieldCheck className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground">
                          Peça o código de entrega ao comprador e digite abaixo para confirmar a entrega e liberar o pagamento.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          maxLength={6}
                          value={codeValue}
                          onChange={(e) => setCodeInputs((prev) => ({ ...prev, [order.id]: e.target.value.replace(/\D/g, "") }))}
                          placeholder="000000"
                          className="flex-1 px-3 py-2.5 rounded-lg bg-background border border-border text-center text-lg font-bold
                                     tracking-[0.3em] tabular-nums text-foreground placeholder:text-muted-foreground/40"
                        />
                        <button
                          onClick={() => confirmDelivery.mutate({ orderId: order.id, code: codeValue })}
                          disabled={codeValue.length !== 6 || confirmDelivery.isPending}
                          className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium
                                     hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50"
                        >
                          Confirmar
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Delivered */}
                  {order.status === "delivered" && (
                    <div className="p-3 bg-green-50 rounded-lg border border-green-200 mb-3">
                      <p className="text-xs text-green-700 flex items-center gap-1.5">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Entrega confirmada! Pagamento liberado para você.
                      </p>
                    </div>
                  )}

                  {/* Talk to buyer */}
                  <button
                    onClick={() => navigate(`/chat?seller=${order.buyer_id}&product=${order.product_id}`)}
                    className="w-full py-2.5 rounded-lg border border-border text-sm font-medium text-foreground
                               hover:bg-secondary active:scale-[0.98] transition-all flex items-center justify-center gap-2"
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
            <p className="text-muted-foreground text-sm">Nenhuma venda realizada ainda.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default MinhasVendas;
