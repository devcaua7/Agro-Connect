import { useNavigate } from "react-router-dom";
import { Leaf, Apple, Carrot, Wheat } from "lucide-react";

const categories = [
  { icon: Leaf, label: "Verduras", value: "Verduras" },
  { icon: Apple, label: "Frutas", value: "Frutas" },
  { icon: Carrot, label: "Legumes", value: "Legumes" },
  { icon: Wheat, label: "Grãos", value: "Grãos" },
];

const CategoryList = () => {
  const navigate = useNavigate();

  return (
    <section className="px-4 md:px-8 mt-8">
      <h3 className="text-lg font-bold text-foreground mb-4">Categorias</h3>
      <div className="flex gap-6 md:gap-8">
        {categories.map((cat, index) => (
          <button
            key={cat.label}
            onClick={() => navigate(`/buscar?categoria=${encodeURIComponent(cat.value)}`)}
            className="flex flex-col items-center gap-2 group opacity-0 animate-fade-in-up"
            style={{ animationDelay: `${index * 80 + 200}ms` }}
          >
            <div className="w-14 h-14 rounded-full bg-category-bg flex items-center justify-center
                          transition-transform duration-200 group-hover:scale-105 group-active:scale-95">
              <cat.icon className="w-6 h-6 text-category-icon" />
            </div>
            <span className="text-xs font-medium text-foreground">{cat.label}</span>
          </button>
        ))}
      </div>
    </section>
  );
};

export default CategoryList;
