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
 * @param {*} options
 * @return {Doc}
 */
function printHtml(path, options) {
  const value = htmlValue(path, options);
  const isHtmlComment = /^<!--.*-->$/su.test(value);

  return replaceEndOfLine(
    value,
    isHtmlComment ? hardline : markAsRoot(literalline),
  );
}

/**
 * @param {AstPath} path
 * @param {*} options
 * @return {string}
 */
function htmlValue(path, options) {
  const { node, parent, isLast } = path;
  if (options.parser === "mdx") {
    return parent.type === "root" && isLast ? node.value.trimEnd() : node.value;
  }
}

export { printHtml };
