import getStringWidth from "../utils/get-string-width.js";
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
import { getDocParts, getDocType } from "./utils.js";

/** @typedef {typeof MODE_BREAK | typeof MODE_FLAT} Mode */
/** @typedef {{ ind: any, doc: any, mode: Mode }} Command */
/** @typedef {Record<symbol, Mode>} GroupModeMap */
/** @typedef {import("./builders.js").Doc} Doc */

/**
 * @typedef {{
 *  leadingWidth: number;
 *  inlineWidth: number;
 *  hasSuffix: boolean;
 * }} Measurement
 */

function createFits() {
  /** @type {WeakMap<Exclude<Doc, string>, Measurement>} */
  const cache = new WeakMap();

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
    if (width === Number.POSITIVE_INFINITY) {
      return true;
    }
    const { doc } = next;
    const w = inlineWidth(doc, hasLineSuffix, groupModeMap) <= width;
    const t = getDocType(doc);
    if (t !== DOC_TYPE_ARRAY) {
      console.error(getDocType(doc), w);
    }
    return (
      inlineWidth(doc, hasLineSuffix, groupModeMap) +
        restCommands.reduce(
          (acc, { doc }) => acc + inlineWidth(doc, hasLineSuffix, groupModeMap),
          0,
        ) <=
      width
    );
  }

  /**
   * @param {*} doc
   * @param {boolean} hasLineSuffix
   * @param {*} groupModeMap
   * @returns {Measurement}
   */
  function measure(doc, hasLineSuffix, groupModeMap) {
    const docType = getDocType(doc);
    if (docType === DOC_TYPE_STRING) {
      const width = getStringWidth(doc);
      return {
        inlineWidth: width,
        leadingWidth: width,
        hasSuffix: false,
      };
    }
    if (cache.has(doc)) {
      return cache.get(doc);
    }
    /** @type {Measurement} */
    const result = function iife() {
      switch (docType) {
        case DOC_TYPE_ARRAY:
        case DOC_TYPE_FILL: {
          const parts = getDocParts(doc);
          return parts.reduce(
            (acc, p) => acc + inlineWidth(p, hasLineSuffix, groupModeMap),
            0,
          );
        }
        case DOC_TYPE_INDENT:
        case DOC_TYPE_ALIGN:
        case DOC_TYPE_INDENT_IF_BREAK:
        case DOC_TYPE_LABEL:
          return inlineWidth(doc.contents, hasLineSuffix, groupModeMap);

        case DOC_TYPE_TRIM:
          // FIXME
          return 0;

        case DOC_TYPE_GROUP:
          return inlineWidth(doc.contents, hasLineSuffix, groupModeMap);

        case DOC_TYPE_IF_BREAK: {
          const groupMode = doc.groupId
            ? groupModeMap[doc.groupId] || MODE_FLAT
            : MODE_FLAT;
          const contents =
            groupMode === MODE_BREAK ? doc.breakContents : doc.flatContents;
          if (!contents) {
            return 0;
          }
          return inlineWidth(contents, hasLineSuffix, groupModeMap);
        }

        case DOC_TYPE_LINE:
          if (doc.hard) {
            return Number.POSITIVE_INFINITY; // Suspicious
          }
          return doc.soft ? 0 : 1;
        case DOC_TYPE_LINE_SUFFIX:
          // FIXME
          // hasLineSuffix = true;
          return 0;
        case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
          if (hasLineSuffix) {
            return Number.POSITIVE_INFINITY;
          }
          break;
        case DOC_TYPE_BREAK_PARENT:
          return Number.POSITIVE_INFINITY;
        default:
          console.error("unhandled type", docType);
      }
    };
    cache.set(doc, result);
    return result;
  }

  return fits;
}

/**
 * @param {Measurement[]} measurements
 * @returns {Measurement}
 */
function mergeMeasurement(measurements) {
  const result = zero();
  let breaking = false;
  for (const m of measurements) {
    result.inlineWidth += m.inlineWidth;
    result.leadingWidth += breaking ? 0 : m.leadingWidth;
    result.hasSuffix ||= breaking ? false : m.hasSuffix;
    if (m.inlineWidth !== m.leadingWidth) {
      breaking = true;
    }
  }
  return result;
}

/**
 * @returns {Measurement}
 */
function zero() {
  return {
    inlineWidth: 0,
    leadingWidth: 0,
    hasSuffix: false,
  };
}

export { createFits };
