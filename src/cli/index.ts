#!/usr/bin/env node
/**
 * unlocksaas-seo — CLI entry point.
 *
 * Subcommands:
 *   validate-claims <url|path>       Audit JSON-LD honesty and drift
 *   generate-llms-txt --config FILE  Write /llms.txt and /llms-feed.json
 *   init [out]                       Scaffold a starter site.config.json
 *   help                             Show this message
 */

import {
  color,
  EXIT_INVALID_ARGS,
  EXIT_OK,
  parseFlags,
  printErr,
  printOut,
} from "./shared.js";
import { validateClaims, printReport } from "./validate-claims.js";
import { generateLlmsTxt, initStarterConfig } from "./generate-llms-txt.js";

const HELP = `${color.bold("unlocksaas-seo")} — honesty-first SEO/GEO/AEO toolkit.

${color.bold("Subcommands:")}
  ${color.cyan("validate-claims")} <url|path>     Audit JSON-LD honesty and schema-vs-rendered drift
  ${color.cyan("generate-llms-txt")} --config F   Write /llms.txt and /llms-feed.json
  ${color.cyan("init")} [./site.config.json]     Scaffold a starter site descriptor
  ${color.cyan("help")}                           Show this message

${color.bold("Examples:")}
  unlocksaas-seo validate-claims https://yoursite.com/pricing
  unlocksaas-seo validate-claims ./out/index.html --strict
  unlocksaas-seo init ./site.config.json
  unlocksaas-seo generate-llms-txt --config ./site.config.json --out ./public

${color.bold("Flags (validate-claims):")}
  --json            Emit machine-readable JSON instead of a report
  --strict          Treat drift findings as errors (not just violations)
  --timeout=15000   Fetch timeout in milliseconds

${color.dim("https://unlocksaas.com — built for non-engineer founders who shipped with AI tools.")}
`;

async function main(): Promise<number> {
  const argv = process.argv.slice(2);
  if (argv.length === 0 || argv[0] === "help" || argv[0] === "-h" || argv[0] === "--help") {
    printOut(HELP);
    return EXIT_OK;
  }
  const sub = argv[0];
  const rest = argv.slice(1);
  const flags = parseFlags(rest);

  switch (sub) {
    case "validate-claims": {
      const target = flags._[0];
      if (!target) {
        printErr(color.red("validate-claims: missing target URL or file path."));
        printErr(HELP);
        return EXIT_INVALID_ARGS;
      }
      const opts: Parameters<typeof validateClaims>[0] = {
        target,
        json: flags["json"] === true,
        strict: flags["strict"] === true,
      };
      if (typeof flags["timeout"] === "string") {
        const parsed = Number(flags["timeout"]);
        if (Number.isFinite(parsed) && parsed > 0) {
          opts.timeoutMs = parsed;
        }
      }
      const report = await validateClaims(opts);
      printReport(report, opts.json === true);
      return report.exitCode;
    }
    case "generate-llms-txt": {
      const config = typeof flags["config"] === "string" ? flags["config"] : flags._[0];
      const out =
        typeof flags["out"] === "string" ? flags["out"] : (flags._[1] ?? "./public");
      if (!config) {
        printErr(color.red("generate-llms-txt: --config is required."));
        return EXIT_INVALID_ARGS;
      }
      return generateLlmsTxt({ config, out });
    }
    case "init": {
      const target = flags._[0] ?? "./site.config.json";
      return initStarterConfig(target);
    }
    default:
      printErr(color.red(`Unknown subcommand: ${sub}`));
      printErr(HELP);
      return EXIT_INVALID_ARGS;
  }
}

main().then(
  (code) => {
    process.exit(code);
  },
  (err: unknown) => {
    printErr(color.red(`Fatal: ${err instanceof Error ? err.message : String(err)}`));
    if (err instanceof Error && err.stack) {
      printErr(color.dim(err.stack));
    }
    process.exit(1);
  },
);
