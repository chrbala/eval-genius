import { extractValue } from "./utils";
import type { Genius, Reporter } from "./types";

export const genius: Genius = async ({
  vitest,
  concurrent,
  metadata,
  data: getData,
  task,
  exporters,
}) => {
  const runId = [
    "run",
    Date.now(),
    metadata.label,
    Math.floor(Math.random() * 100000),
  ].join("-");
  const fields = await extractValue(task.renderer.fields);
  const reporters: Array<Reporter<any>> = [];
  for (const exporter of exporters)
    reporters.push(
      await exporter().start({
        title: metadata.name,
        fields: ["runId", ...fields],
      })
    );

  const data = await extractValue(getData.values);

  const seen: Record<string, number> = {};
  data.forEach(({ name }) => {
    const existing = seen[name] || 0;
    seen[name] = existing + 1;
  });

  Object.entries(seen).forEach(([key, value]) => {
    if (value > 1)
      throw new Error(
        `[name="${key}"] was found [${value}] times in data. Each key should be unique.`
      );
  });

  let queueSize = data.length;

  const handleQueuePop = async () => {
    queueSize--;
    if (queueSize === 0)
      for (const reporter of reporters) await reporter.flush();
  };

  const { test, expect } = concurrent
    ? {
        test: vitest.test.concurrent,
        expect: new Proxy(vitest.expect, {
          get: (target, prop) => {
            if (prop === "soft") return target;
            // @ts-expect-error
            return target[prop];
          },
        }),
      }
    : { test: vitest.test, expect: vitest.expect };

  for (const { name, input, expected, only } of data)
    test(name, { only }, async ({ onTestFinished }) => {
      onTestFinished(handleQueuePop);

      const output = await task.execute(input);
      const rendered = await task.renderer.render({
        input,
        output,
        expected,
      });

      const _assertions = task.test(expect as typeof vitest.expect, {
        input,
        output,
        expected,
        rendered,
      });

      for (const reporter of reporters)
        await reporter.report({
          result: { runId, ...rendered },
        });

      await _assertions;
    });
};
