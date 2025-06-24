/**
 * @template T
 * @typedef {{ output: T, errors: Error[]}} Result
 *
 */

/** @typedef {{ source: string, index: number }} SourcePosition */

/**
 * @typedef {IdentNode | ErrorNode} Node
 * @typedef {{ position: SourcePosition, node: Node | null, errors: ErrorNode[] }} NodeOutput
 *
 * @typedef {{ type: "error", error: Error }} ErrorNode
 * @typedef {{ type: "ident", value: string }} IdentNode
 *
 * @typedef {(p: SourcePosition) => NodeOutput} Syntax
 */

/**
 *
 * @param {string} str
 * @returns {SourcePosition}
 */
function source(str) {
  return {
    source: str,
    index: 0,
  };
}

/**
 * @param {string} input
 * @returns {Syntax}
 */
function literal(input) {
  /** @type {Syntax} */
  const syntax = (position) => {
    if (input.startsWith(position.source, position.index)) {
      return {
        position: {
          source: position.source,
          index: position.index + input.length,
        },
        node: null,
        errors: [],
      };
    }
    /** @type {ErrorNode} */
    const error = {
      type: "error",
      error: new Error(
        `Expected literal "${input}" at index ${position.index}`,
      ),
    };
    return {
      position,
      node: error,
      errors: [error],
    };
  };
  return syntax;
}

/** @type {Syntax} */
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

export { ident, literal, source };
