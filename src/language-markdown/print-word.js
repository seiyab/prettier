import { PUNCTUATION_REGEXP } from "./constants.evaluate.js";
import { isAutolink } from "./utils.js";

/**
 * @import AstPath from "../common/ast-path.js"
 * @import {Doc} from "../document/index.js"
 */

/**
 * @params {AstPath} path
 * @returns {Doc}
 */
function printWord(path) {
  const { node } = path;
  const emphasisOrStrong = path.findAncestor(
    (p) => p.type === "emphasis" || p.type === "strong",
  );
  if (!emphasisOrStrong) {
    return node.value;
  }
  return node.value.replaceAll(
    /([^\\]?)(\\*)(\*+|_+)(.|$)/gu,
    (match, preceding, backslashes, delimiterRun, following) => {
      if (backslashes.length % 2 === 1) {
        return match; // already escaped
      }
      if (
        canOpenOrCloseStrongOrEmphasis(
          backslashes.at(-1) ?? preceding,
          delimiterRun,
          following,
          path,
        )
      ) {
        return `${preceding}${backslashes}\\${delimiterRun}${following}`;
      }
      return match;
    },
  );
}

/**
 * @param {AstPath} path
 * @param {string} preceding
 * @param {string} delimiterRun
 * @param {string} following
 * @returns {boolean}
 */
function canOpenOrCloseStrongOrEmphasis(
  path,
  preceding,
  delimiterRun,
  following,
) {
  const { previous, next } = path;

  // https://spec.commonmark.org/0.31.2/#emphasis-and-strong-emphasis
  const indicator = delimiterRun[0];
  const followedByWhitespace = following
    ? /\s/u.test(following)
    : next === null || next.type === "whitespace";
  const precededByWhitespace = preceding
    ? /\s/u.test(preceding)
    : previous === null || previous.type === "whitespace";
  const followedByPunctuation = PUNCTUATION_REGEXP.test(following);
  const precededByPunctuation = PUNCTUATION_REGEXP.test(preceding);

  const isLeftFlanking =
    !followedByWhitespace &&
    (!followedByPunctuation ||
      (followedByPunctuation &&
        (precededByWhitespace || precededByPunctuation)));
  const isRightFlanking =
    !precededByWhitespace &&
    (!precededByPunctuation ||
      (precededByPunctuation &&
        (followedByWhitespace || followedByPunctuation)));

  if (indicator === "*") {
    return isLeftFlanking || isRightFlanking;
  }

  if (isLeftFlanking) {
    return !isRightFlanking || precededByPunctuation;
  }

  if (isRightFlanking) {
    return !isLeftFlanking || followedByPunctuation;
  }

  return false;
}

/**
 * @params {AstPath} path
 * @returns {Doc}
 */
function printWordLegacy(path) {
  const { node } = path;
  let escapedValue = node.value
    .replaceAll("*", String.raw`\*`) // escape all `*`
    .replaceAll(
      new RegExp(
        [
          `(^|${PUNCTUATION_REGEXP.source})(_+)`,
          `(_+)(${PUNCTUATION_REGEXP.source}|$)`,
        ].join("|"),
        "gu",
      ),
      (_, text1, underscore1, underscore2, text2) =>
        (underscore1
          ? `${text1}${underscore1}`
          : `${underscore2}${text2}`
        ).replaceAll("_", String.raw`\_`),
    ); // escape all `_` except concating with non-punctuation, e.g. `1_2_3` is not considered emphasis

  const isFirstSentence = (node, name, index) =>
    node.type === "sentence" && index === 0;
  const isLastChildAutolink = (node, name, index) =>
    isAutolink(node.children[index - 1]);

  if (
    escapedValue !== node.value &&
    (path.match(undefined, isFirstSentence, isLastChildAutolink) ||
      path.match(
        undefined,
        isFirstSentence,
        (node, name, index) => node.type === "emphasis" && index === 0,
        isLastChildAutolink,
      ))
  ) {
    // backslash is parsed as part of autolinks, so we need to remove it
    escapedValue = escapedValue.replace(/^(\\?[*_])+/u, (prefix) =>
      prefix.replaceAll("\\", ""),
    );
  }

  return escapedValue;
}

export { printWord, printWordLegacy, canOpenOrCloseStrongOrEmphasis };
