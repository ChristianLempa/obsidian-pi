import obsidianmd from "eslint-plugin-obsidianmd";

export default [
  {
    ignores: ["main.js", "node_modules/**", "data.json", "pi-sessions/**", "*.zip"]
  },
  ...obsidianmd.configs.recommended
];
