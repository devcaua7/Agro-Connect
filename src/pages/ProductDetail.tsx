/**
 * PRODUCT DETAIL — Detalhes do produto com chat e carrinho
 * 
 * EXPLICAÇÃO:
 * - Agora inclui botão "Conversar com Vendedor" que abre o chat.
 * - Botão "Adicionar ao Carrinho" usa CartContext.
 * - O sistema de curtidas e avaliações continua funcionando.
 * - Se o usuário for o dono, pode excluir o anúncio.
 */

import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import { useCart } from "@/context/CartContext";
import Layout from "@/components/Layout";
import { Heart, Star, Trash2, ShoppingCart, ArrowLeft, MapPin, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const ProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [quantity, setQuantity] = useState(1);

  const { data: product, isLoading } = useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });

  // Busca perfil do vendedor separadamente
  const { data: sellerProfile } = useQuery({
    queryKey: ["seller-profile", product?.user_id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, city")
        .eq("user_id", product!.user_id)
        .maybeSingle();
      return data;
    },
    enabled: !!product?.user_id,
  });

  const { data: userLike } = useQuery({
    queryKey: ["like", id, user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("likes")
        .select("id")
        .eq("product_id", id!)
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!id && !!user,
  });

  const { data: likesCount } = useQuery({
    queryKey: ["likes-count", id],
    queryFn: async () => {
      const { count } = await supabase
        .from("likes")
        .select("*", { count: "exact", head: true })
        .eq("product_id", id!);
      return count ?? 0;
    },
    enabled: !!id,
  });

  const { data: reviews } = useQuery({
    queryKey: ["reviews", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("reviews")
        .select("*")
        .eq("product_id", id!);
      return data ?? [];
    },
    enabled: !!id,
  });

  // Busca nomes dos avaliadores
  const { data: reviewProfiles } = useQuery({
    queryKey: ["review-profiles", id],
    queryFn: async () => {
      const userIds = reviews?.map((r) => r.user_id) ?? [];
      if (userIds.length === 0) return [];
      const { data } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", userIds);
      return data ?? [];
    },
    enabled: !!reviews && reviews.length > 0,
  });

  const toggleLike = useMutation({
    mutationFn: async () => {
      if (userLike) {
        await supabase.from("likes").delete().eq("id", userLike.id);
      } else {
        await supabase.from("likes").insert({ product_id: id!, user_id: user!.id });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["like", id] });
      queryClient.invalidateQueries({ queryKey: ["likes-count", id] });
    },
  });

  const deleteProduct = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("products").delete().eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Anúncio excluído!");
      navigate("/");
    },
    onError: () => toast.error("Erro ao excluir anúncio."),
  });

  const submitReview = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("reviews").insert({
        product_id: id!,
        user_id: user!.id,
        rating,
        comment: comment || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Avaliação enviada!");
      setRating(0);
      setComment("");
      queryClient.invalidateQueries({ queryKey: ["reviews", id] });
    },
    onError: (err: any) => {
      if (err.message?.includes("duplicate")) {
        toast.error("Você já avaliou este produto.");
      } else {
        toast.error("Erro ao enviar avaliação.");
      }
    },
  });

  const handleAddToCart = () => {
    if (!user) { navigate("/login"); return; }
    if (!product) return;
    addItem({
      productId: product.id,
      name: product.name,
      price: Number(product.price),
      priceUnit: product.price_unit || "kg",
      quantity,
      imageUrl: product.image_url,
      sellerId: product.user_id,
    });
    toast.success("Adicionado ao carrinho!");
  };

  const handleChat = () => {
    if (!user) { navigate("/login"); return; }
    navigate(`/chat?seller=${product!.user_id}&product=${product!.id}`);
  };

  const isOwner = user?.id === product?.user_id;
  const avgRating = reviews?.length
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  if (isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </Layout>
    );
  }

  if (!product) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-8 text-center">
          <p className="text-muted-foreground">Produto não encontrado.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-4 md:pt-8 max-w-3xl">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 active:scale-[0.97]">
          <ArrowLeft className="w-4 h-4" /> Voltar
        </button>

        {/* Imagem */}
        <div className="aspect-[4/3] rounded-xl overflow-hidden bg-secondary mb-4">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-muted-foreground">Sem imagem</div>
          )}
        </div>

        {/* Info */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-bold text-foreground">{product.name}</h2>
            <p className="text-2xl font-bold text-primary mt-1">
              R$ {Number(product.price).toFixed(2).replace(".", ",")}/{product.price_unit}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (!user) { navigate("/login"); return; }
                toggleLike.mutate();
              }}
              className="flex items-center gap-1 px-3 py-2 rounded-lg bg-secondary hover:bg-secondary/80 active:scale-[0.95] transition-all"
            >
              <Heart className={`w-5 h-5 ${userLike ? "fill-destructive text-destructive" : "text-muted-foreground"}`} />
              <span className="text-sm font-medium">{likesCount}</span>
            </button>
            {isOwner && (
              <button
                onClick={() => {
                  if (confirm("Tem certeza que deseja excluir este anúncio?")) deleteProduct.mutate();
                }}
                className="px-3 py-2 rounded-lg bg-destructive/10 text-destructive hover:bg-destructive/20 active:scale-[0.95] transition-all"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Local e vendedor */}
        <div className="flex items-center gap-1 mt-2 text-sm text-muted-foreground">
          <MapPin className="w-4 h-4" />
          <span>{product.city || sellerProfile?.city || "Localização não informada"}</span>
          <span className="mx-1">·</span>
          <span>Vendedor: {sellerProfile?.display_name || "Anônimo"}</span>
        </div>

        {avgRating && (
          <div className="flex items-center gap-1 mt-2">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-medium">{avgRating}</span>
            <span className="text-sm text-muted-foreground">({reviews?.length} avaliações)</span>
          </div>
        )}

        {product.description && (
          <div className="mt-4">
            <h3 className="font-semibold text-foreground mb-1">Descrição</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{product.description}</p>
          </div>
        )}

        <span className="inline-block mt-3 text-xs bg-secondary text-secondary-foreground px-3 py-1 rounded-full">
          {product.category}
        </span>

        {/* Ações de compra: carrinho + chat (vendedor também pode comprar de outros) */}
        {(
          <div className="mt-6 p-4 bg-card rounded-xl border border-border space-y-4">
            {/* Quantidade */}
            <div className="flex items-center gap-3">
              <label className="text-sm text-muted-foreground">Quantidade:</label>
              <input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                className="w-20 px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground"
              />
              <span className="text-sm text-muted-foreground">{product.price_unit}</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Total: <strong className="text-primary">R$ {(Number(product.price) * quantity).toFixed(2).replace(".", ",")}</strong>
            </p>

            {/* Botões */}
            <div className="flex gap-2">
              <button
                onClick={handleAddToCart}
                className="flex-1 py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                           hover:opacity-90 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                Adicionar ao Carrinho
              </button>
              <button
                onClick={handleChat}
                className="py-3 px-4 rounded-xl border border-primary text-primary font-semibold text-sm
                           hover:bg-primary/5 active:scale-[0.97] transition-all flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Chat
              </button>
            </div>
          </div>
        )}

        {/* Avaliações */}
        <div className="mt-8 mb-8">
          <h3 className="font-semibold text-foreground mb-4">Avaliações</h3>

          {user && !isOwner && (
            <div className="p-4 bg-card rounded-xl border border-border mb-4">
              <p className="text-sm font-medium text-foreground mb-2">Deixe sua avaliação</p>
              <div className="flex gap-1 mb-3">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} onClick={() => setRating(star)} className="active:scale-[0.9] transition-transform">
                    <Star className={`w-6 h-6 ${star <= rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                  </button>
                ))}
              </div>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Comentário (opcional)"
                rows={2}
                className="w-full px-3 py-2 rounded-lg bg-background border border-border text-sm text-foreground
                           placeholder:text-muted-foreground resize-none mb-2"
              />
              <button
                onClick={() => {
                  if (!user) { navigate("/login"); return; }
                  if (rating === 0) { toast.error("Selecione uma nota."); return; }
                  submitReview.mutate();
                }}
                disabled={submitReview.isPending}
                className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium
                           hover:opacity-90 active:scale-[0.97] transition-all"
              >
                Enviar Avaliação
              </button>
            </div>
          )}

          {reviews && reviews.length > 0 ? (
            <div className="space-y-3">
              {reviews.map((review) => {
                const rp = reviewProfiles?.find((p) => p.user_id === review.user_id);
                return (
                  <div key={review.id} className="p-3 bg-card rounded-xl border border-border">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-foreground">
                        {rp?.display_name || "Usuário"}
                      </span>
                      <div className="flex">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star key={s} className={`w-3 h-3 ${s <= review.rating ? "fill-yellow-400 text-yellow-400" : "text-border"}`} />
                        ))}
                      </div>
                    </div>
                    {review.comment && <p className="text-sm text-muted-foreground">{review.comment}</p>}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma avaliação ainda.</p>
          )}
        </div>
      </div>
    </Layout>
  );
};

export default ProductDetail;
