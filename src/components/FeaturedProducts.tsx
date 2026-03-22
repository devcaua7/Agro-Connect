/**
 * FEATURED PRODUCTS — Seção de anúncios em destaque
 * 
 * EXPLICAÇÃO:
 * - Importa as imagens geradas da pasta assets/ usando ES6 imports.
 *   Isso permite que o Vite (bundler) otimize e gere URLs corretas para produção.
 * - O array "products" simula dados que viriam de um banco de dados (Supabase).
 *   Na versão final, esses dados serão buscados com queries ao banco.
 * - "grid grid-cols-2 lg:grid-cols-4" cria um grid responsivo:
 *   2 colunas no mobile, 4 no desktop. Isso é responsive design com Tailwind.
 * - Cada card usa animação staggered (escalonada) com animationDelay.
 */

import ProductCard from "./ProductCard";

import tomate from "@/assets/tomate.jpg";
import alface from "@/assets/alface.jpg";
import cenoura from "@/assets/cenoura.jpg";
import batata from "@/assets/batata.jpg";
import manga from "@/assets/manga.jpg";
import milho from "@/assets/milho.jpg";
import morango from "@/assets/morango.jpg";
import feijao from "@/assets/feijao.jpg";

/* 
  Dados mockados (simulados). No futuro, virão do Supabase.
  Cada objeto segue a interface ProductCardProps definida no ProductCard.
*/
const products = [
  { image: tomate, name: "Tomate Orgânico", price: "R$ 6,50/kg", location: "Campinas, SP", category: "Verduras" },
  { image: alface, name: "Alface Fresca", price: "R$ 3,00", location: "Jundiaí, SP", category: "Verduras" },
  { image: cenoura, name: "Cenoura", price: "R$ 4,80/kg", location: "Sorocaba, SP", category: "Legumes" },
  { image: batata, name: "Batata", price: "R$ 5,20/kg", location: "Itu, SP", category: "Legumes" },
  { image: manga, name: "Manga Palmer", price: "R$ 7,00/kg", location: "Ribeirão, SP", category: "Frutas" },
  { image: milho, name: "Milho Verde", price: "R$ 1,50/un", location: "Piracicaba, SP", category: "Grãos" },
  { image: morango, name: "Morango Orgânico", price: "R$ 12,00/cx", location: "Atibaia, SP", category: "Frutas" },
  { image: feijao, name: "Feijão Carioca", price: "R$ 8,90/kg", location: "Bauru, SP", category: "Grãos" },
];

const FeaturedProducts = () => {
  return (
    <section className="px-4 md:px-8 mt-8">
      <h3 className="text-lg font-bold text-foreground mb-4">Anúncios Destaque</h3>
      
      {/* Grid responsivo: 2 cols mobile, 3 tablet, 4 desktop */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {products.map((product, index) => (
          <div
            key={product.name}
            className="opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 80 + 400}ms` }}
          >
            <ProductCard {...product} />
          </div>
        ))}
      </div>
    </section>
  );
};

export default FeaturedProducts;
