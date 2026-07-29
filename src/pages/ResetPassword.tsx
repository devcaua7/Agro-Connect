import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf, Lock } from "lucide-react";

const ResetPassword = () => {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [valid, setValid] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    // Listen for the PASSWORD_RECOVERY event that Supabase fires when the
    // recovery link is opened (works with the modern PKCE flow).
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (cancelled) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setValid(true);
        setChecking(false);
      }
    });

    (async () => {
      try {
        const url = new URL(window.location.href);
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));

        const errorDesc = url.searchParams.get("error_description") || hash.get("error_description");
        if (errorDesc) {
          setErrorMsg(decodeURIComponent(errorDesc));
          setChecking(false);
          return;
        }

        // PKCE flow: ?code=...
        const code = url.searchParams.get("code");
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            setErrorMsg(error.message);
            setChecking(false);
            return;
          }
          setValid(true);
          setChecking(false);
          return;
        }

        // OTP token flow: ?token_hash=...&type=recovery
        const tokenHash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type");
        if (tokenHash && type === "recovery") {
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: "recovery" });
          if (error) {
            setErrorMsg(error.message);
            setChecking(false);
            return;
          }
          setValid(true);
          setChecking(false);
          return;
        }

        // Implicit flow: #access_token=...&type=recovery
        if (hash.get("type") === "recovery" && hash.get("access_token")) {
          const { error } = await supabase.auth.setSession({
            access_token: hash.get("access_token")!,
            refresh_token: hash.get("refresh_token") ?? "",
          });
          if (error) {
            setErrorMsg(error.message);
            setChecking(false);
            return;
          }
          setValid(true);
          setChecking(false);
          return;
        }

        // Fallback: maybe there's already an active session from the auth listener
        const { data } = await supabase.auth.getSession();
        if (data.session) {
          setValid(true);
        }
        setChecking(false);
      } catch (err: any) {
        setErrorMsg(err?.message ?? "Erro ao validar link de recuperação.");
        setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }
    if (password.length < 6) {
      toast.error("A senha deve ter no mínimo 6 caracteres.");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      toast.error("Erro ao redefinir senha: " + error.message);
    } else {
      toast.success("Senha redefinida com sucesso! Faça login novamente.");
      await supabase.auth.signOut();
      navigate("/login");
    }
    setLoading(false);
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <p className="text-muted-foreground text-sm">Validando link de recuperação...</p>
      </div>
    );
  }

  if (!valid) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="text-center max-w-sm">
          <p className="text-muted-foreground">
            {errorMsg ?? "Link de recuperação inválido ou expirado."}
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Solicite um novo email de recuperação na tela de login.
          </p>
          <button onClick={() => navigate("/login")} className="text-primary font-semibold hover:underline mt-4">
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <Leaf className="w-8 h-8 text-primary" />
            <h1 className="text-2xl font-bold">
              <span className="text-primary">Agro</span>
              <span className="text-foreground">Connect</span>
            </h1>
          </div>
          <p className="text-sm text-muted-foreground">Defina sua nova senha</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Nova senha</label>
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
          </div>
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Confirmar senha</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Repita a nova senha"
              required
              className="w-full px-4 py-3 rounded-xl bg-card border border-border text-foreground text-sm
                         placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold text-sm
                       hover:opacity-90 active:scale-[0.97] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Lock className="w-4 h-4" />
            {loading ? "Redefinindo..." : "Redefinir Senha"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;
