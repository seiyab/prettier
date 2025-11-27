import { describe, it, expect } from "jest";
import { canOpenOrCloseStrongOrEmphasis } from "../../src/language-markdown/print-word.js";

describe("canOpenOrCloseStrongOrEmphasis", () => {
  it("should return true for left-flanking asterisks", () => {
    expect(canOpenOrCloseStrongOrEmphasis(" ", "**", "word")).toBe(true);
  });

  it("should return true for right-flanking asterisks", () => {
    expect(canOpenOrCloseStrongOrEmphasis("word", "**", " ")).toBe(true);
  });

  it("should return false for non-flanking asterisks", () => {
    expect(canOpenOrCloseStrongOrEmphasis("word", "**", "word")).toBe(false);
  });

  it("should return true for left-flanking underscores", () => {
    expect(canOpenOrCloseStrongOrEmphasis(" ", "__", "word")).toBe(true);
  });

  it("should return true for right-flanking underscores", () => {
    expect(canOpenOrCloseStrongOrEmphasis("word", "__", " ")).toBe(true);
  });

  it("should return false for non-flanking underscores", () => {
    expect(canOpenOrCloseStrongOrEmphasis("word", "__", "word")).toBe(false);
  });
}
