import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import packageJson from './package.json';
import dts from 'vite-plugin-dts'

const __dirname = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  build: {
    lib: {
      entry: {
        "eval-genius": resolve(__dirname, "src/genius.ts"),
        "exporters/google-sheets-exporter": resolve(
          __dirname,
          "src/GoogleSheetsExporter.ts"
        ),
      },
      name: "eval-genius",
    },
    rollupOptions: {
      external: Object.keys(packageJson.dependencies),
    },
  },
  plugins: [dts()]
});
