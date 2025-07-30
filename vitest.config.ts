import { defineConfig } from "vitest/config";
import { GoogleSheetsExporter } from "./src/GoogleSheetsExporter";
import dotenv from "dotenv";

dotenv.config();

const googleSheetsExporter = GoogleSheetsExporter();

const now = new Date();
await googleSheetsExporter.init({
  title: `Evals [${now.toLocaleDateString()} ${now.toLocaleTimeString()}]`,
});

export default defineConfig({
  test: {
    include: ["./**/*.eval.ts"],
  },
});
