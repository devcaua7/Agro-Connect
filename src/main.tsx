import { createRoot } from "react-dom/client";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Elemento #root não encontrado no index.html");
}

// Fallback com as chaves públicas do projeto para o app nunca cair na tela
// de configuração quando o .env não for carregado (preview, build, etc).
const FALLBACK_SUPABASE_URL = "https://rytcgdbzjytjodekcmeg.supabase.co";
const FALLBACK_SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dGNnZGJ6anl0am9kZWtjbWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDYxMzIsImV4cCI6MjA4OTc4MjEzMn0.hqz2McHtzeolDqE_EyBAqWQo7sM5fzWbBWr9xmCZw9E";

if (!import.meta.env.VITE_SUPABASE_URL) {
  import.meta.env.VITE_SUPABASE_URL = FALLBACK_SUPABASE_URL;
}
if (!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY) {
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY = FALLBACK_SUPABASE_KEY;
}

const hasCloudConfig = Boolean(
  import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
);

const LocalSetupScreen = () => (
  <main className="min-h-screen bg-background text-foreground flex items-center justify-center p-6">
    <section className="w-full max-w-2xl rounded-lg border border-border bg-card p-6 shadow-sm">
      <p className="text-sm font-semibold text-primary">AgroConnect</p>
      <h1 className="mt-2 text-2xl font-bold">Configuração local pendente</h1>
      <p className="mt-3 text-muted-foreground">
        Crie um arquivo <strong>.env.local</strong> na raiz do projeto com as variáveis abaixo
        (ou copie o arquivo <strong>.env.example</strong>) e rode <strong>npm run dev</strong> novamente.
        Veja o passo a passo completo em <strong>RODAR_LOCALMENTE.md</strong>.
      </p>

      <div className="mt-5 rounded-md bg-muted p-4 font-mono text-xs text-muted-foreground overflow-x-auto">
        <p>VITE_SUPABASE_URL=https://rytcgdbzjytjodekcmeg.supabase.co</p>
        <p>VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOi...</p>
        <p>VITE_SUPABASE_PROJECT_ID=rytcgdbzjytjodekcmeg</p>
      </div>
    </section>
  </main>
);

const root = createRoot(rootElement);

if (!hasCloudConfig) {
  root.render(<LocalSetupScreen />);
} else {
  import("./App.tsx").then(({ default: App }) => {
    root.render(<App />);
  });
}
