import Layout from "@/components/Layout";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Moon, Sun, Bell, Lock, Globe, HelpCircle, Info, ChevronRight, Palette } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";

const Configuracoes = () => {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <Layout>
      <div className="px-4 md:px-8 pt-6 md:pt-8 max-w-2xl mx-auto pb-12">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <button
            onClick={() => navigate("/perfil")}
            className="p-2 rounded-xl hover:bg-secondary active:scale-[0.95] transition-all"
          >
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">Configurações</h1>
            <p className="text-sm text-muted-foreground">Personalize sua experiência</p>
          </div>
        </div>

        {/* Hero card — Tema */}
        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-card to-accent/10 p-6 mb-6">
          <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-primary/20 blur-3xl" />
          <div className="relative flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Palette className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold uppercase tracking-wider text-primary">Aparência</span>
              </div>
              <h2 className="text-lg font-bold text-foreground mb-1">Modo {isDark ? "Escuro" : "Claro"}</h2>
              <p className="text-sm text-muted-foreground">
                {isDark ? "Reduz o cansaço visual à noite." : "Visual claro e luminoso para o dia."}
              </p>
            </div>
            <button
              onClick={toggleTheme}
              className="relative w-14 h-14 rounded-2xl bg-card border border-border flex items-center justify-center
                         hover:scale-105 active:scale-95 transition-all shadow-sm"
              aria-label="Alternar tema"
            >
              {isDark ? (
                <Moon className="w-6 h-6 text-primary" />
              ) : (
                <Sun className="w-6 h-6 text-primary" />
              )}
            </button>
          </div>

          {/* Toggle pill */}
          <div className="mt-5 flex items-center gap-2 p-1 rounded-xl bg-card/60 backdrop-blur border border-border">
            <button
              onClick={() => isDark && toggleTheme()}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
                ${!isDark ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Sun className="w-4 h-4" /> Claro
            </button>
            <button
              onClick={() => !isDark && toggleTheme()}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all
                ${isDark ? "bg-primary text-primary-foreground shadow" : "text-muted-foreground hover:text-foreground"}`}
            >
              <Moon className="w-4 h-4" /> Escuro
            </button>
          </div>
        </div>

        {/* Section: Geral */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Geral</p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {[
            { icon: Bell, label: "Notificações", desc: "Pedidos, mensagens e ofertas" },
            { icon: Lock, label: "Privacidade e segurança", desc: "Senha, sessões e dados" },
            { icon: Globe, label: "Idioma", desc: "Português (Brasil)" },
          ].map((item, i) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/60 active:scale-[0.99] transition-all text-left
                ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        {/* Section: Suporte */}
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-2">Suporte</p>
        <div className="bg-card border border-border rounded-2xl overflow-hidden mb-6">
          {[
            { icon: HelpCircle, label: "Central de ajuda", desc: "Tire suas dúvidas" },
            { icon: Info, label: "Sobre o AgroConnect", desc: "Versão 1.0.0" },
          ].map((item, i) => (
            <button
              key={item.label}
              className={`w-full flex items-center gap-4 px-4 py-3.5 hover:bg-secondary/60 active:scale-[0.99] transition-all text-left
                ${i > 0 ? "border-t border-border" : ""}`}
            >
              <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                <item.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">{item.label}</p>
                <p className="text-xs text-muted-foreground truncate">{item.desc}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          ))}
        </div>

        <p className="text-center text-xs text-muted-foreground">
          🌱 AgroConnect · Direto do produtor para a sua mesa
        </p>
      </div>
    </Layout>
  );
};

export default Configuracoes;
