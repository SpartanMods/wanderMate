import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Earth-tone, rugged palette
        basecamp: {
          950: "#0c0a07",
          900: "#15110b",
          850: "#1c1810",
          800: "#241e14",
          700: "#33291a",
          600: "#4a3c27",
        },
        moss: {
          50: "#f3f6ed",
          100: "#e2ead2",
          200: "#c5d6a6",
          300: "#a3bd74",
          400: "#85a24f",
          500: "#688140",
          600: "#516633",
          700: "#3f4f2a",
          800: "#344025",
          900: "#2c3621",
        },
        rust: {
          50: "#fbf4ef",
          100: "#f4e0d2",
          200: "#e7bd9d",
          300: "#d9956a",
          400: "#cd7442",
          500: "#bd5a2e",
          600: "#a64626",
          700: "#893622",
          800: "#702e21",
          900: "#5d2a1f",
        },
        sand: {
          50: "#faf7f0",
          100: "#f0e9d6",
          200: "#e2d3ad",
          300: "#d0b67d",
          400: "#c09e57",
        },
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica", "Arial", "sans-serif"],
      },
      backgroundImage: {
        "topo": "radial-gradient(circle at 20% 30%, rgba(104,129,64,0.08) 0, transparent 40%), radial-gradient(circle at 80% 70%, rgba(189,90,46,0.08) 0, transparent 45%)",
      },
    },
  },
  plugins: [],
};

export default config;
