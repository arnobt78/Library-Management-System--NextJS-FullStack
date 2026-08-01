// Parent: REQ-0022
import { defineConfig, globalIgnores } from "eslint/config";
import eslintConfigPrettier from "eslint-config-prettier/flat";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";
import tailwind from "eslint-plugin-tailwindcss";

export default defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  ...tailwind.configs["flat/recommended"],
  eslintConfigPrettier,
  {
    rules: {
      "@next/next/no-img-element": "off",
      // The project intentionally uses semantic CSS classes alongside Tailwind utilities.
      "tailwindcss/no-custom-classname": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  globalIgnores([".next/**", "coverage/**"]),
]);
