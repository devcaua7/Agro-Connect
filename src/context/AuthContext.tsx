/**
 * AUTH CONTEXT — Gerenciamento global de autenticação
 * 
 * EXPLICAÇÃO:
 * - Context API é um recurso do React que permite compartilhar dados entre 
 *   componentes SEM precisar passar props manualmente em cada nível.
 * - Este contexto armazena o estado de autenticação (usuário logado/deslogado)
 *   e expõe funções de login, cadastro e logout.
 * - useEffect com onAuthStateChange: escuta mudanças na sessão do Supabase.
 *   Quando o usuário faz login ou logout, esse listener atualiza o estado.
 * - O Provider envolve toda a árvore de componentes no App.tsx.
 */

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signInDemo: () => void;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEMO_AUTH_KEY = "agroconnect_demo_auth";

const demoUser = {
  id: "demo-user",
  aud: "authenticated",
  role: "authenticated",
  email: "demo@agroconnect.local",
  email_confirmed_at: new Date(0).toISOString(),
  phone: "",
  confirmed_at: new Date(0).toISOString(),
  last_sign_in_at: new Date().toISOString(),
  app_metadata: { provider: "demo", providers: ["demo"] },
  user_metadata: { display_name: "Usuário Demo" },
  identities: [],
  created_at: new Date(0).toISOString(),
  updated_at: new Date().toISOString(),
  is_anonymous: false,
} as unknown as User;

const hasDemoAuth = () => localStorage.getItem(DEMO_AUTH_KEY) === "true";

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const applySession = (session: Session | null) => {
      if (session?.user) {
        setSession(session);
        setUser(session.user);
      } else if (hasDemoAuth()) {
        setSession(null);
        setUser(demoUser);
      } else {
        setSession(null);
        setUser(null);
      }
      setLoading(false);
    };

    /*
      IMPORTANTE: configurar o listener ANTES de chamar getSession().
      Isso garante que nenhuma mudança de estado seja perdida.
    */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        applySession(session);
      }
    );

    // Busca sessão existente (ex: usuário já estava logado)
    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    // Cleanup: remove o listener quando o componente desmonta
    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { display_name: displayName },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error };
  };

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem(DEMO_AUTH_KEY);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signInDemo = () => {
    localStorage.setItem(DEMO_AUTH_KEY, "true");
    setSession(null);
    setUser(demoUser);
    setLoading(false);
  };

  const signOut = async () => {
    localStorage.removeItem(DEMO_AUTH_KEY);
    setSession(null);
    setUser(null);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signInDemo, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook customizado para acessar o contexto de autenticação.
 * Exemplo de uso: const { user, signOut } = useAuth();
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth deve ser usado dentro de um AuthProvider");
  }
  return context;
};
