import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Layout from "@/components/Layout";
import ProductCard from "@/components/ProductCard";
import { allCategories } from "@/components/CategoryList";
import { mockProducts } from "@/components/FeaturedProducts";
import { Search, Filter } from "lucide-react";

const categorias = ["Todas", ...allCategories.map(c => c.value)];

const Buscar = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("q") || "");
  const [categoria, setCategoria] = useState(searchParams.get("categoria") || "Todas");

  useEffect(() => {
    const cat = searchParams.get("categoria");
    if (cat && categorias.includes(cat)) setCategoria(cat);
    const q = searchParams.get("q");
    if (q) setSearch(q);
  }, [searchParams]);

  const { data: dbProducts, isLoading } = useQuery({
    queryKey: ["search-products", search, categoria],
    queryFn: async () => {
      let query = supabase.from("products").select("*").eq("is_active", true);
      if (categoria !== "Todas") query = query.eq("category", categoria);
      if (search.trim()) query = query.ilike("name", `%${search.trim()}%`);
      const { data } = await query.order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  // Filtra mockProducts pela categoria e busca para sempre ter resultados
  const filteredMocks = mockProducts.filter((p) => {
    const matchCategory = categoria === "Todas" || p.category === categoria;
    const matchSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchCategory && matchSearch;
  });

  // Combina produtos reais do banco + mocks filtrados
  const allProducts = [
    ...(dbProducts ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      price: `R$ ${Number(p.price).toFixed(2).replace(".", ",")}/${p.price_unit}`,
      image: p.image_url || "/placeholder.svg",
      location: p.city || "",
      category: p.category,
    })),
    ...filteredMocks.map((p) => ({
      id: p.id,
      name: p.name,
      price: p.price,
      image: p.image,
      location: p.location,
      category: p.category,
    })),
  ];

  const handleCategoryClick = (cat: string) => {
    setCategoria(cat);
    const params = new URLSearchParams();
    if (cat !== "Todas") params.set("categoria", cat);
    if (search.trim()) params.set("q", search.trim());
    setSearchParams(params);
  };

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8">
        <h2 className="text-2xl font-bold text-foreground mb-4">Buscar Produtos</h2>

        <div className="relative max-w-xl mb-4">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Digite o nome do produto..."
            className="w-full pl-11 pr-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                       placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
          />
        </div>

        <div className="flex gap-2 flex-wrap mb-6">
          {categorias.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategoryClick(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all active:scale-[0.95]
                ${categoria === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        ) : allProducts.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {allProducts.map((p) => (
              <ProductCard
                key={p.id}
                id={p.id}
                name={p.name}
                price={p.price}
                image={p.image}
                location={p.location}
                category={p.category}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center text-center text-muted-foreground py-12">
            <Filter className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-sm">Nenhum produto encontrado para esta busca.</p>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Buscar;
