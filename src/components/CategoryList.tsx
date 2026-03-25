import { useNavigate } from "react-router-dom";
import { Leaf, Apple, Carrot, Wheat, Egg, Milk, Drumstick, Cherry, Bean, Salad, Cookie, Citrus } from "lucide-react";

export const allCategories = [
  { icon: Carrot, label: "Legumes", value: "Legumes" },
  { icon: Leaf, label: "Verduras e Temperos", value: "Verduras e Temperos" },
  { icon: Apple, label: "Frutas", value: "Frutas" },
  { icon: Egg, label: "Ovos", value: "Ovos" },
  { icon: Milk, label: "Queijos e Laticínios", value: "Queijos e Laticínios" },
  { icon: Cookie, label: "Pães e Massas", value: "Pães e Massas" },
  { icon: Salad, label: "Cogumelos", value: "Cogumelos" },
  { icon: Drumstick, label: "Frangos", value: "Frangos" },
  { icon: Citrus, label: "Iogurtes e Leites", value: "Iogurtes e Leites" },
  { icon: Cherry, label: "Castanhas e Frutas Secas", value: "Castanhas e Frutas Secas" },
  { icon: Bean, label: "Condimentos e Molhos", value: "Condimentos e Molhos" },
  { icon: Wheat, label: "Arroz e Feijão", value: "Arroz e Feijão" },
];

const CategoryList = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 md:px-8 mt-8">
      <h3 className="text-lg font-bold text-foreground mb-4">Categorias</h3>
      <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-6 gap-4 p-4 bg-card rounded-xl border border-border">
        {allCategories.map((cat, index) => (
          <button
            key={cat.value}
            onClick={() => navigate(`/buscar?categoria=${encodeURIComponent(cat.value)}`)}
            className="flex flex-col items-center gap-2 group p-3 rounded-lg hover:bg-secondary transition-colors
                       opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 50 + 200}ms` }}
          >
            <cat.icon className="w-6 h-6 text-primary" />
            <span className="text-[11px] font-medium text-foreground text-center leading-tight">{cat.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryList;
