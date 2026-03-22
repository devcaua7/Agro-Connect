/**
 * LAYOUT — Componente wrapper que estrutura a página inteira
 * 
 * EXPLICAÇÃO:
 * - O Layout é um "container" que envolve todas as páginas.
 * - Ele inclui o Sidebar (desktop), BottomNav (mobile) e o conteúdo principal.
 * - "children" é uma prop especial do React que representa tudo que está
 *   dentro das tags <Layout>...</Layout>. É como um "buraco" onde 
 *   o conteúdo de cada página é inserido.
 * - "md:ml-56" empurra o conteúdo principal para a direita no desktop,
 *   criando espaço para o sidebar fixo de 56 unidades (14rem = 224px).
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
      
      {/* Conteúdo principal — empurrado para direita no desktop */}
      <main className="md:ml-56 pb-20 md:pb-8">
        {children}
      </main>

      <BottomNav />
    </div>
  );
};

export default Layout;
