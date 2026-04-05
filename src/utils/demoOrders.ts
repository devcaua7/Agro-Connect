/**
 * DEMO ORDERS — Armazena pedidos de demonstração no localStorage
 * 
 * EXPLICAÇÃO:
 * - Como produtos demo não existem no banco de dados (não têm user_id real),
 *   não podemos criar orders no Supabase com foreign key para products.
 * - Solução: armazenamos pedidos demo no localStorage do navegador.
 * - Isso permite demonstrar o fluxo completo (compra → código → confirmação)
 *   sem depender de dados reais no banco.
 * - localStorage persiste entre recarregamentos da página.
 */

export interface DemoOrder {
  id: string;
  product_id: string;
  product_name: string;
  product_image: string | null;
  product_price_unit: string;
  buyer_id: string;
  seller_id: string;
  seller_name: string;
  quantity: number;
  total_price: number;
  status: "pending" | "paid" | "delivered" | "cancelled";
  delivery_code: string;
  payment_type: string;
  payment_method: string;
  created_at: string;
}

const STORAGE_KEY = "agroconnect_demo_orders";

export const getDemoOrders = (): DemoOrder[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
};

export const saveDemoOrders = (orders: DemoOrder[]) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
};

export const addDemoOrder = (order: DemoOrder) => {
  const orders = getDemoOrders();
  orders.unshift(order);
  saveDemoOrders(orders);
};

export const updateDemoOrderStatus = (orderId: string, status: DemoOrder["status"]) => {
  const orders = getDemoOrders();
  const updated = orders.map((o) => (o.id === orderId ? { ...o, status } : o));
  saveDemoOrders(updated);
};

export const generateDeliveryCode = () => String(Math.floor(100000 + Math.random() * 900000));
export const generateDemoId = () => `demo-order-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
