/**
 * FEATURED PRODUCTS — Seção de anúncios em destaque
 * 
 * EXPLICAÇÃO:
 * - Agora busca produtos reais do banco de dados (Supabase) usando React Query.
 * - useQuery faz o fetch, cacheia e revalida automaticamente.
 * - Se não houver produtos no banco, mostra os dados mockados como fallback.
 * - A chave "products" do queryKey permite invalidar o cache quando necessário.
 */

import ProductCard from "./ProductCard";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

import tomate from "@/assets/tomate.jpg";
import alface from "@/assets/alface.jpg";
import cenoura from "@/assets/cenoura.jpg";
import batata from "@/assets/batata.jpg";
import manga from "@/assets/manga.jpg";
import milho from "@/assets/milho.jpg";
import morango from "@/assets/morango.jpg";
import feijao from "@/assets/feijao.jpg";

const mockProducts = [
  { id: "demo-tomate", image: tomate, name: "Tomate Orgânico", price: "R$ 6,50/kg", location: "Campinas, SP", category: "Verduras", rawPrice: 6.5, priceUnit: "kg" },
  { id: "demo-alface", image: alface, name: "Alface Fresca", price: "R$ 3,00/un", location: "Jundiaí, SP", category: "Verduras", rawPrice: 3.0, priceUnit: "un" },
  { id: "demo-cenoura", image: cenoura, name: "Cenoura", price: "R$ 4,80/kg", location: "Sorocaba, SP", category: "Legumes", rawPrice: 4.8, priceUnit: "kg" },
  { id: "demo-batata", image: batata, name: "Batata", price: "R$ 5,20/kg", location: "Itu, SP", category: "Legumes", rawPrice: 5.2, priceUnit: "kg" },
  { id: "demo-manga", image: manga, name: "Manga Palmer", price: "R$ 7,00/kg", location: "Ribeirão, SP", category: "Frutas", rawPrice: 7.0, priceUnit: "kg" },
  { id: "demo-milho", image: milho, name: "Milho Verde", price: "R$ 1,50/un", location: "Piracicaba, SP", category: "Grãos", rawPrice: 1.5, priceUnit: "un" },
  { id: "demo-morango", image: morango, name: "Morango Orgânico", price: "R$ 12,00/cx", location: "Atibaia, SP", category: "Frutas", rawPrice: 12.0, priceUnit: "cx" },
  { id: "demo-feijao", image: feijao, name: "Feijão Carioca", price: "R$ 8,90/kg", location: "Bauru, SP", category: "Grãos", rawPrice: 8.9, priceUnit: "kg" },
];

// Exporta para uso na página de detalhes (simulação)
export { mockProducts };

const FeaturedProducts = () => {
  // Busca produtos do banco de dados
  const { data: dbProducts } = useQuery({
    queryKey: ["products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(12);
      if (error) throw error;
      return data;
    },
  });

  return (
    <section className="px-4 md:px-8 mt-8">
      {/* Produtos do banco de dados */}
      {dbProducts && dbProducts.length > 0 && (
        <>
          <h3 className="text-lg font-bold text-foreground mb-4">Anúncios Recentes</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {dbProducts.map((product, index) => (
              <div
                key={product.id}
                className="opacity-0 animate-fade-in-up"
                style={{ animationDelay: `${index * 80}ms` }}
              >
                <ProductCard
                  id={product.id}
                  image={product.image_url || tomate}
                  name={product.name}
                  price={`R$ ${Number(product.price).toFixed(2).replace(".", ",")}/${product.price_unit}`}
                  location={product.city || "Localização não informada"}
                  category={product.category}
                />
              </div>
            ))}
          </div>
        </>
      )}

      {/* Produtos mockados (vitrine de demonstração) */}
      <h3 className="text-lg font-bold text-foreground mb-4">Anúncios Destaque</h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {mockProducts.map((product, index) => (
          <div
            key={product.name}
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 80 + 400}ms` }}
          >
            <ProductCard id={product.id} image={product.image} name={product.name} price={product.price} location={product.location} category={product.category} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;
