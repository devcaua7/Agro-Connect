/**
 * APP — Componente raiz da aplicação
 * 
 * EXPLICAÇÃO:
 * - Este é o "topo da árvore" de componentes React.
 * - QueryClientProvider: gerencia cache de dados (React Query). Útil para 
 *   quando buscarmos dados do Supabase — ele cacheia, revalida e atualiza automaticamente.
 * - BrowserRouter + Routes: sistema de rotas. Cada <Route> mapeia uma URL para uma página.
 *   Ex: path="/buscar" renderiza o componente <Buscar />.
 * - A rota "*" (catch-all) captura URLs que não existem e mostra a página 404.
 * - TooltipProvider, Toaster, Sonner: componentes globais de UI (tooltips e notificações).
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index";
import Buscar from "./pages/Buscar";
import Anunciar from "./pages/Anunciar";
import Chat from "./pages/Chat";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/buscar" element={<Buscar />} />
          <Route path="/anunciar" element={<Anunciar />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/perfil" element={<Perfil />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
