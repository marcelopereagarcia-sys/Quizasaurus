/**
 * Cleans text extracted from a page before it reaches the generator.
 *
 * Its main job is privacy (ADR-0002): worksheets have "Nom: … Data: …" fields
 * where the child writes their full name, and a vision model may copy them.
 * Those lines are removed. First names inside the content are left alone:
 * they are generic and identify nobody.
 */

/** Labels of identification fields on school worksheets (ca, es, en). */
const ID_LABEL =
  "(?:nom i cognoms|nom|cognoms?|nombre y apellidos|nombre|apellidos?|data|fecha|curs|curso|classe|clase|grup|grupo|name|date|class)";

/** "Nom: Joan …", "Data: 30/9/2026" — a label followed by a colon carries personal data. */
const LABELLED_FIELD = new RegExp(`^\\s*${ID_LABEL}\\s*:`, "iu");

/** "Nom ______ Data ______" or "Nom Data" — a line made only of field labels and blanks. */
const BLANK_FIELDS = new RegExp(`^\\s*(?:${ID_LABEL}[\\s_.:\\-–—]*)+$`, "iu");

/**
 * "Nom JOAN GARCIA Data 29/09/2026" — a name label, a value, then a date or class label,
 * as vision models write filled-in fields without the colon. A table header such as
 * "Nom | Nombre de síl·labes" is content and does not match.
 */
const FILLED_FIELDS = /^\s*(?:nom i cognoms|nom|cognoms|nombre y apellidos|apellidos|name)\s.*\b(?:data|fecha|curs|curso|date)\b/iu;

/** Vision models sometimes loop on a repeated line (e.g. empty "→" answer lines). */
const MAX_REPEATED_LINES = 2;

/** Cyrillic letters that vision models sometimes emit instead of Latin look-alikes. */
const HOMOGLYPHS: Record<string, string> = {
  а: "a", б: "b", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j",
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X",
};

/** Bullets drawn with symbol fonts arrive as private-use code points (e.g. U+F0B7). */
const PRIVATE_USE_BULLET = /[-]/gu;

export function cleanPageText(text: string): string {
  const lines = text
    .normalize("NFC")
    .replace(/[А-Яа-яЁёІіЈј]/gu, (ch) => HOMOGLYPHS[ch] ?? ch)
    .replace(PRIVATE_USE_BULLET, "•")
    .split(/\r?\n/)
    .map((line) => line.replace(/[ \t]+$/u, ""))
    .filter((line) => !LABELLED_FIELD.test(line) && !BLANK_FIELDS.test(line) && !FILLED_FIELDS.test(line));

  return collapseRepeats(lines)
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Keeps at most MAX_REPEATED_LINES copies of a line in a row. */
function collapseRepeats(lines: string[]): string[] {
  const kept: string[] = [];
  let run = 0;
  for (const [i, line] of lines.entries()) {
    run = i > 0 && line === lines[i - 1] ? run + 1 : 1;
    if (run <= MAX_REPEATED_LINES) kept.push(line);
  }
  return kept;
}
