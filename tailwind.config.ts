import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

export default {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "var(--font-ibm-plex-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        "ibm-plex-sans": [
          "var(--font-ibm-plex-sans)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        "bebas-neue": [
          "var(--font-bebas-neue)",
          "var(--bebas-neue)",
          "sans-serif",
        ],
      },
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        card: {
          DEFAULT: "var(--card)",
          foreground: "var(--card-foreground)",
        },
        popover: {
          DEFAULT: "var(--popover)",
          foreground: "var(--popover-foreground)",
        },
        // primary: {
        //   DEFAULT: "var(--primary)",
        //   foreground: "var(--primary-foreground)",
        // },
        secondary: {
          DEFAULT: "var(--secondary)",
          foreground: "var(--secondary-foreground)",
        },
        muted: {
          DEFAULT: "var(--muted)",
          foreground: "var(--muted-foreground)",
        },
        accent: {
          DEFAULT: "var(--accent)",
          foreground: "var(--accent-foreground)",
        },
        destructive: {
          DEFAULT: "var(--destructive)",
          foreground: "var(--destructive-foreground)",
        },
        border: "var(--border)",
        input: "var(--input)",
        ring: "var(--ring)",
        chart: {
          "1": "var(--chart-1)",
          "2": "var(--chart-2)",
          "3": "var(--chart-3)",
          "4": "var(--chart-4)",
          "5": "var(--chart-5)",
        },
        primary: {
          DEFAULT: "var(--primary)",
          foreground: "var(--primary-foreground)",
          admin: "#25388C",
        },
        green: {
          DEFAULT: "#027A48",
          100: "#ECFDF3",
          400: "#4C7B62",
          500: "#2CC171",
          800: "#027A48",
        },
        red: {
          DEFAULT: "#EF3A4B",
          400: "#F46F70",
          500: "#E27233",
          800: "#EF3A4B",
        },
        blue: {
          100: "#0089F1",
        },
        light: {
          100: "#D6E0FF",
          200: "#EED1AC",
          300: "#F8F8FF",
          400: "#EDF1F1",
          500: "#8D8D8D",
          600: "#F9FAFB",
          700: "#E2E8F0",
          800: "#F8FAFC",
        },
        dark: {
          100: "#16191E",
          200: "#3A354E",
          300: "#232839",
          400: "#1E293B",
          500: "#0F172A",
          600: "#333C5C",
          700: "#464F6F",
          800: "#1E2230",
        },
        gray: {
          100: "#CBD5E1",
        },
      },
      screens: {
        xs: "480px",
      },
      // Wider than default 7xl (80rem); 96rem = 1536px
      maxWidth: {
        "9xl": "96rem",
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      backgroundImage: {
        pattern: "url('/images/pattern.webp')",
      },
    },
  },
  plugins: [tailwindcssAnimate],
} satisfies Config;
