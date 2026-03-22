/**
 * PERFIL PAGE — Com "Confirmar Recebimento" nos pedidos
 * 
 * EXPLICAÇÃO:
 * - Meus Anúncios: lista com opção de excluir.
 * - Meus Pedidos: mostra status e botão "Confirmar Recebimento"
 *   que libera o valor para o vendedor.
 * - Pedidos Recebidos (como vendedor): mostra se o comprador confirmou.
 */

import Layout from "@/components/Layout";
import { Star, Settings, LogOut, ChevronRight, Trash2, CheckCircle } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  if (!user) {
    navigate("/login");
    return null;
  }

  const displayName = user.user_metadata?.display_name || user.email?.split("@")[0] || "Usuário";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const { data: myProducts } = useQuery({
    queryKey: ["my-products", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: myOrders } = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, products(name)").eq("buyer_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const { data: receivedOrders } = useQuery({
    queryKey: ["received-orders", user.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, products(name)").eq("seller_id", user.id).order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase.from("products").delete().eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio excluído!");
      queryClient.invalidateQueries({ queryKey: ["my-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    },
  });

  const confirmReceipt = useMutation({
    mutationFn: async (orderId: string) => {
      const { error } = await supabase.from("orders").update({
        buyer_confirmed_receipt: true,
        status: "delivered",
      }).eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Recebimento confirmado! Valor liberado ao vendedor.");
      queryClient.invalidateQueries({ queryKey: ["my-orders"] });
      queryClient.invalidateQueries({ queryKey: ["received-orders"] });
    },
  });

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado!");
    navigate("/login");
  };

  const statusLabels: Record<string, string> = {
    pending: "Pendente",
    paid: "Pago",
    shipped: "Enviado",
    delivered: "Entregue",
    cancelled: "Cancelado",
  };

  const statusColors: Record<string, string> = {
    paid: "bg-primary/10 text-primary",
    pending: "bg-yellow-100 text-yellow-700",
    delivered: "bg-green-100 text-green-700",
    cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
            {initials}
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
          </div>
        </div>

        {/* Meus Anúncios */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Meus Anúncios</h3>
          {myProducts && myProducts.length > 0 ? (
            <div className="space-y-2">
              {myProducts.map((product) => (
                <div key={product.id} className="flex items-center justify-between p-3 bg-card rounded-xl border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      R$ {Number(product.price).toFixed(2).replace(".", ",")}/{product.price_unit} · {product.category}
                    </p>
                  </div>
                  <button
                    onClick={() => { if (confirm("Excluir este anúncio?")) deleteProduct.mutate(product.id); }}
                    className="p-2 rounded-lg hover:bg-destructive/10 text-destructive active:scale-[0.95] transition-all ml-2"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Você não tem anúncios publicados.</p>
          )}
        </div>

        {/* Meus Pedidos (como comprador) */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Meus Pedidos</h3>
          {myOrders && myOrders.length > 0 ? (
            <div className="space-y-2">
              {myOrders.map((order) => (
                <div key={order.id} className="p-3 bg-card rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{(order as any).products?.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || "bg-secondary text-secondary-foreground"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
                    {order.payment_type === "delivery" && " · Pagamento na entrega"}
                  </p>
                  {/* Botão confirmar recebimento */}
                  {order.status === "paid" && !order.buyer_confirmed_receipt && (
                    <button
                      onClick={() => confirmReceipt.mutate(order.id)}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium
                                 hover:bg-green-700 active:scale-[0.97] transition-all"
                    >
                      <CheckCircle className="w-3.5 h-3.5" />
                      Confirmar Recebimento
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum pedido realizado.</p>
          )}
        </div>

        {/* Pedidos Recebidos (como vendedor) */}
        {receivedOrders && receivedOrders.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-foreground mb-3">Pedidos Recebidos</h3>
            <div className="space-y-2">
              {receivedOrders.map((order) => (
                <div key={order.id} className="p-3 bg-card rounded-xl border border-border">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{(order as any).products?.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusColors[order.status] || "bg-secondary text-secondary-foreground"}`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
                    {order.buyer_confirmed_receipt && (
                      <span className="text-green-600 font-medium"> · ✅ Recebido — valor liberado</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="space-y-1 mb-8">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left active:scale-[0.98]">
            <Star className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Favoritos</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left active:scale-[0.98]">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Configurações</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 transition-colors text-left mt-4 active:scale-[0.98]"
          >
            <LogOut className="w-5 h-5 text-destructive" />
            <span className="flex-1 text-sm font-medium text-destructive">Sair</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Perfil;
