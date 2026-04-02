/**
 * CHAT — Sistema de mensagens com suporte a conversas reais e demo
 * 
 * EXPLICAÇÃO:
 * - Conversas reais usam Supabase Realtime para mensagens em tempo real.
 * - Conversas demo (seller=demo-seller) simulam uma conversa fake com
 *   mensagens automáticas do "vendedor" para demonstração no TCC.
 * - quickMessages facilita a interação com mensagens pré-definidas.
 */

import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/context/AuthContext";
import Layout from "@/components/Layout";
import { MessageCircle, Send, ArrowLeft, Phone, MoreVertical } from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  sender_id: string;
  receiver_id: string;
  product_id: string;
  content: string;
  created_at: string;
}

interface DemoMessage {
  id: string;
  content: string;
  isMine: boolean;
  time: string;
}

interface Conversation {
  otherUserId: string;
  otherUserName: string;
  productId: string;
  productName: string;
  lastMessage: string;
  lastDate: string;
}

const quickMessages = [
  "Olá, ainda está disponível?",
  "Qual o prazo de entrega?",
  "Aceita negociar o preço?",
  "Pode enviar mais fotos?",
  "Qual a quantidade mínima?",
  "Entrega em qual região?",
];

// Auto-responses do vendedor fake
const demoResponses: Record<string, string> = {
  "Olá, ainda está disponível?": "Sim! Tenho bastante disponível. Quanto você precisa?",
  "Qual o prazo de entrega?": "Consigo entregar em até 2 dias úteis na sua região!",
  "Aceita negociar o preço?": "Depende da quantidade! Acima de 10kg eu faço um desconto especial.",
  "Qual a quantidade mínima?": "A partir de 1kg já vendo, mas acima de 5kg o preço é melhor.",
  "Pode enviar mais fotos?": "Claro! Vou tirar umas fotos agora e te envio em breve.",
  "Entrega em qual região?": "Entrego em toda a região metropolitana. Qual sua localização?",
};

const defaultDemoResponse = "Entendi! Me manda mais detalhes que te ajudo.";

