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
 * @typedef {{ position: SourcePosition, node: N |  ErrorNode, errors: ErrorNode[] }} NodeOutput<N>
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
 * @template {string} T
 * @param {T} input
 * @returns {Syntax<T>}
 */
function literal(input) {
  /** @type {Syntax<T>} */
  const syntax = (position) => {
    if (position.source.startsWith(input, position.index)) {
      return {
        position: {
          source: position.source,
          index: position.index + input.length,
        },
        node: input,
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
    if (isErrorNode(output.node)) {
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
        if (isErrorNode(output.node)) {
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

/**
 * @template Item
 * @param  {Syntax<Item>[]} itemSyntax
 * @returns {Syntax<Item>}
 */
function alt(...itemSyntax) {
  /** @type {Syntax<Item>} */
  return (position) => {
    /** @type {ErrorNode} */
    let error = {
      type: "error",
      error: new Error(
        `Expected one of the alternatives at index ${position.index}`,
      ),
    };
    for (const syntax of itemSyntax) {
      const output = syntax(position);
      if (isErrorNode(output.node)) {
        error = output.node;
        continue;
      } else {
        return output;
      }
    }
    return {
      position,
      node: error,
      errors: [error],
    };
  };
}

/**
 * @template Item
 * @template Separator
 * @param {Syntax<Item>} itemSyntax
 * @param {Syntax<Separator>} separatorSyntax
 * @returns {Syntax<{
 *   first: Item,
 *   rest: {separator: Separator, item: Item}[]
 * }>}
 */
function repeated(itemSyntax, separatorSyntax) {
  /**
   * @type {Syntax<{
   *   first: Item,
   *   rest: {separator: Separator, item: Item}[]
   * }>}
   */
  return (position) => {
    const firstOutput = itemSyntax(position);
    if (isErrorNode(firstOutput.node)) {
      return { ...firstOutput, node: firstOutput.node };
    }
    const firstItem = firstOutput.node;
    let currentPosition = firstOutput.position;
    /** @type {{separator: Separator, item: Item}[]} */
    const rest = [];

    while (true) {
      const separatorOutput = separatorSyntax(currentPosition);
      if (isErrorNode(separatorOutput.node)) {
        break;
      }
      const itemOutput = itemSyntax(separatorOutput.position);
      if (isErrorNode(itemOutput.node)) {
        break;
      }
      rest.push({ separator: separatorOutput.node, item: itemOutput.node });
      currentPosition = itemOutput.position;
    }

    return {
      position: currentPosition,
      node: { first: firstItem, rest },
      errors: [],
    };
  };
}

/**
 * @param {unknown} node
 * @returns {node is ErrorNode}
 */
function isErrorNode(node) {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    node.type === "error"
  );
}

/**
 * @template T
 * @template U
 * @param {Syntax<T>} syntax
 * @param {(T) => U} f
 * @returns {Syntax<U>}
 */
function map(syntax, f) {
  /** @type {Syntax<U>} */
  return (position) => {
    const output = syntax(position);
    const { node } = output;
    if (isErrorNode(node)) {
      return { ...output, node };
    }
    return {
      position: output.position,
      node: f(output.node),
      errors: output.errors,
    };
  };
}

export { alt, compose, literal, map, opt, repeated, source };
