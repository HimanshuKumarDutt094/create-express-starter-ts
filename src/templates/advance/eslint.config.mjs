// eslint.config.js
import tsPlugin from "@typescript-eslint/eslint-plugin";
import tsParser from "@typescript-eslint/parser";
import prettierConfig from "eslint-config-prettier";
import prettierPlugin from "eslint-plugin-prettier";
import { defineConfig } from "eslint/config";

export default defineConfig([
  {
    files: ["**/*.ts"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        sourceType: "module",
      },
      globals: {
        // Add test globals if needed (e.g. jest)
      },
    },
    plugins: {
      "@typescript-eslint": tsPlugin,
      prettier: prettierPlugin,
    },
    extends: [
      "eslint:recommended",
      tsPlugin.configs.recommended,
      "plugin:prettier/recommended",
      prettierConfig
    ],
    rules: {
      "no-unused-vars": "warn",
      "prefer-const": "error",
      "no-console": "warn",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/strict-boolean-expressions": "error"
    },
    ignores: ["dist/**", "node_modules/**"],
    linterOptions: {
      noInlineConfig: true,
      reportUnusedDisableDirectives: "warn"
    }
  }
]);
