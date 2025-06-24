/**
 * @template T
 * @typedef {{ output: T, errors: Error[]}} Result
 *
 */

/**
 * @typedef {{ source: string, index: number }} SourcePosition
 * @typedef {{ type: "error", error: Error }} ErrorNode
 */

/**
 * @template N
 * @typedef {{ position: SourcePosition, node: N | null | ErrorNode, errors: ErrorNode[] }} NodeOutput<N>
 */
/**
 * @template N
 * @typedef {(p: SourcePosition) => NodeOutput<N>} Syntax
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
 * @returns {Syntax<never>}
 */
function literal(input) {
  /** @type {Syntax<never>} */
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

export { literal, source };
