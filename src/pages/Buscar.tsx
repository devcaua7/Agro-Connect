/**
 * BUSCAR PAGE — Página de busca de produtos
 * 
 * EXPLICAÇÃO:
 * - Página dedicada para buscar produtos com filtros.
 * - Por enquanto é uma estrutura básica que será expandida com:
 *   filtros por categoria, preço, localização etc.
 * - O input de busca usa "focus:ring-2" para acessibilidade visual —
 *   mostra ao usuário qual elemento está selecionado.
 */

import Layout from "@/components/Layout";
import { Search } from "lucide-react";

const Buscar = () => {
  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <h2 className="text-2xl font-bold text-foreground mb-6">Buscar Produtos</h2>
        
        <div className="relative max-w-xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Digite o nome do produto..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                       placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary/30
                       transition-shadow duration-200"
          />
        </div>

        <div className="mt-12 flex flex-col items-center text-center text-muted-foreground">
          <Search className="w-12 h-12 mb-4 opacity-30" />
          <p className="text-sm">Pesquise por verduras, frutas, legumes e mais.</p>
        </div>
      </div>
    </Layout>
  );
};

export default Buscar;
