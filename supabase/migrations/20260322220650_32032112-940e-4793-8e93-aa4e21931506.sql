
-- Tabela de mensagens de chat entre comprador e vendedor
CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  receiver_id uuid NOT NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Quem enviou ou recebeu pode ver
CREATE POLICY "Usuário vê suas mensagens" ON public.messages
  FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Usuário logado envia mensagem
CREATE POLICY "Usuário envia mensagem" ON public.messages
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = sender_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- Adicionar colunas para fluxo de pagamento avançado
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'online';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS qr_expires_at timestamptz;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS buyer_confirmed_receipt boolean DEFAULT false;
