import {
  alt,
  compose,
  isErrorNode,
  literal,
  map,
  opt,
  recoverable,
  repeated,
} from "./syntax-builder.js";

/**
 * @import { ErrorNode, Syntax } from './syntax-builder.js'
 */

/**
 * @typedef {WordNode | UnitNode | NumberNode | ErrorNode} Node
 *
 * @typedef {{ type: "error", error: Error }} ErrorNode
 * @typedef {{ type: "word", value: string, isHex: boolean, isColor: boolean  }} WordNode
 * @typedef {{ type: "paren", value: "(" | ")"}} ParenNode
 * @typedef {{ type: "func", value: string, group: ParenGroupNode | ErrorNode, skipped: string }} FuncNode
 * @typedef {{ type: "paren_group", open: ParenNode, close: ParenNode, groups: NumberNode[] }} ParenGroupNode values inside parens
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

// /** @type {Syntax<ParenNode>} */
// function paren(position) {
//   /** @type {Syntax<"(" | ")">} */
//   const syntax = alt(literal("("), literal(")"));
//   /** @type {Syntax<ParenNode>} */
//   const transformed = map(syntax, (node) => ({
//     type: "paren",
//     value: node.value,
//   }));
//   return transformed(position);
// }

/** @type {Syntax<FuncNode>} */
function func(position) {
  const argsSyntax = recoverable({
    open: literal("("),
    close: literal(")"),
    body: repeated(
      number,
      compose()
        .drop(opt(spaces))
        .bind({ separator: literal(",") })
        .drop(opt(spaces))
        .end(
          /** @returns {null} */
          () => null,
        ),
    ),
  });

  const syntax = compose()
    .bind({ name: word })
    .bind({ args: argsSyntax })
    .end(
      /** @returns {FuncNode} */
      ({ name, args: argsSyntax }) => {
        const { body, skipped } = argsSyntax;
        return {
          type: "func",
          value: name.value,
          group: transformBody(body),
          skipped,
        };
      },
    );

  return syntax(position);
  /**
   * @param {ErrorNode | {
   *   first: NumberNode;
   *   rest: Array<{ item: NumberNode }>;
   * }} body
   * @returns {ParenGroupNode | ErrorNode}
   */
  function transformBody(body) {
    if (isErrorNode(body)) {
      return body;
    }
    return {
      type: "paren_group",
      open: { type: "paren", value: "(" },
      groups: [body.first, ...body.rest.map(({ item }) => item)],
      close: { type: "paren", value: ")" },
    };
  }
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
      .drop(opt(spaces))
      .bind({ op: alt(literal("+"), literal("-")) })
      .drop(opt(spaces))
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

export { calcProduct, calcSum, func, number, unit, word };
