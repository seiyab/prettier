import { markdownLineEnding } from "micromark-util-character";
import { codes, types } from "micromark-util-symbol";
// import { Code, Effects, State } from "micromark-util-types";

/**
 * @typedef {import('unified').Processor} Processor
 * @typedef {import('mdast-util-from-markdown').CompileContext} CompileContext
 * @typedef {import('mdast-util-from-markdown').Token} Token
 * @typedef {import('micromark-util-types').Previous} Previous
 * @typedef {import('micromark-util-types').Tokenizer} Tokenizer
 * @typedef {import('micromark-util-types').State} State
 * @typedef {import('micromark-util-types').Extension} MicromarkExtension
 */

/**
 * @this {Processor}
 */
function remarkMath() {
  /** @type {any} */
  const data = this.data();

  (data.micromarkExtensions ??= []).push(syntax());
  (data.fromMarkdownExtensions ??= []).push(fromMarkdown());
}

/** * @returns {MicromarkExtension} */
function syntax() {
  return {
    text: {
      [codes.dollarSign]: {
        name: "math-text",
        tokenize: mathTextTokenize,
        previous,
      },
    },
    flow: {
      [codes.dollarSign]: {
        name: "math-flow",
        tokenize: mathFlowTokenize,
        previous,
      },
    },
  };

  /** @type {Tokenizer} */
  function mathTextTokenize(effects, ok, nok) {
    let sizeOpen = 0;
    let sizeClose = 0;

    return start;

    /** @type {State} */
    function start(code) {
      effects.enter("inlineMath");
      effects.enter(types.data);
      return open(code);
    }

    /** @type {State} */
    function open(code) {
      if (sizeOpen >= 2) {
        return nok;
      }
      if (code === codes.dollarSign) {
        sizeOpen++;
        effects.consume(code);
        return open;
      }
      if (sizeOpen < 1) {
        return nok;
      }

      if (code === codes.eof || markdownLineEnding(code)) {
        return nok;
      }

      effects.consume(code);
      return inside;
    }

    /** @type {State} */
    function inside(code) {
      switch (code) {
        case codes.backslash:
          effects.consume(code);
          return escaped;
        case codes.dollarSign:
          effects.consume(code);
          return mayExit;
        case codes.eof:
          return nok;
        default:
          if (markdownLineEnding(code)) {
            effects.enter(types.lineEnding);
            effects.consume(code);
            effects.exit(types.lineEnding);
            return inside;
          }
          effects.consume(code);
          return inside;
      }
    }

    /** @type {State} */
    function escaped(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        return nok;
      }
      effects.consume(code);
      return inside;
    }

    /** @type {State} */
    function mayExit(code) {
      if (code === codes.eof || markdownLineEnding(code)) {
        return nok;
      }
      if (code !== codes.dollarSign) {
        sizeClose = 0;
        effects.consume(code);
        return inside;
      }
      sizeClose++;
      if (sizeClose === sizeOpen && sizeClose === 2) {
        effects.consume(code);
        effects.exit(types.data);
        effects.exit("inlineMath");
        throw new Error("TODO: implement ok");
        return ok;
      }

      effects.consume(code);
      return mayExit;
    }
  }

  /** @type {Tokenizer} */
  function mathFlowTokenize(effects, ok, nok) {
    let sizeOpen = 0;
    let sizeClose = 0;

    return start;

    /** @type {State} */
    function start(code) {
      effects.enter("math");
      effects.enter(types.data);
      return open(code);
    }

    /** @type {State} */
    function open(code) {
      if (sizeOpen >= 2) {
        return nok;
      }
      if (code === codes.dollarSign) {
        sizeOpen++;
        effects.consume(code);
        return open;
      }
      if (sizeOpen !== 2) {
        return nok;
      }
      effects.consume(code);

      return inside;
    }

    /** @type {State} */
    function inside(code) {
      switch (code) {
        case codes.backslash:
          effects.consume(code);
          return escaped;
        case codes.dollarSign:
          return mayExit(code);
        case codes.eof:
          return nok;
        default:
          if (markdownLineEnding(code)) {
            effects.enter(types.lineEnding);
            effects.consume(code);
            effects.exit(types.lineEnding);
            return inside;
          }
          effects.consume(code);
          return inside;
      }
    }

    /** @type {State} */
    function escaped(code) {
      effects.consume(code);
      return inside;
    }

    /** @type {State} */
    function mayExit(code) {
      if (code !== codes.dollarSign) {
        effects.consume(code);
        sizeClose = 0;
        return inside;
      }
      sizeClose++;
      if (sizeClose === 2) {
        effects.consume(code);
        effects.exit(types.data);
        effects.exit("math");
        return ok;
      }

      effects.consume(code);
      return mayExit;
    }
  }
}

function fromMarkdown() {
  return {
    canContainEols: ["inlineMath", "math"],
    enter: { inlineMath: enterInlineMath, math: enterMath },
    exit: { inlineMath: exitInlineMath, math: exitMath },
  };

  /**
   * @this {CompileContext}
   * @param {Token} token
   */
  function enterInlineMath(token) {
    this.enter({ type: "inlineMath" }, token);
    this.buffer();
  }

  /**
   * @this {CompileContext}
   * @param {Token} token
   */
  function exitInlineMath(token) {
    const d = this.resume();
    const node = this.stack.at(-1);
    node.value = d;
    this.exit(token);
  }

  /**
   * @this {CompileContext}
   * @param {Token} token
   */
  function enterMath(token) {
    this.enter({ type: "math" }, token);
    this.buffer();
  }

  /**
   * @this {CompileContext}
   * @param {Token} token
   */
  function exitMath(token) {
    const d = this.resume();
    const node = this.stack.at(-1);
    node.value = d;
    this.exit(token);
  }
}

/**
 * @type {Previous}
 */
function previous(code) {
  return (
    code !== codes.dollarSign ||
    this.events.at(-1)?.[1].type === types.characterEscape
  );
}

export { remarkMath };
