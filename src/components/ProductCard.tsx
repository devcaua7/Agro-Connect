/**
 * PRODUCT CARD — Card de produto individual
 * 
 * EXPLICAÇÃO:
 * - É um componente reutilizável que recebe dados via "props" (propriedades).
 * - "interface ProductCardProps" define o TIPO dos dados que o componente espera.
 *   Isso é TypeScript — ajuda a prevenir bugs dizendo exatamente que dados são necessários.
 * - O card tem: imagem, nome, preço, localização e badge de categoria.
 * - "aspect-[4/3]" define a proporção da imagem (4:3) para manter consistência visual.
 * - "object-cover" faz a imagem preencher o container sem distorcer.
 * - Hover effects (group-hover) criam interatividade suave ao passar o mouse.
 */

interface ProductCardProps {
  image: string;      // caminho da imagem (importada como ES6 module)
  name: string;       // nome do produto
  price: string;      // preço formatado (ex: "R$ 5,00")
  location: string;   // localização do vendedor
  category: string;   // categoria do produto
}

const ProductCard = ({ image, name, price, location, category }: ProductCardProps) => {
  return (
    <div className="group bg-card rounded-xl overflow-hidden shadow-sm hover:shadow-lg
                    transition-shadow duration-300 cursor-pointer">
      {/* Container da imagem */}
      <div className="aspect-[4/3] overflow-hidden">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover transition-transform duration-500
                     group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Informações do produto */}
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
