/**
 * @typedef {import("../builders.js").Doc} Doc
 */

import { DOC_TYPE_ARRAY, DOC_TYPE_FILL } from "../constants.js";
import { cleanDoc, getDocParts } from "../utils.js";
import { fillBuilder } from "./fill-builder.js";
import getDocType from "./get-doc-type.js";

/**
 * @param {Doc} doc
 * @returns {Doc}
 */
function flattenFill(doc) {
  const cleaned = cleanDoc(doc);
  if (getDocType(cleaned) !== DOC_TYPE_FILL) {
    throw new Error("Expected doc to be fill()");
  }
  const builder = fillBuilder();

  function drain(doc) {
    switch (getDocType(doc)) {
      case DOC_TYPE_FILL: {
        const childParts = getDocParts(doc);
        for (const [j, childPart] of childParts.entries()) {
          if (j % 2 === 1) {
            builder.appendLine(childPart);
            continue;
          }
          drain(childPart);
        }
        break;
      }
      case DOC_TYPE_ARRAY:
        for (const part of getDocParts(doc)) {
          drain(part);
        }
        break;
      default:
        builder.append(doc);
        break;
    }
  }

  drain(cleaned);

  return builder.build();
}

export { flattenFill };
