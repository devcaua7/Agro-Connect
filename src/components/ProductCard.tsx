/**
 * PRODUCT CARD — Card de produto clicável
 * 
 * EXPLICAÇÃO:
 * - Agora ao clicar no card, o usuário é redirecionado para a página de detalhes.
 * - Se não estiver logado, é redirecionado para a tela de login.
 * - useNavigate() do React Router permite navegação programática.
 * - O card agora aceita um "id" para construir a URL de detalhes.
 */

import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

interface ProductCardProps {
  id?: string;         // ID do produto no banco (opcional para dados mockados)
  image: string;
  name: string;
  price: string;
  location: string;
  category: string;
}

const ProductCard = ({ id, image, name, price, location, category }: ProductCardProps) => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleClick = () => {
    if (!user) {
      navigate("/login");
      return;
    }
    if (id) {
      navigate(`/produto/${id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg
                 transition-shadow duration-300 cursor-pointer"
    >
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500
                     group-hover:scale-105"
          loading="lazy"
        />
      </div>

      <div className="p-3">
        <h4 className="font-semibold text-sm text-foreground truncate">{name}</h4>
        <p className="text-primary font-bold text-base mt-1">{price}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-xs text-muted-foreground">{location}</span>
          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded-full">
            {category}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
