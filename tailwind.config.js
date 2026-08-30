/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        navy: {
          50: "#EEF2F8",
          100: "#D6E0EE",
          200: "#AEC1DD",
          300: "#82A1CA",
          400: "#4E77AC",
          500: "#2A5CAA",
          600: "#1E4884",
          700: "#163864",
          800: "#0F2A52",
          900: "#0A1D3B",
          950: "#071429",
        },
        accent: {
          red: "#C23B3B",
          "red-dark": "#9E2E2E",
          gold: "#E8A93A",
          "gold-dark": "#C88A22",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          off: "#F6F8FB",
          soft: "#EEF1F5",
          border: "#E1E6ED",
        },
        ink: {
          900: "#0F1B2D",
          700: "#2B3A52",
          500: "#5B6B85",
          400: "#8493AC",
        },
      },
      fontFamily: {
        display: ["Manrope", "system-ui", "sans-serif"],
        body: ["Inter", "system-ui", "sans-serif"],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(15,27,45,0.04), 0 4px 16px rgba(15,27,45,0.06)",
        card: "0 2px 8px rgba(15,27,45,0.06), 0 8px 24px rgba(15,27,45,0.06)",
        lift: "0 8px 30px rgba(15,42,82,0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
      backgroundImage: {
        weave: "repeating-linear-gradient(45deg, rgba(15,42,82,0.035) 0px, rgba(15,42,82,0.035) 1px, transparent 1px, transparent 10px)",
      },
    },
  },
  plugins: [],
};
