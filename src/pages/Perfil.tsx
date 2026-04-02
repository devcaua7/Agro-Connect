import Layout from "@/components/Layout";
import { Star, Settings, LogOut, ChevronRight, Trash2, CheckCircle, Camera, Edit2, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState, useRef } from "react";

const Perfil = () => {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editCity, setEditCity] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [uploading, setUploading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["my-profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("user_id", user!.id).maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const displayName = profile?.display_name || user?.user_metadata?.display_name || user?.email?.split("@")[0] || "Usuário";
  const initials = displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const { data: myProducts } = useQuery({
    queryKey: ["my-products", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("*").eq("user_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: myOrders } = useQuery({
    queryKey: ["my-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, products(name)").eq("buyer_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: receivedOrders } = useQuery({
    queryKey: ["received-orders", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("orders").select("*, products(name)").eq("seller_id", user!.id).order("created_at", { ascending: false });
      return data ?? [];
    },
    enabled: !!user,
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

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        display_name: editName || undefined,
        city: editCity || undefined,
        phone: editPhone || undefined,
      }).eq("user_id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Perfil atualizado!");
      setEditing(false);
      queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    },
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${user!.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      toast.error("Erro ao enviar foto.");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(fileName);
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("user_id", user!.id);
    toast.success("Foto atualizada!");
    queryClient.invalidateQueries({ queryKey: ["my-profile"] });
    setUploading(false);
  };

  const startEditing = () => {
    setEditName(profile?.display_name || displayName);
    setEditCity(profile?.city || "");
    setEditPhone(profile?.phone || "");
    setEditing(true);
  };

  const handleLogout = async () => {
    await signOut();
    toast.success("Logout realizado!");
    navigate("/login");
  };

  if (!user) {
    navigate("/login");
    return null;
  }

  const statusLabels: Record<string, string> = {
    pending: "Pendente", paid: "Pago", shipped: "Enviado", delivered: "Entregue", cancelled: "Cancelado",
  };
  const statusColors: Record<string, string> = {
    paid: "bg-primary/10 text-primary", pending: "bg-yellow-100 text-yellow-700",
    delivered: "bg-green-100 text-green-700", cancelled: "bg-destructive/10 text-destructive",
  };

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl">
        {/* Header with avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-primary" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xl font-bold">
                {initials}
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center
                         hover:opacity-90 active:scale-[0.9] transition-all"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} accept="image/*" className="hidden" />
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">{displayName}</h2>
            <p className="text-sm text-muted-foreground">{user.email}</p>
            {profile?.city && <p className="text-xs text-muted-foreground">{profile.city}</p>}
          </div>
          <button onClick={startEditing} className="p-2 rounded-lg hover:bg-secondary transition-colors">
            <Edit2 className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        {/* Edit Profile Modal */}
        {editing && (
          <div className="mb-6 p-4 bg-card rounded-xl border border-border space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-foreground">Editar Perfil</h3>
              <button onClick={() => setEditing(false)} className="p-1"><X className="w-4 h-4 text-muted-foreground" /></button>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Nome</label>
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Cidade</label>
              <input type="text" value={editCity} onChange={(e) => setEditCity(e.target.value)} placeholder="Ex: Campinas, SP"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Telefone</label>
              <input type="tel" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="(11) 99999-9999"
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Email: {user.email} (não editável)</p>
            <button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}
              className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50">
              {updateProfile.isPending ? "Salvando..." : "Salvar"}
            </button>
          </div>
        )}

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

        {/* Meus Pedidos */}
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
                  {order.status === "paid" && !order.buyer_confirmed_receipt && (
                    <button onClick={() => confirmReceipt.mutate(order.id)}
                      className="mt-2 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs font-medium hover:bg-green-700 active:scale-[0.97] transition-all">
                      <CheckCircle className="w-3.5 h-3.5" /> Confirmar Recebimento
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhum pedido realizado.</p>
          )}
        </div>

        {/* Pedidos Recebidos */}
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
                    {order.buyer_confirmed_receipt && <span className="text-green-600 font-medium"> · ✅ Recebido — valor liberado</span>}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Menu */}
        <div className="space-y-1 mb-8">
          <button onClick={() => navigate("/minhas-compras")} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left active:scale-[0.98]">
            <ShoppingCart className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Minhas Compras</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/minhas-vendas")} className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-secondary transition-colors text-left active:scale-[0.98]">
            <Package className="w-5 h-5 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium text-foreground">Minhas Vendas</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
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
          <button onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl hover:bg-destructive/10 transition-colors text-left mt-4 active:scale-[0.98]">
            <LogOut className="w-5 h-5 text-destructive" />
            <span className="flex-1 text-sm font-medium text-destructive">Sair</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Perfil;
