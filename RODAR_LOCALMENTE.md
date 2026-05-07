# Rodar o AgroConnect Localmente (VSCode)

Siga os passos abaixo para executar o projeto na sua máquina.

## 1. Pré-requisitos

- **Node.js 18+** (recomendado 20+) — https://nodejs.org
- **npm** (já vem com o Node) ou **bun** (https://bun.sh)
- **Git** — https://git-scm.com
- **VSCode** — https://code.visualstudio.com

Verifique no terminal:
```bash
node -v
npm -v
```

## 2. Baixar o projeto

```bash
git clone <URL_DO_SEU_REPOSITORIO>
cd <pasta-do-projeto>
```

Ou descompacte o ZIP exportado do Lovable e abra a pasta no VSCode.

## 3. Instalar dependências

```bash
npm install
```

(Se preferir bun: `bun install`)

## 4. Criar o arquivo `.env.local`

Na **raiz do projeto** (mesma pasta do `package.json`), crie um arquivo chamado `.env.local` com este conteúdo:

```env
VITE_SUPABASE_URL=https://rytcgdbzjytjodekcmeg.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5dGNnZGJ6anl0am9kZWtjbWVnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQyMDYxMzIsImV4cCI6MjA4OTc4MjEzMn0.hqz2McHtzeolDqE_EyBAqWQo7sM5fzWbBWr9xmCZw9E
VITE_SUPABASE_PROJECT_ID=rytcgdbzjytjodekcmeg
```

> Estas chaves são **públicas (anon key)** — podem ficar no front-end com segurança, pois o backend é protegido por RLS (Row Level Security).

Já deixei um arquivo `.env.example` no projeto. Você pode simplesmente copiar:

**Windows (PowerShell):**
```powershell
Copy-Item .env.example .env.local
```

**Mac/Linux:**
```bash
cp .env.example .env.local
```

## 5. Rodar o servidor de desenvolvimento

```bash
npm run dev
```

Abra no navegador o endereço que aparecer no terminal (geralmente):
```
http://localhost:8080
```

## 6. Modo de Demonstração TCC

O projeto possui um **modo simulação** que usa `localStorage` (não precisa de internet/banco).
Útil para apresentação acadêmica do TCC: as compras, vendas, código de 6 dígitos e chat funcionam offline.

## Problemas Comuns

| Problema | Solução |
|---|---|
| Tela branca | Confira se criou o `.env.local` com as 3 variáveis e reinicie `npm run dev` |
| `Cannot find module` | Rode `npm install` novamente |
| Porta 8080 em uso | Edite `vite.config.ts` ou pare o outro processo |
| Erro de Node version | Atualize Node para versão 18+ |

## Scripts úteis

```bash
npm run dev       # roda em modo desenvolvimento
npm run build     # gera build de produção em /dist
npm run preview   # serve o build localmente para testar
npm run lint      # roda o ESLint
```
