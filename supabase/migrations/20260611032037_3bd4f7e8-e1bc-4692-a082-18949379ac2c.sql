-- 1. Perfil: chave PIX do vendedor
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS pix_key text,
  ADD COLUMN IF NOT EXISTS pix_key_type text;

-- 2. Orders: soft-delete e integração AbacatePay
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS hidden_by_buyer boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS hidden_by_seller boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS abacatepay_qr_id text,
  ADD COLUMN IF NOT EXISTS abacatepay_qr_brcode text,
  ADD COLUMN IF NOT EXISTS abacatepay_qr_image text,
  ADD COLUMN IF NOT EXISTS abacatepay_payout_id text,
  ADD COLUMN IF NOT EXISTS abacatepay_receipt_url text;

-- 3. Carteira da plataforma
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL,
  status text NOT NULL DEFAULT 'held' CHECK (status IN ('held','released','refunded')),
  abacatepay_payin_id text,
  abacatepay_payout_id text,
  released_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT ALL ON public.wallet_transactions TO service_role;

ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendedor vê sua carteira" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = seller_id);
CREATE POLICY "Comprador vê transações dos seus pedidos" ON public.wallet_transactions
  FOR SELECT USING (auth.uid() = buyer_id);

CREATE TRIGGER update_wallet_transactions_updated_at
  BEFORE UPDATE ON public.wallet_transactions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS wallet_transactions_seller_idx ON public.wallet_transactions(seller_id, status);
CREATE INDEX IF NOT EXISTS wallet_transactions_order_idx ON public.wallet_transactions(order_id);