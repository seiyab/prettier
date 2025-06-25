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

/**
 * @template N
 * @param {Syntax<N>} syntax
 * @returns {Syntax<N | null>}
 */
function opt(syntax) {
  /** @type {Syntax<N | null>} */
  const optionalSyntax = (position) => {
    const output = syntax(position);
    if (
      typeof output.node === "object" &&
      "type" in output.node &&
      output.node.type === "error"
    ) {
      return {
        position: output.position,
        node: null,
        errors: [],
      };
    }
    return output;
  };
  return optionalSyntax;
}

/**
 * @template {Record<string, Syntax<unknown>>} [State={}]
 * @params {State}
 * @typedef {{
 *   bind: <Key extends string, Value>(x: Record<Key, Syntax<Value>>) => Compose<State & Record<Key, Syntax<Value>>>,
 *   end: <T>(f: (s: {[K in keyof State]: Exclude<ReturnType<State[K]>['node'], ErrorNode>}) => T) => Syntax<T>
 * }} Compose<State>
 * @returns {Compose}
 */
function compose(state = {}) {
  return {
    // @ts-expect-error
    bind,
    end,
  };
  /**
   * @template {string} Key
   * @template Value
   * @param {Record<Key, Syntax<Value>>} x
   */
  function bind(x) {
    return compose({ ...state, ...x });
  }

  /**
   * @template T
   * @param {(s: Record<string, any>) => T} f
   * @returns {Syntax<T>}
   */
  function end(f) {
    return composedSyntax;
    /** @type {Syntax<T>} */
    function composedSyntax(argPosition) {
      /** @type any */
      const resolved = {};
      const errors = [];
      let position = argPosition;
      for (const key in state) {
        const syntax = state[key];
        const output = syntax(position);
        if (output.type === "error") {
          return {
            position: argPosition,
            node: output.node,
            errors: output.errors,
          };
        }
        position = output.position;
        errors.push(...output.errors);
        resolved[key] = output.node;
      }
      return {
        position,
        node: f(resolved),
        errors,
      };
    }
  }
}

export { compose, literal, opt, source };
