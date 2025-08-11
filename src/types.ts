import type { MaybePromise, MaybeFunction } from './utils';
import type * as Vitest from 'vitest';

export type RenderedValue = boolean | number | string | null;
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

type GeniusConfig<
  TInput extends any,
  TOutput extends any,
  TExpected extends any,
  TRenderedFields extends string,
  TRendered extends Rendered<TRenderedFields>,
> = {
  /**
   * Runs tests concurrently. Switches expect.soft() with expect() because expect.soft() does not work with concurrent tests in Vitest.
   */
  concurrent?: boolean;
  vitest: typeof Vitest;
  metadata: {
    /**
     * The name of the functionality under evaluation.
     */
    name: string;

    /**
     * The name of the variation being tested. For example, if you are testing two prompts,
     * you can run the suite with different labels for each prompt.
     */
    label: string;
  };

  /**
   * The data to be processed and evaluated.
   */
  data: {
    values: MaybeFunction<
      MaybePromise<
        Array<{
          name: string;
          input: TInput;
          expected: TExpected;
          only?: boolean;
        }>
      >
    >;
  };

  /**
   * The work done for every entry in data.values
   */
  task: {
    /**
     * The behavior being evaluated.
     */
    execute: (data: TInput) => MaybePromise<TOutput>;

    /**
     * Makes assertions to be shown in the Vitest output. Not used by the exporters.
     */
    test: (
      expect: typeof Vitest.expect,
      data: {
        input: TInput;
        output: TOutput;
        expected: TExpected;
        rendered: TRendered;
      }
    ) => MaybePromise<unknown>;

    /**
     * Renders output to be sent to the exporters
     */
    renderer: {
      /**
       * The properties which the exporter should consume from the return values of the
       * render function.
       */
      fields: MaybeFunction<
        MaybePromise<Array<Exclude<TRenderedFields, 'runId'>>>
      >;

      /**
       * The data that the exporters should consume.
       */
      render: (data: {
        input: TInput;
        output: TOutput;
        expected: TExpected;
      }) => MaybePromise<TRendered>;
    };
  };

  /**
   * Sends results for further processing
   */
  exporters: Array<Exporter<any, any>>;
};

export type Genius = <
  TInput extends any,
  TOutput extends any,
  TExpected extends any,
  TRenderedFields extends string,
  TRendered extends Rendered<TRenderedFields>,
>(
  config: GeniusConfig<TInput, TOutput, TExpected, TRenderedFields, TRendered>
) => void;
