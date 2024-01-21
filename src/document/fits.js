import {
  DOC_TYPE_ALIGN,
  DOC_TYPE_ARRAY,
  DOC_TYPE_BREAK_PARENT,
  DOC_TYPE_CURSOR,
  DOC_TYPE_FILL,
  DOC_TYPE_GROUP,
  DOC_TYPE_IF_BREAK,
  DOC_TYPE_INDENT,
  DOC_TYPE_INDENT_IF_BREAK,
  DOC_TYPE_LABEL,
  DOC_TYPE_LINE,
  DOC_TYPE_LINE_SUFFIX,
  DOC_TYPE_LINE_SUFFIX_BOUNDARY,
  DOC_TYPE_STRING,
  DOC_TYPE_TRIM,
} from "./constants.js";
import { MODE_BREAK, MODE_FLAT } from "./modes.js";

/** @typedef {typeof MODE_BREAK | typeof MODE_FLAT} Mode */
/** @typedef {{ ind: any, doc: any, mode: Mode }} Command */
/** @typedef {Record<symbol, Mode>} GroupModeMap */

function createFits() {
  /**
   * @param {Command} next
   * @param {Command[]} restCommands
   * @param {number} width
   * @param {boolean} hasLineSuffix
   * @param {GroupModeMap} groupModeMap
   * @param {boolean} [mustBeFlat]
   * @returns {boolean}
   */
  function fits(
    next,
    restCommands,
    width,
    hasLineSuffix,
    groupModeMap,
    mustBeFlat,
  ) {
    return true;
  }

  return fits;
}

export { createFits };
