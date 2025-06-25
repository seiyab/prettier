import { compose, opt } from "./karasu.js";

/**
 * @import { ErrorNode, Syntax } from './karasu.js'
 */

/**
 * @typedef {IdentNode | UnitNode | NumberNode | ErrorNode} Node
 *
 * @typedef {{ type: "error", error: Error }} ErrorNode
 * @typedef {{ type: "ident", value: string }} IdentNode
 * @typedef {{ type: "unit", value: string }} UnitNode
 * @typedef {{ type: "number", value: string, unit: string }} NumberNode
 * @typedef {{ type: "digits", value: string }} Digits
 */

/** @type {Syntax<IdentNode>} */
function ident(position) {
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
      char === "-"
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
      error: new Error(`Expected identifier at index ${position.index}`),
    };
    return { node: error, position, errors: [error] };
  }
  return {
    node: { type: "ident", value: chars.join("") },
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

export { ident, number, unit };
