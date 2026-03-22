/**
 * CHAT PAGE — Conversas em tempo real entre comprador e vendedor
 * 
 * EXPLICAÇÃO:
 * - Lista conversas existentes agrupadas por produto + outro usuário.
 * - Ao clicar numa conversa, abre o chat inline.
 * - Usa Supabase Realtime para receber mensagens novas sem recarregar.
 * - supabase.channel() cria um canal de escuta em tempo real.
 * - 'postgres_changes' escuta INSERT na tabela messages.
 * - O chat é agrupado por product_id + o outro usuário (conversa única).
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { MessageCircle, Send, ArrowLeft } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  product_id: string;
  content: string;
  created_at: string;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  productId: string;
  productName: string;
  lastMessage: string;
  lastDate: string;
}

const Chat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeConvo, setActiveConvo] = useState<{ otherUserId: string; productId: string } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Se veio da página de produto com params
  const paramSellerId = searchParams.get("seller");
  const paramProductId = searchParams.get("product");

  useEffect(() => {
    if (paramSellerId && paramProductId && user) {
      setActiveConvo({ otherUserId: paramSellerId, productId: paramProductId });
    }
  }, [paramSellerId, paramProductId, user]);

  // Busca todas as mensagens do usuário
  const { data: allMessages } = useQuery({
    queryKey: ["my-messages", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("messages")
        .select("*")
        .or(`sender_id.eq.${user!.id},receiver_id.eq.${user!.id}`)
        .order("created_at", { ascending: true });
      return (data ?? []) as Message[];
    },
    enabled: !!user,
  });

  // Agrupa em conversas
  const conversations: Conversation[] = [];
  const convoMap = new Map<string, Message[]>();

  allMessages?.forEach((msg) => {
    const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    const key = `${msg.product_id}_${otherId}`;
    if (!convoMap.has(key)) convoMap.set(key, []);
    convoMap.get(key)!.push(msg);
  });

  // Busca nomes de perfis e produtos
  const { data: profiles } = useQuery({
    queryKey: ["chat-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: products } = useQuery({
    queryKey: ["chat-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name");
      return data ?? [];
    },
    enabled: !!user,
  });

  convoMap.forEach((msgs, key) => {
    const [productId, otherUserId] = key.split("_");
    const last = msgs[msgs.length - 1];
    const profile = profiles?.find((p) => p.user_id === otherUserId);
    const product = products?.find((p) => p.id === productId);
    conversations.push({
      otherUserId,
      otherUserName: profile?.display_name || "Usuário",
      productId,
      productName: product?.name || "Produto",
      lastMessage: last.content,
      lastDate: last.created_at,
    });
  });

  // Adiciona conversa vinda dos params (se nova)
  if (paramSellerId && paramProductId && !convoMap.has(`${paramProductId}_${paramSellerId}`)) {
    const profile = profiles?.find((p) => p.user_id === paramSellerId);
    const product = products?.find((p) => p.id === paramProductId);
    if (!conversations.find((c) => c.productId === paramProductId && c.otherUserId === paramSellerId)) {
      conversations.push({
        otherUserId: paramSellerId,
        otherUserName: profile?.display_name || "Vendedor",
        productId: paramProductId,
        productName: product?.name || "Produto",
        lastMessage: "",
        lastDate: new Date().toISOString(),
      });
    }
  }

  conversations.sort((a, b) => new Date(b.lastDate).getTime() - new Date(a.lastDate).getTime());

  // Mensagens da conversa ativa
  const activeMessages = activeConvo
    ? allMessages?.filter(
        (m) =>
          m.product_id === activeConvo.productId &&
          (m.sender_id === activeConvo.otherUserId || m.receiver_id === activeConvo.otherUserId)
      ) ?? []
    : [];

  // Realtime
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-messages"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length]);

  const sendMessage = async () => {
    if (!newMsg.trim() || !activeConvo || !user) return;
    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeConvo.otherUserId,
      product_id: activeConvo.productId,
      content: newMsg.trim(),
    });
    if (error) {
      toast.error("Erro ao enviar mensagem.");
    } else {
      setNewMsg("");
      queryClient.invalidateQueries({ queryKey: ["my-messages"] });
    }
    setSending(false);
  };

  if (!user) {
    return (
      <Layout>
        <div className="px-4 md:px-8 pt-8 text-center">
          <p className="text-muted-foreground">Faça login para acessar o chat.</p>
        </div>
      </Layout>
    );
  }

  // Vista de conversa ativa
  if (activeConvo) {
    const otherName = conversations.find(
      (c) => c.otherUserId === activeConvo.otherUserId && c.productId === activeConvo.productId
    )?.otherUserName || "Usuário";
    const productName = conversations.find(
      (c) => c.productId === activeConvo.productId
    )?.productName || "Produto";

    return (
      <Layout>
        <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] max-w-2xl mx-auto">
          {/* Header */}
          <div className="px-4 py-3 border-b border-border flex items-center gap-3">
            <button onClick={() => setActiveConvo(null)} className="active:scale-[0.9] transition-transform">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div>
              <p className="text-sm font-semibold text-foreground">{otherName}</p>
              <p className="text-xs text-muted-foreground">{productName}</p>
            </div>
          </div>

          {/* Mensagens */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {activeMessages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">
                Envie a primeira mensagem!
              </p>
            )}
            {activeMessages.map((msg) => {
              const isMine = msg.sender_id === user.id;
              return (
                <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm
                      ${isMine
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary text-foreground rounded-bl-md"
                      }`}
                  >
                    {msg.content}
                    <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                      {new Date(msg.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex gap-2">
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2.5 rounded-xl bg-secondary text-sm text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={sendMessage}
              disabled={sending || !newMsg.trim()}
              className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground active:scale-[0.95] transition-all
                         disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Lista de conversas
  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto">
        <h2 className="text-xl font-bold text-foreground mb-6">Conversas</h2>

        {conversations.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
              <MessageCircle className="w-8 h-8 text-muted-foreground" />
            </div>
            <h3 className="font-semibold text-foreground mb-1">Nenhuma conversa ainda</h3>
            <p className="text-sm text-muted-foreground max-w-xs">
              Quando você entrar em contato com um vendedor, suas conversas aparecerão aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((convo) => (
              <button
                key={`${convo.productId}_${convo.otherUserId}`}
                onClick={() => setActiveConvo({ otherUserId: convo.otherUserId, productId: convo.productId })}
                className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border
                           hover:bg-secondary transition-colors text-left active:scale-[0.98]"
              >
                <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold flex-shrink-0">
                  {convo.otherUserName[0]?.toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{convo.otherUserName}</p>
                  <p className="text-xs text-muted-foreground truncate">{convo.productName} · {convo.lastMessage || "Nova conversa"}</p>
                </div>
                <span className="text-[10px] text-muted-foreground flex-shrink-0">
                  {new Date(convo.lastDate).toLocaleDateString("pt-BR")}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Chat;
