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
  {
    // @tanstack/react-table's useReactTable() intentionally returns fresh
    // instance methods every render (its documented API contract), which the
    // React Compiler cannot verify as memoizable. This is expected upstream
    // library behavior, not a bug in this file — scoped off here only.
    files: ["components/ui/data-table.tsx"],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    // RHF form.watch() subscription for silent Zod submit-gates (Auth/Book forms).
    // Same React Compiler false-positive as useReactTable — documented RHF API.
    files: [
      "components/AuthForm.tsx",
      "components/admin/forms/BookForm.tsx",
    ],
    rules: {
      "react-hooks/incompatible-library": "off",
    },
  },
  globalIgnores([".next/**", "coverage/**"]),
]);
