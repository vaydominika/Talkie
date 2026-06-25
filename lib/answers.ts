export function normalizeAnswer(value: string) { return value.normalize("NFKC").trim().replace(/\s+/g, " ").toLocaleLowerCase().replace(/[.,!?;:]/g, ""); }
export function matchesAnswer(input: string, answer: string, alternatives: string[] = []) { const normalized = normalizeAnswer(input); return [answer, ...alternatives].some(candidate => normalizeAnswer(candidate) === normalized); }
