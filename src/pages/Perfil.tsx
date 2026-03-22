/**
 * PERFIL PAGE — Página de perfil do usuário autenticado
 * 
 * EXPLICAÇÃO:
 * - Usa o AuthContext para exibir dados reais do usuário logado.
 * - O botão "Sair" chama signOut() que encerra a sessão no Supabase.
 * - "Meus Anúncios" mostra os produtos do próprio usuário.
 * - O avatar exibe as iniciais do nome (técnica usada quando não há foto).
 * - Se o usuário não estiver logado, redireciona para login.
 */

import Layout from "@/components/Layout";
import { User, Star, Settings, LogOut, ChevronRight, Trash2 } from "lucide-react";
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
  const initials = displayName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  // Busca anúncios do próprio usuário
  const { data: myProducts } = useQuery({
    queryKey: ["my-products", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Busca pedidos do usuário
  const { data: myOrders } = useQuery({
    queryKey: ["my-orders", user.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("orders")
        .select("*, products(name)")
        .eq("buyer_id", user.id)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Excluir produto
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

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl">
        {/* Header do perfil */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground 
                        flex items-center justify-center text-xl font-bold">
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
                    onClick={() => {
                      if (confirm("Excluir este anúncio?")) deleteProduct.mutate(product.id);
                    }}
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

        {/* Meus Pedidos */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-foreground mb-3">Meus Pedidos</h3>
          {myOrders && myOrders.length > 0 ? (
            <div className="space-y-2">
              {myOrders.map((order) => (
                <div key={order.id} className="p-3 bg-card rounded-xl border border-border">
                  <p className="text-sm font-medium text-foreground">{(order as any).products?.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-xs text-muted-foreground">
                      R$ {Number(order.total_price).toFixed(2).replace(".", ",")}
                    </p>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      order.status === "paid" ? "bg-primary/10 text-primary" :
                      order.status === "pending" ? "bg-yellow-100 text-yellow-700" :
                      "bg-secondary text-secondary-foreground"
                    }`}>
                      {statusLabels[order.status] || order.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum pedido realizado.</p>
          )}
        </div>

        {/* Menu de opções */}
        <div className="space-y-1">
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           hover:bg-secondary transition-colors duration-200 text-left active:scale-[0.98]">
            <Star className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Favoritos</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           hover:bg-secondary transition-colors duration-200 text-left active:scale-[0.98]">
            <Settings className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Configurações</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                       hover:bg-destructive/10 transition-colors duration-200 text-left mt-4 active:scale-[0.98]"
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
