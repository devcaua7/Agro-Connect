/**
 * LAYOUT — Componente wrapper que estrutura a página inteira
 * 
 * EXPLICAÇÃO:
 * - O Layout envolve todas as páginas com Sidebar + BottomNav.
 * - "md:ml-16" é o espaço mínimo quando sidebar está colapsado.
 *   O sidebar pode ter largura variável (16 ou 56), mas usamos 
 *   o valor padrão expandido para evitar sobreposição.
 */

import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

interface LayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      
      {/* Conteúdo principal — espaço para sidebar (colapsado ou expandido) */}
      <main className="md:ml-56 pb-20 md:pb-8 transition-all duration-300">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default Layout;
