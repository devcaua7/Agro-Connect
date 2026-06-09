import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { ThemeProvider } from "@/context/ThemeContext";
import Configuracoes from "./pages/Configuracoes";
import Index from "./pages/Index";
import Buscar from "./pages/Buscar";
import Anunciar from "./pages/Anunciar";
import Chat from "./pages/Chat";
import Perfil from "./pages/Perfil";
import Login from "./pages/Login";
import ResetPassword from "./pages/ResetPassword";
import ProductDetail from "./pages/ProductDetail";
import Pagamento from "./pages/Pagamento";
import Carrinho from "./pages/Carrinho";
import MinhasCompras from "./pages/MinhasCompras";
import MinhasVendas from "./pages/MinhasVendas";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/buscar" element={<Buscar />} />
              <Route path="/anunciar" element={<Anunciar />} />
              <Route path="/chat" element={<Chat />} />
              <Route path="/perfil" element={<Perfil />} />
              <Route path="/produto/:id" element={<ProductDetail />} />
              <Route path="/pagamento/:orderId" element={<Pagamento />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/minhas-compras" element={<MinhasCompras />} />
              <Route path="/minhas-vendas" element={<MinhasVendas />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
