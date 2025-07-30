import { genius } from "../src/genius";
import { GoogleSheetsExporter } from "../src/GoogleSheetsExporter";
import { describe } from "vitest";
import * as vitest from "vitest";

[
  { label: "control", execute: (value: string) => value.toUpperCase() },
  {
    label: "experiment",
    execute: (value: string) => value.toUpperCase() + " [invalid]",
  },
].forEach(({ label, execute }) => 
  describe(`my-test [${label}]`, () => genius({
    vitest,
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
      test: (expect, { rendered, expected, output }) => {
        /**
         * Use the rendered values to represent the values sent to the exporter
         */
        expect
          .soft(rendered.capitalizesCorrectly, "capitalizes correctly")
          .toBe(true);

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
