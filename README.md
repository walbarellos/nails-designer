# 💅 Nails-Designer

Sistema de agendamento moderno e responsivo, otimizado para uso em dispositivos móveis. Construído com **Next.js**, **React**, **TailwindCSS** e boas práticas de acessibilidade, o projeto visa facilitar a gestão de horários de clientes com usabilidade simples e direta.

---

## 🚀 Funcionalidades

* 📅 Calendário mensal com seleção de dias e slots clicáveis de 1h.
* 📱 Design mobile-first (gestos, áreas grandes de toque, contraste adequado).
* 🔐 Área administrativa com autenticação simples e botão Sair.
* 🧩 Componentes reutilizáveis e estilização utilitária via TailwindCSS.
* ☁️ Deploy contínuo pela Vercel.

---

## 🧱 Arquitetura & Construção

* Next.js (App Router) para rotas e meta tags; `app/` concentra páginas e layouts.
* Componentização (e.g., CalendarMonthly, cartões, botões, cabeçalhos).
* Agendamento por blocos clicáveis (intervalos de 1h) para reduzir digitação e erros em mobile.
* Acessibilidade: navegação por teclado, atributos aria-\* em elementos interativos e contraste verificado.
* TailwindCSS com `globals.css` e camadas `@layer base/components/utilities`.
* Preparado para Vercel (build e preview automáticos a cada push).

---

## 📂 Estrutura do Projeto

nails-designer/
├─ app/                      # Páginas e layouts (Next.js App Router)
│  ├─ layout.tsx             # Layout raiz, fontes, metadados
│  ├─ page.tsx               # Landing / Calendário
│  ├─ admin/                 # Painel administrativo
│  └─ api/                   # Rotas (se aplicável)
├─ components/               # Componentes reutilizáveis (CalendarMonthly, etc.)
├─ public/                   # Imagens, ícones e assets estáticos
├─ styles/
│  └─ globals.css            # Tailwind + customizações
├─ tailwind.config.ts        # Configuração Tailwind
├─ tsconfig.json             # Configuração TypeScript
├─ package.json              # Scripts e dependências
└─ README.md                 # Este arquivo

---

## ✅ Pré-requisitos

* Node.js 20 LTS (recomendado) ou 18+
* npm (ou pnpm / yarn, se preferir)
* Conta na Vercel (para deploy opcional)

Verifique a versão do Node:
node -v

---

## ⚙️ Instalação e Execução

1. Clone o repositório:
   git clone [https://github.com/walbarellos/nails-designer.git](https://github.com/walbarellos/nails-designer.git)
   cd nails-designer

2. Instale as dependências:
   npm install
   (ou: pnpm install / yarn install)

3. Execute o ambiente de desenvolvimento:
   npm run dev
   (ou: pnpm dev / yarn dev)

4. Abra no navegador:
   [http://localhost:3000](http://localhost:3000)

Build e execução em produção local:
npm run build
npm run start

---

## 🧪 Scripts Disponíveis

* dev — inicia o servidor de desenvolvimento
* build — gera o build de produção
* start — executa o servidor em modo produção
* (opcional) lint — análise estática se configurada

Exemplo:
npm run dev

---

## 🌐 Deploy na Vercel

1. Crie um projeto na Vercel e conecte o repositório GitHub.
2. A Vercel detectará Next.js e aplicará o pipeline automático.
3. Cada push em `main` (ou branch configurada) gera um preview e/ou produção.
4. Variáveis de ambiente (se necessárias) podem ser definidas em Settings → Environment Variables.

---

## ♿ Acessibilidade e UX (Resumo)

* Toque amigável: áreas clicáveis maiores para dedos.
* Foco visível: estados de foco/hover em botões e links.
* Leitura de tela: atributos aria-label, aria-live em mensagens.
* Sem digitação desnecessária: seleção de horários por blocos.
* Alto contraste: cores testadas para legibilidade.

---

## 🔧 Solução de Problemas Comuns

* Erro SWC / Next build: confirme `tsconfig.json` e versões (Node 18/20).
* Tailwind não aplica estilos: verifique `content` em `tailwind.config.ts` e import de `globals.css` no `layout.tsx`.
* Hydration warnings: garanta chaves estáveis e checagens de `window` apenas no client.

---

## 🧾 Licença (MIT)

MIT License

Copyright (c) 2025 Nails-Designer contributors

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the “Software”), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

---

## ✨ Créditos

Projeto desenvolvido sob os princípios de **Sabedoria, Força e Beleza**.
