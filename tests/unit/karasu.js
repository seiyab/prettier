import {
  literal,
  source,
} from "../../src/language-css/parse/parse-value/karasu.js";

it("literal", () => {
  const l = literal("abc");

  expect(l(source("abc"))).toEqual({
    node: { type: "literal", value: "abc" },
    position: { source: "abc", index: 3 },
    errors: [],
  });

  expect(l(source("def"))).toEqual({
    node: { type: "error", error: expect.anything() },
    position: { source: "def", index: 0 },
    errors: [expect.anything()],
  });
});
