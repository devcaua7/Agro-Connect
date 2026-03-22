/**
 * CHAT PAGE — Página de conversas
 * 
 * EXPLICAÇÃO:
 * - Estado vazio (empty state) — mostra uma mensagem quando não há conversas.
 * - Empty states são importantes para UX: explicam ao usuário o que acontece
 *   naquela tela e o que pode ser feito. Nunca deixe uma página em branco!
 * - No futuro, aqui teremos uma lista de conversas usando Supabase Realtime
 *   para mensagens em tempo real entre comprador e vendedor.
 */

import Layout from "@/components/Layout";
import { MessageCircle } from "lucide-react";

const Chat = () => {
  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Conversas</h2>

        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center mb-4">
            <MessageCircle className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-foreground mb-1">Nenhuma conversa ainda</h3>
          <p className="text-sm text-muted-foreground max-w-xs">
            Quando você entrar em contato com um vendedor, suas conversas aparecerão aqui.
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
