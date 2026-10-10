import { mkdirSync, writeFileSync } from "node:fs";

import { createGoldenVector } from "../src/index.ts";
import { makeInput } from "../test/support/generator-input.ts";

const output = new URL("../fixtures/generator-vector.v1.json", import.meta.url);
mkdirSync(new URL("../fixtures/", import.meta.url), { recursive: true });
writeFileSync(output, `${JSON.stringify(createGoldenVector(makeInput()), null, 2)}\n`, {
  encoding: "utf8",
});
