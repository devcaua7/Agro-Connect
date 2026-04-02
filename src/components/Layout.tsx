/**
 * LAYOUT — Componente wrapper que estrutura a página inteira
 * 
 * EXPLICAÇÃO:
 * - O Layout envolve todas as páginas com Sidebar + BottomNav.
 * - Inclui ícone do carrinho fixo no canto superior direito.
 * - O badge mostra a quantidade de itens no carrinho.
 */

import { Link } from "react-router-dom";
import { ShoppingCart } from "lucide-react";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";
import { useCart } from "@/context/CartContext";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  const { itemCount } = useCart();

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />

      {/* Cart icon - top right */}
      <Link
        to="/carrinho"
        className="fixed top-4 right-4 z-50 p-2.5 rounded-full bg-card border border-border shadow-md
                   hover:bg-secondary active:scale-[0.95] transition-all"
      >
        <ShoppingCart className="w-5 h-5 text-foreground" />
        {itemCount > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-primary-foreground
                           text-[10px] font-bold flex items-center justify-center">
            {itemCount > 9 ? "9+" : itemCount}
          </span>
        )}
      </Link>

      {/* Conteúdo principal */}
      <main className="md:ml-56 pb-20 md:pb-8 transition-all duration-300">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default Layout;
