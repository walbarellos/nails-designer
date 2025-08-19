// tailwind.config.ts
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,js,jsx,mdx}",
    "./pages/**/*.{ts,tsx,js,jsx,mdx}",
    "./components/**/*.{ts,tsx,js,jsx,mdx}",
    "./src/**/*.{ts,tsx,js,jsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        panel:  "#111316", // fundo principal
        panel2: "#0c0f12", // superfícies internas (inputs, cartões escuros)
        ink:    "#e6e7ea", // cor do texto padrão
      },
      borderColor: {
        DEFAULT: "rgba(255,255,255,0.10)",
      },
    },
  },
  plugins: [],
};

export default config;
