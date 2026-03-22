/**
 * HERO BANNER — Banner principal da Home
 * 
 * EXPLICAÇÃO:
 * - É o primeiro elemento visual que o usuário vê. Deve ser chamativo e informativo.
 * - Fundo verde (bg-hero) com texto branco (text-hero-foreground).
 * - Inclui um campo de busca (SearchBar) integrado.
 * - "rounded-2xl" arredonda os cantos do banner.
 * - As classes de animação (animate-fade-in-up) fazem o conteúdo 
 *   aparecer suavemente ao carregar a página.
 */

import { Search } from "lucide-react";

const HeroBanner = () => {
  return (
    <div className="bg-hero rounded-2xl p-8 md:p-10 mx-4 md:mx-8 mt-4 md:mt-8 animate-fade-in-up">
      <h2 className="text-2xl md:text-3xl font-bold text-hero-foreground leading-tight">
        Olá, Cauã Biorn! 👋
      </h2>
      <p className="text-hero-foreground/80 mt-2 text-sm md:text-base">
        Encontre os melhores produtos da agricultura familiar.
      </p>

      {/* Barra de busca dentro do banner */}
      <div className="mt-6 relative max-w-lg">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <input
          type="text"
          placeholder="O que você procura hoje?"
          className="w-full pl-11 pr-4 py-3 rounded-xl bg-card text-foreground text-sm
                     placeholder:text-muted-foreground
                     focus:outline-none focus:ring-2 focus:ring-primary/30
                     transition-shadow duration-200"
        />
      </div>
    </div>
  );
};

export default HeroBanner;
