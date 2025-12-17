import {
  hardline,
  literalline,
  markAsRoot,
  replaceEndOfLine,
} from "../../document/index.js";

/**
 * @import AstPath from "../../common/ast-path.js"
 * @import {Doc} from "../../document/index.js"
 */

/**
 * @param {AstPath} path
 * @return {Doc}
 */
function printHtml(path) {
  const { node, parent, isLast } = path;
  const value =
    parent.type === "root" && isLast ? node.value.trimEnd() : node.value;
  const isHtmlComment = /^<!--.*-->$/su.test(value);

  return replaceEndOfLine(
    value,
    isHtmlComment ? hardline : markAsRoot(literalline),
  );
}

export { printHtml };
