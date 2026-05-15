import js from "@eslint/js";

const globals = {
  Buffer: "readonly",
  clearTimeout: "readonly",
  console: "readonly",
  document: "readonly",
  globalThis: "readonly",
  navigator: "readonly",
  process: "readonly",
  require: "readonly",
  ResizeObserver: "readonly",
  setTimeout: "readonly",
  URL: "readonly",
  window: "readonly",
  __filename: "readonly"
};

export default [
  {
    ignores: ["main.js", "node_modules/**", "data.json", "pi-sessions/**", "*.zip"]
  },
  js.configs.recommended,
  {
    files: ["src/main.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals
    },
    rules: {
      "no-unused-vars": "off",
      "no-redeclare": "off",
      "no-control-regex": "off",
      "no-empty": "off",
      "no-useless-assignment": "off",
      "no-useless-escape": "off"
    }
  },
  {
    files: ["scripts/**/*.mjs", "src/**/*.mjs", "tests/**/*.mjs"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals
    },
    rules: {
      "no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }]
    }
  }
];
