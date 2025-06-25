import { alt, compose, literal, map, opt, repeated } from "./karasu.js";

/**
 * @import { ErrorNode, Syntax } from './karasu.js'
 */

/**
 * @typedef {WordNode | UnitNode | NumberNode | ErrorNode} Node
 *
 * @typedef {{ type: "error", error: Error }} ErrorNode
 * @typedef {{ type: "word", value: string, isHex: boolean, isColor: boolean  }} WordNode
 * @typedef {{ type: "unit", value: string }} UnitNode
 * @typedef {{ type: "number", value: string, unit: string }} NumberNode
 * @typedef {{ type: "digits", value: string }} Digits
 * @typedef {{ type: "calc-product", first: NumberNode | CalcSum, rest: Array<{ operator: "*" | "/", item: NumberNode | CalcSum }> }} CalcProduct
 * @typedef {{ type: "calc-sum", first: CalcProduct, rest: Array<{operator: "+" | "-", item: CalcProduct}> }} CalcSum
 */

/** @type {Syntax<WordNode>} */
function word(position) {
  /** @type {string[]} */
  const chars = [];
  let i = position.index;
  for (; i < position.source.length; i++) {
    const char = position.source[i];
    // Identifiers can start with a letter or underscore, and can contain letters, digits, underscores, and hyphens.
    if (
      (char >= "a" && char <= "z") ||
      (char >= "A" && char <= "Z") ||
      char === "_" ||
      (chars.length > 0 && char >= "0" && char <= "9") ||
      char === "-" ||
      (chars.length === 0 && char === "#")
    ) {
      chars.push(char);
      continue;
    }

    if (char === "\\") {
      // TODO: escaped character
    }

    break;
  }

  if (i === position.index) {
    /** @type {ErrorNode} */
    const error = {
      type: "error",
      error: new Error(`Expected word at index ${position.index}`),
    };
    return { node: error, position, errors: [error] };
  }
  const value = chars.join("");
  return {
    node: {
      type: "word",
      value,
      // eslint-disable-next-line regexp/no-unused-capturing-group
      isHex: /^#(.+)/u.test(value),
      // eslint-disable-next-line regexp/no-unused-capturing-group
      isColor: /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/iu.test(
        value,
      ),
    },
    position: { source: position.source, index: i },
    errors: [],
  };
}

/** @type {Syntax<UnitNode>} */
function unit(position) {
  /** @type {string[]} */
  const chars = [];
  let i = position.index;

  if (position.source[i] === "%") {
    return {
      node: { type: "unit", value: "%" },
      position: { source: position.source, index: i + 1 },
      errors: [],
    };
  }

  for (; i < position.source.length; i++) {
    const char = position.source[i];
    if ((char >= "a" && char <= "z") || (char >= "A" && char <= "Z")) {
      chars.push(char);
      continue;
    }
    break;
  }

  if (i === position.index) {
    /** @type {ErrorNode} */
    const error = {
      type: "error",
      error: new Error(`Expected unit at index ${position.index}`),
    };
    return { node: error, position, errors: [error] };
  }
  return {
    node: { type: "unit", value: chars.join("") },
    position: { source: position.source, index: i },
    errors: [],
  };
}

/** @type {Syntax<Digits>} */
function digits(position) {
  /** @type {string[]} */
  const chars = [];
  let i = position.index;

  for (; i < position.source.length; i++) {
    const char = position.source[i];
    if (char >= "0" && char <= "9") {
      chars.push(char);
      continue;
    }
    break;
  }

  if (i === position.index) {
    /** @type {ErrorNode} */
    const error = {
      type: "error",
      error: new Error(`Expected digits at index ${position.index}`),
    };
    return { node: error, position, errors: [error] };
  }

  return {
    node: { type: "digits", value: chars.join("") },
    position: { source: position.source, index: i },
    errors: [],
  };
}

/** @type {Syntax<NumberNode>} */
function number(position) {
  /** @type {Syntax<NumberNode>} */
  const syntax = compose()
    .bind({ d: digits })
    .bind({ u: opt(unit) })
    .end(({ d, u }) => ({
      type: "number",
      value: d.value,
      unit: u?.value ?? "",
    }));
  return syntax(position);
}

/** @type {Syntax<CalcSum>} */
function calcSum(position) {
  const base = repeated(
    calcProduct,
    compose()
      .bind({ __1: opt(spaces) })
      .bind({ op: alt(literal("+"), literal("-")) })
      .bind({ __2: opt(spaces) })
      .end(({ op }) => op),
  );
  return map(
    base,
    /** @returns {CalcSum} */
    ({ first, rest }) => ({
      type: "calc-sum",
      first,
      rest: rest.map(({ separator, item }) => ({ operator: separator, item })),
    }),
  )(position);
}

/** @type {Syntax<CalcProduct>} */
function calcProduct(position) {
  const base = repeated(
    alt(
      number,
      // @ts-expect-error
      compose()
        .bind({ _1: literal("(") })
        .bind({ sum: calcSum })
        .bind({ _3: literal(")") })
        .end(({ sum }) => sum),
    ),
    compose()
      .bind({ __1: opt(spaces) })
      .bind({ op: alt(literal("*"), literal("/")) })
      .bind({ __2: opt(spaces) })
      .end(({ op }) => op),
  );
  return map(
    base,
    /** @returns {CalcProduct} */
    ({ first, rest }) => ({
      type: "calc-product",
      first,
      rest: rest.map(({ separator, item }) => ({ operator: separator, item })),
    }),
  )(position);
}

/**
 * @type {Syntax<null>}
 */
function spaces(position) {
  let i = position.index;

  for (; i < position.source.length; i++) {
    const char = position.source[i];
    if ([" ", "\t", "\n"].includes(char)) {
      continue;
    }
    break;
  }

  if (i === position.index) {
    /** @type {ErrorNode} */
    const error = {
      type: "error",
      error: new Error(`Expected digits at index ${position.index}`),
    };
    return { node: error, position, errors: [error] };
  }

  return {
    node: null,
    position: { source: position.source, index: i },
    errors: [],
  };
}

export { calcProduct, calcSum, number, unit, word };
