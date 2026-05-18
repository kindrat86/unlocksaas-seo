/**
 * Shared CLI utilities — color codes, exit codes, output helpers.
 */

const isTty = typeof process !== "undefined" && process.stdout && process.stdout.isTTY;
const useColor = isTty && !process.env["NO_COLOR"];

const wrap = (open: string, close: string) => (s: string) =>
  useColor ? `\x1b[${open}m${s}\x1b[${close}m` : s;

export const color = {
  bold: wrap("1", "22"),
  dim: wrap("2", "22"),
  red: wrap("31", "39"),
  green: wrap("32", "39"),
  yellow: wrap("33", "39"),
  blue: wrap("34", "39"),
  cyan: wrap("36", "39"),
  gray: wrap("90", "39"),
};

export const EXIT_OK = 0;
export const EXIT_VIOLATIONS = 1;
export const EXIT_INVALID_ARGS = 2;
export const EXIT_FETCH_FAILED = 3;

export function printErr(msg: string): void {
  process.stderr.write(`${msg}\n`);
}

export function printOut(msg: string): void {
  process.stdout.write(`${msg}\n`);
}

export interface FlagMap {
  _: string[];
  [key: string]: string | boolean | undefined | string[];
}

/**
 * Tiny flag parser. No deps. Supports --flag, --flag=value, --flag value,
 * -f, and positional args. No clever array-flag handling — keep it boring.
 */
export function parseFlags(argv: ReadonlyArray<string>): FlagMap {
  const out: FlagMap = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const token = argv[i] ?? "";
    if (token.startsWith("--")) {
      const eq = token.indexOf("=");
      if (eq >= 0) {
        const key = token.slice(2, eq);
        out[key] = token.slice(eq + 1);
      } else {
        const key = token.slice(2);
        const next = argv[i + 1];
        if (next !== undefined && !next.startsWith("-")) {
          out[key] = next;
          i++;
        } else {
          out[key] = true;
        }
      }
    } else if (token.startsWith("-") && token.length > 1) {
      const key = token.slice(1);
      const next = argv[i + 1];
      if (next !== undefined && !next.startsWith("-")) {
        out[key] = next;
        i++;
      } else {
        out[key] = true;
      }
    } else {
      out._.push(token);
    }
  }
  return out;
}
