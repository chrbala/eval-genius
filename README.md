# eval-genius

eval-genius enables evals of arbitrary async code. It is generally intended for making multiple assertions on outputs which are generated nondeterministically. These assertions can be used to score algorithms on their effectiveness.

eval-genius is based heavily on [evalite](https://www.evalite.dev), with some key differences:

- eval-genius is designed to export data for analysis, where evalite handles the analysis internally. This gives more flexibility in the evaluation algorithms.
- eval-genius uses Vitest built-ins for its CLI and observing test results, which makes configuration more standardized.

## Installation

`yarn install -D eval-genius vitest`

## Setup

Override the default Vitest config so Vitest will pick up your evals from `*.eval.ts` files. If you already have vitest set up, you may want to use the `--config` flag to use a distinct configuration for evals from your existing tests.

```ts
// vitest.config.ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["./**/*.eval.ts"],
  },
});
```

## Writing evals

```ts
// my-test.eval.ts
import { genius } from "eval-genius";
import * as vitest from "vitest";
import { describe } from "vitest";

describe("my-test", () =>
  genius({
    vitest,
    /**
     * Runs tests concurrently according to the vitest 
     * maxConcurrency setting. Switches expect.soft() with 
     * expect() because expect.soft() does not work with 
     * concurrent tests in Vitest. Defaults to false.
     */
    concurrent: true,
    metadata: {
      /**
       * The name of the functionality under evaluation.
       */
      name: "my-test",

      /**
       * The name of the variation being tested. For example, if you
       * are testing two prompts, you can run the suite with
       * different labels for each prompt.
       */
      label: "my-experiment",
    },

    /**
     * The data to be processed and evaluated. `input` and `expected`
     * can be any type, and can diverge from each other.
     */
    data: {
      values: async () => [
        { 
          name: "basic test", 
          input: "hello world!", 
          expected: "HELLO WORLD!" 
        },
      ],
    },

    /**
     * The work done for every entry in data.values
     */
    task: {
      /**
       * The behavior being evaluated.
       */
      execute: async (input) => input.toUpperCase(),

      /**
       * Makes assertions to be shown in the Vitest output. Not used 
       * by the exporters. Use the expect() function provided here;
       * do not use expect() from Vitest directly.
       */
      test: async (expect, { rendered, expected, output }) => {
        /**
         * Use the rendered values to represent the values sent to 
         * the exporter
         */
        expect
          .soft(
            rendered.capitalizesCorrectly, 
            "capitalizes correctly"
          )
          .toBe(true);

        /**
         * For more complex comparisons, error messages are clearer 
         * if the expect() call makes the comparison directly
         */
        expect.soft(output).toBe(expected);
      },
      /**
       * Renders output to be sent to the exporters
       */
      renderer: {
        /**
         * The properties which the exporter should consume from 
         * the return values of the render function.
         */
        fields: ["capitalizesCorrectly"],

        /**
         * The data that the exporters should consume.
         */
        render: async ({ output, expected }) => ({
          capitalizesCorrectly: output === expected,
        }),
      },
    },

    /**
     * Destinations to send the rendered data.
     */
    exporters: [],
  }));
```

If you want to compare multiple implementations in an experiment, you can do something like this:

```ts
[
  { label: "control", execute: controlImplementation },
  { label: "test", execute: testImplementation },
].forEach(({ label, execute }) =>
  describe(`my-test [${label}]`, () =>
    genius({
      metadata: { name: "my-test", label },
      task: {
        execute,
        // ...task
      },
      // ...config
    })),
);
```

## Exporting data (optional)

### GoogleSheetsExporter

#### Set up Google Service Account credentials

See [the google-sheets documentation](https://theoephraim.github.io/node-google-spreadsheet/#/guides/authentication) for how to create your keys.
Create a `.env` file with:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account-email
GOOGLE_PRIVATE_KEY=your-private-key

# this is the email of the account you want the documents to be saved in
MY_GOOGLE_ACCOUNT_EMAIL=your-google-account-email
```

#### Initialize exporters

```ts
type NewDocumentInit = { title: string; folderId?: string };
type ExistingDocumentInit = { spreadsheetId: string };
type InitArg = NewDocumentInit | ExistingDocumentInit;
```

```ts
import { defineConfig } from "vitest/config";
import { GoogleSheetsExporter } from "eval-genius/GoogleSheetsExporter";
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
```

#### Use the exporter

```ts
// my-test.eval.ts
import { genius } from "eval-genius";
import { GoogleSheetsExporter } from "./src/GoogleSheetsExporter";
import * as vitest from "vitest";

genius({
  // ...config
  exporters: [GoogleSheetsExporter],
});
```

#### What is generated?

You will get a table of the output that is generated from the renderer, with a `runId` supplied.

![Spreadsheet of the data](https://github.com/chrbala/eval-genius/blob/release/assets/data.png?raw=true)

#### Why Google Sheets?

Google Sheets is a straightforward way of running aggregate analysis on data. In particular, [Pivot Tables](https://support.google.com/docs/answer/1272900) make it very easy to compare outputs of different runs. The below example indicates a regression when changing from the control to the experiment.

![Pivot of the data](https://github.com/chrbala/eval-genius/blob/release/assets/pivot.png?raw=true)

### Custom reporters

Custom exporters can export to any destination. They must comply with this type definition:

```ts
type RenderedValue = boolean | number | string | null;
type Rendered<T extends string> = Record<T, RenderedValue>;

export type Reporter<FieldNames extends string> = {
  /**
   * Queues data to be sent to the destination.
   */
  report: (arg: { result: Rendered<FieldNames> }) => MaybePromise<unknown>;

  /**
   * Sends data to the destination.
   */
  flush: () => MaybePromise<unknown>;
};

export type Exporter<InitArgs extends any, InitReturn extends any> = () => {
  /**
   * Any initialization logic for the reporter.
   */
  init: (arg: InitArgs) => InitReturn;

  /**
   * Creates the reporter.
   */
  start: <FieldNames extends string>(arg: {
    title: string;
    fields: Array<FieldNames>;
  }) => MaybePromise<Reporter<FieldNames>>;
};
```

## Tips

- Make sure to cache your algorithms! Generating outputs can be slow and expensive, so caching is important.
- In general, numeric output is the easiest to evaluate. It is easiest to use numbers where possible as output in the renderer. For example, booleans can be more easily represented as 0 or 1 for aggregation.
