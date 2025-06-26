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
        position,
        node: null,
        errors: [],
      };
    }
    return output;
  };
  return optionalSyntax;
}

/**
 * @template {Record<string | symbol, Syntax<unknown>>} [State={}]
 * @params {State[]}
 * @typedef {{
 *   bind: <Key extends string, Value>(x: Record<Key, Syntax<Value>>) => Compose<State & Record<Key, Syntax<Value>>>,
 *   drop: (x: Syntax<unknown>) => Compose<State>,
 *   end: <T>(f: (s: {[K in keyof State]: Exclude<ReturnType<State[K]>['node'], ErrorNode>}) => T) => Syntax<T>
 * }} Compose<State>
 * @returns {Compose}
 */
function compose(state = []) {
  const dropSymbol = Symbol.for("compose-drop");
  return {
    // @ts-expect-error
    bind,
    drop,
    end,
  };
  /**
   * @template {string} Key
   * @template Value
   * @param {Record<Key, Syntax<Value>>} x
   */
  function bind(x) {
    return compose([...state, x]);
  }

  /**
   * @param {Syntax<unknown>} syntax
   */
  function drop(syntax) {
    return compose([...state, { [dropSymbol]: syntax }]);
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
      /** @type {ErrorNode[]} */
      const errors = [];
      let position = argPosition;
      for (const entry of state) {
        for (const key of [...Object.keys(entry), dropSymbol]) {
          const syntax = entry[key];
          if (syntax === undefined) {
            continue;
          }
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
 * @template Open, Body, Close
 * @param {{
 *  open: Syntax<Open>,
 *  body: Syntax<Body>,
 *  close: Syntax<Close>,
 * }} params
 * @returns {Syntax<{open: Open, body: Body | ErrorNode, close: Close | null, skipped: string}>}
 */
function recoverable({ open, body, close }) {
  /** @type {Syntax<{open: Open, body: Body| ErrorNode, close: Close | null, skipped: string}>} */
  return (position) => {
    /** @type {ErrorNode[]} */
    const errors = [];
    const openOutput = open(position);
    errors.push(...openOutput.errors);
    if (isErrorNode(openOutput.node)) {
      return { ...openOutput, node: openOutput.node };
    }
    const bodyOutput = body(openOutput.position);
    errors.push(...bodyOutput.errors);
    if (isErrorNode(bodyOutput.node)) {
      const {
        close: closeNode,
        skipped,
        position: synchronizedPosition,
      } = synchronize(openOutput.position);
      return {
        node: {
          open: openOutput.node,
          body: bodyOutput.node,
          close: closeNode,
          skipped,
        },
        errors,
        position: synchronizedPosition,
      };
    }
    const closeOutput = close(bodyOutput.position);
    errors.push(...closeOutput.errors);
    if (isErrorNode(closeOutput.node)) {
      const {
        close: closeNode,
        skipped,
        position: synchronizedPosition,
      } = synchronize(bodyOutput.position);
      return {
        node: {
          open: openOutput.node,
          body: bodyOutput.node,
          close: closeNode,
          skipped,
        },
        errors,
        position: synchronizedPosition,
      };
    }

    return {
      position: closeOutput.position,
      node: {
        open: openOutput.node,
        body: bodyOutput.node,
        close: closeOutput.node,
        skipped: "",
      },
      errors,
    };
  };

  /**
   * @params {SourcePosition} pos
   * @returns {{
   *  close: Close | null,
   *  skipped: string,
   *  position: SourcePosition,
   * }}
   */
  function synchronize(pos) {
    for (let i = pos.index; i < pos.source.length; i++) {
      const tryPosition = { ...pos, index: i };
      const closeOutput = close(tryPosition);
      if (isErrorNode(closeOutput.node)) {
        continue;
      }
      return {
        close: closeOutput.node,
        skipped: pos.source.slice(pos.index, i),
        position: { source: pos.source, index: i },
      };
    }
    return {
      close: null,
      skipped: pos.source.slice(pos.index),
      position: { source: pos.source, index: pos.source.length },
    };
  }
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

export {
  alt,
  compose,
  isErrorNode,
  literal,
  map,
  opt,
  recoverable,
  repeated,
  source,
};
