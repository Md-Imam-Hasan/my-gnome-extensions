/**
 * Fast clipboard entry categorization (heuristics only).
 */

/** @typedef {'text'|'url'|'code'|'other'} EntryCategory */

const URL_RE = /^https?:\/\//i;

const CODE_HINTS = [
    /[{}]\s*[;{]/,
    /=>/,
    /\bfunction\s*\(/,
    /\bdef\s+\w+\s*\(/,
    /\bimport\s+.+from\b/,
    /\bimport\s+['"]/,
    /#include\s*[<"]/,
    /\bpublic\s+static\s+void\b/,
    /\bfn\s+\w+\s*\(/,
    /;\s*$/,
    /\)\s*=>\s*/,
];

/**
 * @param {string} text Normalized clipboard text
 * @returns {EntryCategory}
 */
export function classifyCategory(text) {
    const t = text.trim();
    if (t.length === 0)
        return 'text';

    if (URL_RE.test(t))
        return 'url';

    let codeScore = 0;
    for (const re of CODE_HINTS) {
        if (re.test(t))
            codeScore++;
    }
    if (codeScore >= 2 || (codeScore >= 1 && t.includes('\n')))
        return 'code';

    if (codeScore >= 1)
        return 'code';

    if (t.length > 200 && !/\s{3,}/.test(t))
        return 'other';

    return 'text';
}

/**
 * @param {string} cat
 * @returns {cat is EntryCategory}
 */
export function isValidCategory(cat) {
    return cat === 'text' || cat === 'url' || cat === 'code' || cat === 'other';
}
