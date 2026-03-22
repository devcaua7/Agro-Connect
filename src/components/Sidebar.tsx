/**
 * SIDEBAR — Navegação lateral (visível apenas em desktop)
 * 
 * EXPLICAÇÃO:
 * - Este componente renderiza o menu lateral fixo à esquerda da tela.
 * - Usa React Router (useLocation + Link) para saber qual página está ativa
 *   e destacar o item correspondente no menu.
 * - O design segue o protótipo: logo no topo, itens de menu com ícones.
 * - "hidden md:flex" faz o sidebar sumir no mobile e aparecer no desktop.
 *   Isso é chamado de "responsive design" com Tailwind.
 */

import { Link, useLocation } from "react-router-dom";
import { Home, Search, PlusCircle, MessageCircle, User } from "lucide-react";

/* 
  Array de objetos que define cada item do menu.
  Isso evita repetição de código — em vez de escrever 5 <Link> manualmente,
  mapeamos este array com .map() para gerar todos automaticamente.
*/
const menuItems = [
  { icon: Home, label: "Início", path: "/" },
  { icon: Search, label: "Buscar", path: "/buscar" },
  { icon: PlusCircle, label: "Anunciar", path: "/anunciar" },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: User, label: "Perfil", path: "/perfil" },
];

const Sidebar = () => {
  /* 
    useLocation() é um hook do React Router que retorna informações sobre a URL atual.
    Usamos location.pathname para comparar com cada item do menu e saber qual está ativo.
  */
  const location = useLocation();

  return (
    <aside className="hidden md:flex flex-col w-56 min-h-screen bg-card border-r border-border fixed left-0 top-0 z-40">
      {/* Logo */}
      <div className="p-6 pb-4">
        <h1 className="text-xl font-bold">
          <span className="text-primary">Agro</span>
          <span className="text-foreground">Connect</span>
        </h1>
      </div>

      {/* Menu de navegação */}
      <nav className="flex flex-col gap-1 px-3 mt-2">
        {menuItems.map((item) => {
          /* Verifica se este item corresponde à página atual */
          const isActive = location.pathname === item.path;
          
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium
                transition-all duration-200
                ${isActive 
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/20" 
                  : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                }
              `}
            >
              {/* 
                item.icon é um componente React (ex: Home, Search).
                Atribuímos a uma variável Icon (com I maiúsculo) porque 
                componentes React precisam começar com letra maiúscula.
              */}
              <item.icon className="w-5 h-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
};

export default Sidebar;
