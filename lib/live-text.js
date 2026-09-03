const htmlEntities = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: "\"",
  apos: "'",
  nbsp: " ",
  shy: "",
  ndash: "\u2013",
  mdash: "\u2014",
  hellip: "...",
  aring: "\u00e5",
  Aring: "\u00c5",
  auml: "\u00e4",
  Auml: "\u00c4",
  ouml: "\u00f6",
  Ouml: "\u00d6",
  eacute: "\u00e9",
  Eacute: "\u00c9",
};

function decodeHtmlEntities(value) {
  return String(value || "").replace(/&(#x[0-9a-f]+|#\d+|[a-z][a-z0-9]+);/gi, (match, entity) => {
    if (entity[0] === "#") {
      const codePoint = entity[1]?.toLowerCase() === "x"
        ? Number.parseInt(entity.slice(2), 16)
        : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return Object.prototype.hasOwnProperty.call(htmlEntities, entity) ? htmlEntities[entity] : match;
  });
}

export function cleanLiveText(value) {
  if (value == null) return "";
  const decoded = decodeHtmlEntities(decodeHtmlEntities(value));
  return decoded
    .replace(/<\s*(script|style)[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/[\u00a0\u202f]/g, " ")
    .replace(/[\u00ad\u200b-\u200d\ufeff]/g, "")
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
