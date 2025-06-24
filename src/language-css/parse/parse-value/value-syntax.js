/**
 * @import { ErrorNode, Syntax } from './karasu.js'
 */

/**
 * @typedef {IdentNode | ErrorNode} Node
 *
 * @typedef {{ type: "error", error: Error }} ErrorNode
 * @typedef {{ type: "ident", value: string }} IdentNode
 *
 */

/** @type {Syntax<IdentNode>} */
const ident = (position) => {
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
};
export { ident };
