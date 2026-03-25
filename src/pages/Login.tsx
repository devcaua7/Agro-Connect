import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

const Login = () => {
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "forgot") {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Email de recuperação enviado! Verifique sua caixa de entrada.");
      }
      setLoading(false);
      return;
    }

    if (mode === "signup") {
      const { error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada! Verifique seu email para confirmar.");
      }
    } else {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error("Email ou senha incorretos.");
      } else {
        toast.success("Login realizado!");
        navigate("/");
      }
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8 animate-fade-in-up">
          <div className="inline-flex items-center gap-2 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Agro</span>
              <span className="text-foreground">Connect</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">
            {mode === "login" ? "Entre na sua conta" : mode === "signup" ? "Crie sua conta para começar" : "Recupere sua senha"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 animate-fade-in-up" style={{ animationDelay: "100ms" }}>
          {mode === "signup" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Nome</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Seu nome completo"
                required
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="seu@email.com"
              required
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>

          {mode !== "forgot" && (
            <div>
              <label className="text-sm font-medium text-foreground mb-1.5 block">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                required
                minLength={6}
                className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                           placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              {mode === "login" && (
                <button
                  type="button"
                  onClick={() => setMode("forgot")}
                  className="text-xs text-primary hover:underline mt-1.5"
                >
                  Esqueceu a senha?
                </button>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                       hover:opacity-90 active:scale-[0.97] transition-all duration-200 disabled:opacity-50"
          >
            {loading ? "Carregando..." : mode === "login" ? "Entrar" : mode === "signup" ? "Criar Conta" : "Enviar Email de Recuperação"}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-6 animate-fade-in-up" style={{ animationDelay: "200ms" }}>
          {mode === "login" ? (
            <>Não tem conta? <button onClick={() => setMode("signup")} className="text-primary font-semibold hover:underline">Cadastre-se</button></>
          ) : (
            <>Já tem conta? <button onClick={() => setMode("login")} className="text-primary font-semibold hover:underline">Faça login</button></>
          )}
        </p>
      </div>
    </div>
  );
};

export default Login;
