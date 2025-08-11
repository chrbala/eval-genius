import { genius } from "../src/genius";
import { GoogleSheetsExporter } from "../src/GoogleSheetsExporter";
import { describe } from "vitest";
import * as vitest from "vitest";

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

[
  { label: "control", execute: (value: string) => value.toUpperCase() },
  {
    label: "experiment",
    execute: (value: string) => value.toUpperCase() + " [invalid]",
  },
].forEach(({ label, execute }) => 
  describe(`my-test [${label}]`, () => genius({
    vitest,
    concurrent: true,
    metadata: {
      name: "my-test",
      label,
    },
    data: {
      values: [
        {
          name: "basic test",
          input: "hello world!",
          expected: "HELLO WORLD!",
        },
        {
          name: "failing test",
          input: "hello world?",
          expected: "HELLO WORLD!",
        },
      ],
    },
    task: {
      execute,
      test: async (expect, { rendered, expected, output }) => {
        await delay(100);

        /**
         * Use the rendered values to represent the values sent to the exporter
         */
        expect
          .soft(rendered.capitalizesCorrectly, "capitalizes correctly")
          .toBe(1);

        /**
         * For more complex comparisons, error messages are clearer if the expect() call makes the comparison directly
         */
        expect.soft(output).toBe(expected);
      },
      renderer: {
        fields: ["input", "capitalizesCorrectly"],
        render: ({ input, output, expected }) => ({
          input,
          capitalizesCorrectly: output === expected ? 1 : 0,
        }),
      },
    },
    exporters: [GoogleSheetsExporter],
  }))
);
