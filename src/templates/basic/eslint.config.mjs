// @ts-check
import eslint from "@eslint/js";
import nPlugin from "eslint-plugin-n";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import { defineConfig } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  // 1. Ignore files (Must be a separate object)
  {
    ignores: ["dist/", "node_modules/", "build/", "*.js", "*.mjs", "*.cjs"],
  },

  // 2. Core ESLint Recommended Rules (Separate object)
  eslint.configs.recommended,

  // 3. Node.js Specific Rules (Separate object)
  {
    files: ["**/*.{ts,js}"],
    plugins: {
      n: nPlugin,
    },
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        ...globals.node,
        ...globals.es2021,
      },
    },
    rules: {
      "n/no-sync": "warn",
      "n/handle-callback-err": "warn",
      "n/no-path-concat": "error",
      "n/hashbang": "error",
    },
  },

  // 4. TypeScript Core Recommended Rules (Separate object)
  ...tseslint.configs.recommended,

  // 5. TypeScript Strict Type-Checked Rules (Separate object)
  ...tseslint.configs.strictTypeChecked,

  // 6. Custom TypeScript Rules (Separate object)
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tseslint.parser,
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      "@typescript-eslint": tseslint.plugin,
    },
    rules: {
      // Your custom rules here
      "@typescript-eslint/consistent-type-definitions": ["error", "interface"],
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-shadow": "error",
      "prefer-const": "error",
      "@typescript-eslint/prefer-as-const": "error",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  // 7. Prettier Integration (Separate object and last in array)
  prettierRecommended,
]);
