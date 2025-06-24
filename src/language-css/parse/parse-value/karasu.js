/**
 * @template T
 * @typedef {{ output: T, errors: Error[]}} Result
 *
 */

/** @typedef {{ source: string, index: number }} SourcePosition */

/**
 * @typedef {LiteralNode | ErrorNode} Node
 * @typedef {{ position: SourcePosition, node: Node, errors: ErrorNode[] }} NodeOutput
 *
 * @typedef {{ type: "error", error: Error }} ErrorNode
 * @typedef {{ type: "literal", value: string }} LiteralNode
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
        node: { type: "literal", value: input },
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

export { literal, source };
