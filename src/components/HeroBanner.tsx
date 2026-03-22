/**
 * HERO BANNER — Banner principal com nome do usuário logado
 * 
 * EXPLICAÇÃO:
 * - Agora usa o AuthContext para mostrar o nome do usuário logado.
 * - Se não estiver logado, mostra "Visitante" e um link para login.
 * - O operador "?." (optional chaining) evita erros se user for null.
 */

import { Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";

const HeroBanner = () => {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.display_name || "Visitante";

  return (
    <div className="bg-hero rounded-2xl p-8 md:p-10 mx-4 md:mx-8 mt-4 md:mt-8 animate-fade-in-up">
      <h2 className="text-2xl md:text-3xl font-bold text-hero-foreground leading-tight">
        Olá, {displayName}! 👋
      </h2>
      <p className="text-hero-foreground/80 mt-2 text-sm md:text-base">
        {user
          ? "Encontre os melhores produtos da agricultura familiar."
          : <>Faça <Link to="/login" className="underline font-semibold">login</Link> para comprar e vender.</>
        }
      </p>

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