const Chat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const [activeConvo, setActiveConvo] = useState<{ otherUserId: string; productId: string } | null>(null);
  const [newMsg, setNewMsg] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Demo chat state
  const [isDemo, setIsDemo] = useState(false);
  const [demoProductName, setDemoProductName] = useState("");
  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([]);

  const paramSellerId = searchParams.get("seller");
  const paramProductId = searchParams.get("product");
  const paramDemo = searchParams.get("demo");
  const paramProductName = searchParams.get("productName");

  useEffect(() => {
    if (paramSellerId && paramProductId && user) {
      setActiveConvo({ otherUserId: paramSellerId, productId: paramProductId });

      if (paramDemo === "true" || paramSellerId === "demo-seller") {
        setIsDemo(true);
        setDemoProductName(paramProductName || "Produto");
        // Initialize demo chat with fake messages
        const now = new Date();
        setDemoMessages([
          {
            id: "d1",
            content: "Olá! Vi seu interesse no meu anúncio.",
            isMine: false,
            time: new Date(now.getTime() - 5 * 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
          },
        ]);
      }
    }
  }, [paramSellerId, paramProductId, user, paramDemo, paramProductName]);

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
    enabled: !!user && !isDemo,
  });

  const convoMap = new Map<string, Message[]>();
  allMessages?.forEach((msg) => {
    const otherId = msg.sender_id === user?.id ? msg.receiver_id : msg.sender_id;
    const key = `${msg.product_id}_${otherId}`;
    if (!convoMap.has(key)) convoMap.set(key, []);
    convoMap.get(key)!.push(msg);
  });

  const { data: profiles } = useQuery({
    queryKey: ["chat-profiles"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("user_id, display_name");
      return data ?? [];
    },
    enabled: !!user && !isDemo,
  });

  const { data: products } = useQuery({
    queryKey: ["chat-products"],
    queryFn: async () => {
      const { data } = await supabase.from("products").select("id, name");
      return data ?? [];
    },
    enabled: !!user && !isDemo,
  });

  const conversations: Conversation[] = [];
  if (!isDemo) {
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
  }

  const activeMessages = activeConvo && !isDemo
    ? allMessages?.filter(
        (m) =>
          m.product_id === activeConvo.productId &&
          (m.sender_id === activeConvo.otherUserId || m.receiver_id === activeConvo.otherUserId)
      ) ?? []
    : [];

  useEffect(() => {
    if (!user || isDemo) return;
    const channel = supabase
      .channel("chat-realtime")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["my-messages"] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user, queryClient, isDemo]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeMessages.length, demoMessages.length]);

  const sendDemoMessage = (content: string) => {
    const now = new Date();
    const time = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

    // Add user message
    setDemoMessages((prev) => [
      ...prev,
      { id: `user-${Date.now()}`, content, isMine: true, time },
    ]);
    setNewMsg("");

    // Auto-respond after delay
    setTimeout(() => {
      const response = demoResponses[content] || defaultDemoResponse;
      const responseTime = new Date(Date.now() + 60000).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
      setDemoMessages((prev) => [
        ...prev,
        { id: `seller-${Date.now()}`, content: response, isMine: false, time: responseTime },
      ]);
    }, 1500);
  };

  const sendMessage = async (content?: string) => {
    const msg = content || newMsg.trim();
    if (!msg || !activeConvo || !user) return;

    if (isDemo) {
      sendDemoMessage(msg);
      return;
    }

    setSending(true);
    const { error } = await supabase.from("messages").insert({
      sender_id: user.id,
      receiver_id: activeConvo.otherUserId,
      product_id: activeConvo.productId,
      content: msg,
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

  // Active conversation view (demo or real)
  if (activeConvo) {
    const convo = isDemo
      ? null
      : conversations.find(
          (c) => c.otherUserId === activeConvo.otherUserId && c.productId === activeConvo.productId
        );

    const sellerName = isDemo ? "João Silva" : convo?.otherUserName || "Usuário";
    const productName = isDemo ? demoProductName : convo?.productName || "Produto";

    return (
      <Layout>
        <div className="flex flex-col h-[calc(100vh-120px)] md:h-[calc(100vh-80px)] max-w-2xl mx-auto">
          {/* Header - WhatsApp style */}
          <div className="px-4 py-3 bg-primary/5 border-b border-border flex items-center gap-3">
            <button onClick={() => { setActiveConvo(null); setIsDemo(false); setDemoMessages([]); }} className="active:scale-[0.9] transition-transform">
              <ArrowLeft className="w-5 h-5 text-muted-foreground" />
            </button>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
              {sellerName[0]?.toUpperCase()}
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-foreground">{sellerName}</p>
              <p className="text-xs text-primary">Online</p>
            </div>
            <button className="p-2 rounded-full hover:bg-secondary"><Phone className="w-4 h-4 text-muted-foreground" /></button>
            <button className="p-2 rounded-full hover:bg-secondary"><MoreVertical className="w-4 h-4 text-muted-foreground" /></button>
          </div>

          {/* Product context bar */}
          <div className="px-4 py-2 bg-secondary/30 border-b border-border">
            <p className="text-xs text-muted-foreground">
              Conversando sobre: <strong className="text-foreground">{productName}</strong>
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
            {isDemo ? (
              <>
                {demoMessages.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.isMine ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm
                        ${msg.isMine
                          ? "bg-primary text-primary-foreground rounded-br-md"
                          : "bg-card border border-border text-foreground rounded-bl-md"
                        }`}
                    >
                      {msg.content}
                      <p className={`text-[10px] mt-1 ${msg.isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                        {msg.time}
                      </p>
                    </div>
                  </div>
                ))}
              </>
            ) : (
              <>
                {activeMessages.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">Envie a primeira mensagem!</p>
                )}
                {activeMessages.map((msg) => {
                  const isMine = msg.sender_id === user.id;
                  return (
                    <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[75%] px-3.5 py-2.5 rounded-2xl text-sm
                          ${isMine
                            ? "bg-primary text-primary-foreground rounded-br-md"
                            : "bg-card border border-border text-foreground rounded-bl-md"
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
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick messages */}
          <div className="px-4 py-2 border-t border-border overflow-x-auto">
            <div className="flex gap-2">
              {quickMessages.map((qm) => (
                <button
                  key={qm}
                  onClick={() => sendMessage(qm)}
                  disabled={sending}
                  className="flex-shrink-0 px-3 py-1.5 rounded-full bg-secondary text-xs text-foreground
                             hover:bg-secondary/80 active:scale-[0.95] transition-all whitespace-nowrap"
                >
                  {qm}
                </button>
              ))}
            </div>
          </div>

          {/* Input */}
          <div className="px-4 py-3 border-t border-border flex gap-2">
            <input
              value={newMsg}
              onChange={(e) => setNewMsg(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
              placeholder="Digite sua mensagem..."
              className="flex-1 px-4 py-2.5 rounded-full bg-secondary text-sm text-foreground
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
            <button
              onClick={() => sendMessage()}
              disabled={sending || !newMsg.trim()}
              className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center
                         active:scale-[0.95] transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  // Conversation list
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
