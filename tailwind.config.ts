import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#3FC8E4",
          50: "#ecfbff",
          100: "#d4f5fc",
          200: "#aceaf8",
          300: "#74daf1",
          400: "#3FC8E4",
          500: "#16aacb",
          600: "#1188ab",
          700: "#156d8b",
          800: "#1a5a72",
          900: "#1a4b60",
        },
        accent: {
          green: "#7DE3A6",
          purple: "#9A7BFF",
        },
        ink: {
          DEFAULT: "#2B2F3A",
          soft: "#6B7280",
          faint: "#9CA3AF",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 3px rgba(16,24,40,0.06), 0 1px 2px rgba(16,24,40,0.04)",
        soft: "0 4px 24px rgba(16,24,40,0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
