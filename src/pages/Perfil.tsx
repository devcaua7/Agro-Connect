/**
 * PERFIL PAGE — Página de perfil do usuário
 * 
 * EXPLICAÇÃO:
 * - Mostra informações do usuário e opções da conta.
 * - O avatar usa iniciais do nome (técnica comum quando não há foto).
 * - "bg-primary text-primary-foreground" aplica as cores do design system.
 * - Cada item do menu de opções é um botão com ícone + texto + seta.
 * - No futuro, os dados virão do Supabase Auth (usuário logado) e da 
 *   tabela profiles no banco de dados.
 */

import Layout from "@/components/Layout";
import { User, MapPin, Star, Settings, LogOut, ChevronRight } from "lucide-react";

const menuOptions = [
  { icon: User, label: "Meus Anúncios" },
  { icon: Star, label: "Favoritos" },
  { icon: MapPin, label: "Endereços" },
  { icon: Settings, label: "Configurações" },
];

const Perfil = () => {
  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl">
        {/* Header do perfil */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground 
                        flex items-center justify-center text-xl font-bold">
            CB
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">Cauã Biorn</h2>
            <p className="text-sm text-muted-foreground">caua@email.com</p>
          </div>
        </div>

        {/* Menu de opções */}
        <div className="space-y-1">
          {menuOptions.map((option) => (
            <button
              key={option.label}
              className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                       hover:bg-secondary transition-colors duration-200 text-left
                       active:scale-[0.98]"
            >
              <option.icon className="w-5 h-5 text-muted-foreground" />
              <span className="flex-1 text-sm font-medium text-foreground">{option.label}</span>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}

          {/* Botão de sair — separado com estilo diferente */}
          <button className="w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
                           hover:bg-destructive/10 transition-colors duration-200 text-left mt-4
                           active:scale-[0.98]">
            <LogOut className="w-5 h-5 text-destructive" />
            <span className="flex-1 text-sm font-medium text-destructive">Sair</span>
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Perfil;
