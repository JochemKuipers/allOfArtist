import { resolve } from "path";
import { defineConfig } from "@spicemod/creator";

// Learn more: https://github.com/sanoojes/spicetify-creator
export default defineConfig({
  name: "allOfArtist",
  framework: "react",
  linter: "biome",
  template: "extension",
  packageManager: "bun",
  esbuildOptions: {
    format: "iife",
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
