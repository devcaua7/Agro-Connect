/**
 * BOTTOM NAV — Navegação inferior (visível apenas no mobile)
 * 
 * EXPLICAÇÃO:
 * - No mobile, sidebars não funcionam bem. A convenção é usar uma barra 
 *   de navegação fixa no rodapé (como Instagram, WhatsApp etc).
 * - "md:hidden" faz este componente sumir em telas maiores (desktop).
 * - "fixed bottom-0" fixa ele na parte inferior da tela.
 * - Reutilizamos o mesmo array de menuItems, demonstrando DRY 
 *   (Don't Repeat Yourself — não se repita).
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";

const menuItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Search, label: "Buscar", path: "/buscar" },
  { icon: PlusCircle, label: "Anunciar", path: "/anunciar" },
  { icon: ShoppingCartIcon, label: "Carrinho", path: "/carrinho" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

const BottomNav = () => {
  const location = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 safe-area-bottom">
      <div className="flex justify-around items-center py-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg
                transition-colors duration-200 text-xs
                ${isActive 
                  ? "text-primary font-semibold" 
                  : "text-muted-foreground"
                }
              `}
            >
              <item.icon className={`w-5 h-5 ${isActive ? "stroke-[2.5]" : ""}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
