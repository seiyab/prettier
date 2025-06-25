import {
  literal,
  source,
} from "../../src/language-css/parse/parse-value/karasu.js";
import {
  ident,
  number,
  unit,
} from "../../src/language-css/parse/parse-value/value-syntax.js";

it("literal", () => {
  const l = literal("abc");

  expect(l(source("abc"))).toEqual({
    node: null,
    position: { source: "abc", index: 3 },
    errors: [],
  });

  expect(l(source("def"))).toEqual({
    node: { type: "error", error: expect.anything() },
    position: { source: "def", index: 0 },
    errors: [expect.anything()],
  });
});

describe("ident", () => {
  // https://developer.mozilla.org/en-US/docs/Web/CSS/ident#examples
  it.each(["nano79", "ground-level", "-test", "--toto", "_internal"])(
    "%s",
    (input) => {
      expect(ident(source(input))).toEqual({
        node: {
          type: "ident",
          value: input,
        },
        position: { source: input, index: input.length },
        errors: [],
      });
    },
  );
});

describe("unit", () => {
  // https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Values_and_Units#units
  it.each(["%", "cap", "Hz", "in", "s", "deg", "grad"])("%s", (input) => {
    expect(unit(source(input))).toEqual({
      node: { type: "unit", value: input },
      position: { source: input, index: input.length },
      errors: [],
    });
  });
});

describe("number", () => {
  it("1234", () => {
    expect(number(source("1234"))).toEqual({
      node: { type: "number", value: "1234", unit: "" },
      position: { source: "1234", index: 4 },
      errors: [],
    });
  });

  it("1234px", () => {
    expect(number(source("1234px"))).toEqual({
      node: { type: "number", value: "1234", unit: "px" },
      position: { source: "1234px", index: 6 },
      errors: [],
    });
  });
});
