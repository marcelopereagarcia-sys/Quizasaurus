import { Pack } from "./schema.js";

export interface PackIssue {
  /** Where the problem is, e.g. `games[2].questions[0].answer`. */
  path: string;
  message: string;
}

export type ValidationResult = { ok: true; pack: Pack } | { ok: false; issues: PackIssue[] };

/** Checks any value against the pack format and says which field is wrong. */
export function validatePack(input: unknown): ValidationResult {
  const result = Pack.safeParse(input);
  if (result.success) return { ok: true, pack: result.data };
  return {
    ok: false,
    issues: result.error.issues.map((issue) => ({ path: formatPath(issue.path), message: issue.message })),
  };
}

/** Same as `validatePack`, starting from JSON text (a file or an AI response). */
export function validatePackJson(json: string): ValidationResult {
  let data: unknown;
  try {
    data = JSON.parse(json);
  } catch (error) {
    return { ok: false, issues: [{ path: "(root)", message: `Not valid JSON: ${(error as Error).message}` }] };
  }
  return validatePack(data);
}

export function formatPath(path: readonly PropertyKey[]): string {
  if (path.length === 0) return "(root)";
  return path
    .map((key, i) => (typeof key === "number" ? `[${key}]` : `${i === 0 ? "" : "."}${String(key)}`))
    .join("");
}
