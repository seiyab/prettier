/**
 * @typedef {import("../common/ast-path.js").default} AstPath
 * @typedef {import("../document/builders.js").Doc} Doc
 */

import { fill } from "../document/builders.js";
import { DOC_TYPE_STRING } from "../document/constants.js";
import { getDocType } from "../document/utils.js";

/**
 * @param {AstPath} path
 * @param {*} print
 * @returns {Doc}
 */
function printSentence(path, print) {
  /** @type {Doc[]} */
  const parts = [];
  /** @type {Doc[]} */
  let chunk = [];

  path.each(() => {
    const { node } = path;
    const doc = print();
    switch (node.type) {
      case "whitespace":
        if (getDocType(doc) !== DOC_TYPE_STRING) {
          parts.push(chunk);
          chunk = [];
          parts.push(print());
          break;
        }
      // fallthrough
      case "word":
        chunk.push(doc);
        break;
      default:
        throw new Error(`Unexpected node type: ${node.type}`);
    }
  }, "children");
  parts.push(chunk);

  return fill(parts);
}

export { printSentence };
