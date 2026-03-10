/**
 * Character mapping for languages with special characters.
 * Maps diacritical / non-ASCII characters to their ASCII equivalents
 * so users with English keyboards can still type correct answers.
 */
const CHAR_MAP: Record<string, string> = {
  // German
  ß: "ss",
  ä: "ae",
  ö: "oe",
  ü: "ue",
  Ä: "Ae",
  Ö: "Oe",
  Ü: "Ue",
  // French
  é: "e",
  è: "e",
  ê: "e",
  ë: "e",
  à: "a",
  â: "a",
  ù: "u",
  û: "u",
  ô: "o",
  î: "i",
  ï: "i",
  ç: "c",
  É: "E",
  È: "E",
  Ê: "E",
  Ë: "E",
  À: "A",
  Â: "A",
  Ù: "U",
  Û: "U",
  Ô: "O",
  Î: "I",
  Ï: "I",
  Ç: "C",
  // Spanish
  ñ: "n",
  Ñ: "N",
  // Nordic / Turkish / others
  å: "a",
  Å: "A",
  ø: "o",
  Ø: "O",
  ş: "s",
  Ş: "S",
  ğ: "g",
  Ğ: "G",
  ı: "i",
  İ: "I",
};

/**
 * Replaces all special / diacritical characters with ASCII equivalents.
 * "heiße" → "heisse", "über" → "ueber", "café" → "cafe"
 */
export function toAscii(text: string): string {
  let result = "";
  for (const ch of text) {
    result += CHAR_MAP[ch] ?? ch;
  }
  return result;
}

/**
 * Compares two strings in a forgiving way:
 * - Case-insensitive (unless caseSensitive=true)
 * - Treats special characters as interchangeable with their ASCII forms
 *   so "heiße" matches "heisse" and vice-versa
 */
export function fuzzyMatch(
  input: string,
  expected: string,
  caseSensitive = false
): boolean {
  const a = caseSensitive ? toAscii(input.trim()) : toAscii(input.trim()).toLowerCase();
  const b = caseSensitive ? toAscii(expected.trim()) : toAscii(expected.trim()).toLowerCase();
  return a === b;
}

/**
 * Checks if `input` contains `keyword` after normalizing both.
 */
export function fuzzyIncludes(input: string, keyword: string): boolean {
  return toAscii(input).toLowerCase().includes(toAscii(keyword).toLowerCase());
}

/**
 * Special characters per language that are hard to type on an English keyboard.
 */
export const SPECIAL_CHARS: Record<string, string[]> = {
  de: ["ä", "ö", "ü", "ß", "Ä", "Ö", "Ü"],
  fr: ["é", "è", "ê", "ë", "à", "â", "ù", "û", "ô", "î", "ï", "ç"],
  es: ["ñ", "¿", "¡", "á", "é", "í", "ó", "ú"],
  tr: ["ş", "ğ", "ı", "ç", "ö", "ü"],
  pt: ["ã", "õ", "ç", "á", "é", "í", "ó", "ú", "â", "ê", "ô"],
};
