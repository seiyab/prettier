import {
  literal,
  source,
} from "../../src/language-css/parse/parse-value/syntax-builder.js";
import {
  calcSum,
  func,
  number,
  unit,
  word,
} from "../../src/language-css/parse/parse-value/value-syntax.js";

it("literal", () => {
  const l = literal("abc");

  expect(l(source("abc"))).toEqual({
    node: "abc",
    position: { source: "abc", index: 3 },
    errors: [],
  });

  expect(l(source("def"))).toEqual({
    node: { type: "error", error: expect.anything() },
    position: { source: "def", index: 0 },
    errors: [expect.anything()],
  });
});

describe("word", () => {
  // https://developer.mozilla.org/en-US/docs/Web/CSS/ident#examples
  it.each(["nano79", "ground-level", "-test", "--toto", "_internal"])(
    "%s",
    (input) => {
      expect(word(source(input))).toEqual({
        node: {
          type: "word",
          value: input,
          isHex: false,
          isColor: false,
        },
        position: { source: input, index: input.length },
        errors: [],
      });
    },
  );

  describe("color / hex", () => {
    it.each(["#012", "#3456", "#7890ab", "#cdef0000"])("%s", (input) => {
      expect(word(source(input))).toEqual({
        node: {
          type: "word",
          value: input,
          isHex: true,
          isColor: true,
        },
        position: { source: input, index: input.length },
        errors: [],
      });
    });

    it.each(["#12345", "#123456789"])("%s", (input) => {
      expect(word(source(input))).toEqual({
        node: {
          type: "word",
          value: input,
          isHex: true,
          isColor: false,
        },
        position: { source: input, index: input.length },
        errors: [],
      });
    });
  });
});

describe("func", () => {
  it("rgba(255, 0, 0, 1)", () => {
    const input = "rgba(255, 0, 0, 1)";
    const out = func(source(input));
    expect(out).toEqual({
      position: { source: input, index: input.length },
      node: expect.anything(),
      errors: [],
    });
    expect(out.node).toMatchInlineSnapshot(`
      {
        "group": {
          "close": {
            "type": "paren",
            "value": ")",
          },
          "groups": [
            {
              "type": "number",
              "unit": "",
              "value": "255",
            },
            {
              "type": "number",
              "unit": "",
              "value": "0",
            },
            {
              "type": "number",
              "unit": "",
              "value": "0",
            },
            {
              "type": "number",
              "unit": "",
              "value": "1",
            },
          ],
          "open": {
            "type": "paren",
            "value": "(",
          },
          "type": "paren_group",
        },
        "skipped": "",
        "type": "func",
        "value": "rgba",
      }
    `);
  });

  it("invald(123px, &%@)ab", () => {
    const input = "invald(123px, &%@)ab";
    const out = func(source(input));
    expect(out.position).toEqual({
      source: input,
      index: input.length - 2,
    });
    expect(out.node).toMatchInlineSnapshot(`
      {
        "group": {
          "close": {
            "type": "paren",
            "value": ")",
          },
          "groups": [
            {
              "type": "number",
              "unit": "px",
              "value": "123",
            },
          ],
          "open": {
            "type": "paren",
            "value": "(",
          },
          "type": "paren_group",
        },
        "skipped": ", &%@",
        "type": "func",
        "value": "invald",
      }
    `);
    expect(out.errors.length).toBeGreaterThan(0);
  });
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

  it("fail", () => {
    expect(unit(source("123px"))).toEqual({
      position: { source: "123px", index: 0 },
      node: {
        type: "error",
        error: expect.anything(),
      },
      errors: expect.anything(),
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

describe("calcSum", () => {
  it("1234 + 5678", () => {
    expect(calcSum(source("1234 + 5678"))).toMatchInlineSnapshot(`
      {
        "errors": [],
        "node": {
          "first": {
            "first": {
              "type": "number",
              "unit": "",
              "value": "1234",
            },
            "rest": [],
            "type": "calc-product",
          },
          "rest": [
            {
              "item": {
                "first": {
                  "type": "number",
                  "unit": "",
                  "value": "5678",
                },
                "rest": [],
                "type": "calc-product",
              },
              "operator": "+",
            },
          ],
          "type": "calc-sum",
        },
        "position": {
          "index": 11,
          "source": "1234 + 5678",
        },
      }
    `);
  });

  it("100px+5px", () => {
    const result = calcSum(source("100px+5px"));
    expect(result).toEqual({
      node: expect.anything(),
      position: { source: "100px+5px", index: 9 },
      errors: [],
    });
    expect(result.node).toMatchInlineSnapshot(`
      {
        "first": {
          "first": {
            "type": "number",
            "unit": "px",
            "value": "100",
          },
          "rest": [],
          "type": "calc-product",
        },
        "rest": [
          {
            "item": {
              "first": {
                "type": "number",
                "unit": "px",
                "value": "5",
              },
              "rest": [],
              "type": "calc-product",
            },
            "operator": "+",
          },
        ],
        "type": "calc-sum",
      }
    `);
  });

  it("100px+5px * 5 - 100px /(7 + 1)", () => {
    const result = calcSum(source("100px+5px * 5 - 100px /(7 + 1)"));
    expect(result).toEqual({
      node: expect.anything(),
      position: { source: "100px+5px * 5 - 100px /(7 + 1)", index: 30 },
      errors: [],
    });
    expect(result.node).toMatchInlineSnapshot(`
      {
        "first": {
          "first": {
            "type": "number",
            "unit": "px",
            "value": "100",
          },
          "rest": [],
          "type": "calc-product",
        },
        "rest": [
          {
            "item": {
              "first": {
                "type": "number",
                "unit": "px",
                "value": "5",
              },
              "rest": [
                {
                  "item": {
                    "type": "number",
                    "unit": "",
                    "value": "5",
                  },
                  "operator": "*",
                },
              ],
              "type": "calc-product",
            },
            "operator": "+",
          },
          {
            "item": {
              "first": {
                "type": "number",
                "unit": "px",
                "value": "100",
              },
              "rest": [
                {
                  "item": {
                    "first": {
                      "first": {
                        "type": "number",
                        "unit": "",
                        "value": "7",
                      },
                      "rest": [],
                      "type": "calc-product",
                    },
                    "rest": [
                      {
                        "item": {
                          "first": {
                            "type": "number",
                            "unit": "",
                            "value": "1",
                          },
                          "rest": [],
                          "type": "calc-product",
                        },
                        "operator": "+",
                      },
                    ],
                    "type": "calc-sum",
                  },
                  "operator": "/",
                },
              ],
              "type": "calc-product",
            },
            "operator": "-",
          },
        ],
        "type": "calc-sum",
      }
    `);
  });
});
