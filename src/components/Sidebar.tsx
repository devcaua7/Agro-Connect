/**
 * SIDEBAR — Navegação lateral com menu hamburger colapsável
 * 
 * EXPLICAÇÃO:
 * - "collapsed" controla se o menu está aberto ou fechado.
 * - O botão hamburger (Menu/X) alterna o estado.
 * - Quando colapsado, mostra apenas os ícones. Quando expandido, mostra ícone + texto.
 * - "transition-all duration-300" anima suavemente a abertura/fechamento.
 * - No mobile (md:hidden), o sidebar fica completamente escondido.
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, MessageCircle, User, Menu, X } from "lucide-react";
import { useState } from "react";

const menuItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Search, label: "Buscar", path: "/buscar" },
  { icon: PlusCircle, label: "Anunciar", path: "/anunciar" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

const Sidebar = () => {
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={`hidden md:flex flex-col min-h-screen bg-card border-r border-border fixed left-0 top-0 z-40
                  transition-all duration-300 ${collapsed ? "w-16" : "w-56"}`}
    >
      {/* Header: Logo + botão hamburger */}
      <div className={`p-4 flex items-center ${collapsed ? "justify-center" : "justify-between"}`}>
        {!collapsed && (
          <h1 className="text-xl font-bold">
            <span className="text-primary">Agro</span>
            <span className="text-foreground">Connect</span>
          </h1>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="p-2 rounded-lg hover:bg-secondary transition-colors active:scale-[0.95]"
          title={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? <Menu className="w-5 h-5 text-foreground" /> : <X className="w-5 h-5 text-foreground" />}
        </button>
      </div>

      {/* Menu de navegação */}
      <nav className="flex flex-col gap-1 px-2 mt-2">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              title={item.label}
              className={`
                flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${collapsed ? "justify-center" : ""}
                ${isActive
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }
              `}
            >
              <item.icon className="w-5 h-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
