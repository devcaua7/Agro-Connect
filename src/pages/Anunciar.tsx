/**
 * ANUNCIAR PAGE — Formulário para criar um anúncio
 * 
 * EXPLICAÇÃO:
 * - Página onde o produtor rural pode cadastrar seus produtos.
 * - Usa inputs controlados (controlled inputs) — cada campo é um <input> 
 *   HTML estilizado com Tailwind.
 * - No futuro, os dados serão enviados ao Supabase para persistir no banco.
 * - O botão usa as cores do design system (bg-primary text-primary-foreground).
 * - "active:scale-[0.97]" é o feedback tátil — o botão "encolhe" levemente ao clicar.
 */

import Layout from "@/components/Layout";
import { PlusCircle, Upload } from "lucide-react";

const Anunciar = () => {
  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl">
        <h2 className="text-2xl font-bold text-foreground mb-6">Criar Anúncio</h2>

        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nome do produto</label>
            <input
              type="text"
              placeholder="Ex: Tomate Orgânico"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Preço</label>
            <input
              type="text"
              placeholder="Ex: R$ 5,00/kg"
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Categoria</label>
            <select className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                              focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="">Selecione</option>
              <option value="verduras">Verduras</option>
              <option value="frutas">Frutas</option>
              <option value="legumes">Legumes</option>
              <option value="graos">Grãos</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Descrição</label>
            <textarea
              rows={4}
              placeholder="Descreva seu produto..."
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Fotos</label>
            <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center
                          text-muted-foreground hover:border-primary/40 transition-colors cursor-pointer">
              <Upload className="w-8 h-8 mb-2" />
              <span className="text-sm">Clique para enviar fotos</span>
            </div>
          </div>

          <button className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                           hover:opacity-90 active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2">
            <PlusCircle className="w-4 h-4" />
            Publicar Anúncio
          </button>
        </div>
      </div>
    </Layout>
  );
};

export default Anunciar;
