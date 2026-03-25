import { Search } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";

const HeroBanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const displayName = user?.user_metadata?.display_name || "Visitante";

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (search.trim()) navigate(`/buscar?q=${encodeURIComponent(search.trim())}`);
  };

  return (
    <div className="bg-hero p-6 md:p-8 animate-fade-in-up">
      <div className="max-w-4xl">
        <h2 className="text-2xl md:text-3xl font-bold text-hero-foreground leading-tight">
          Olá, {displayName}! 👋
        </h2>
        <p className="text-hero-foreground/80 mt-2 text-sm md:text-base">
          {user
            ? "Encontre os melhores produtos da agricultura familiar."
            : <>Faça <Link to="/login" className="underline font-semibold">login</Link> para comprar e vender.</>
          }
        </p>

        <form onSubmit={handleSearch} className="mt-6 relative max-w-lg">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="O que você procura hoje?"
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card text-foreground text-sm
                       placeholder:text-muted-foreground
                       focus:outline-none focus:ring-2 focus:ring-primary/30
                       transition-shadow duration-200"
          />
        </form>
      </div>
    </div>
  );
};

export default HeroBanner;
