/**
 * HOME PAGE — Página principal do AgroConnect
 * 
 * EXPLICAÇÃO:
 * - Esta é a página que o usuário vê ao abrir o app (rota "/").
 * - Ela compõe (combina) vários componentes menores:
 *   Layout → estrutura geral (sidebar + content area)
 *   HeroBanner → banner de boas-vindas com busca
 *   CategoryList → ícones de categorias
 *   FeaturedProducts → grid de produtos em destaque
 * 
 * - Essa abordagem é chamada de "composição de componentes" — um dos 
 *   princípios fundamentais do React. Cada componente faz UMA coisa bem feita,
 *   e a página apenas os organiza na ordem correta.
 */

import Layout from "@/components/Layout";
import HeroBanner from "@/components/HeroBanner";
import CategoryList from "@/components/CategoryList";
import FeaturedProducts from "@/components/FeaturedProducts";
import ZoneHighlights from "@/components/ZoneHighlights";

const Index = () => {
  return (
    <Layout>
      <HeroBanner />
      <CategoryList />
      <ZoneHighlights />
      <FeaturedProducts />
    </Layout>
  );
};

export default Index;
