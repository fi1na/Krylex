#!/usr/bin/env node
/**
 * CLI entry point for the mock trade data generator.
 *
 * Usage:
 *   node cli.js                         # 1000 trades/sec, continuous, JSON to stdout
 *   node cli.js --rate 5000             # 5000 trades/sec
 *   node cli.js --count 500            # Generate exactly 500 trades then exit
 *   node cli.js --symbols AAPL,TSLA    # Only these symbols
 *   node cli.js --pretty               # Pretty-print JSON
 *   node cli.js --stats                # Print throughput stats to stderr
 */

const StreamRunner = require("./src/StreamRunner");

// ── Arg Parsing (zero dependencies) ─────────────────────────────────

function parseArgs(argv) {
  const args = {
    rate: 1000,
    count: Infinity,
    symbols: null,
    pretty: false,
    stats: false,
    batch: 100,
  };

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    switch (arg) {
      case "--rate":
      case "-r":
        args.rate = parseInt(argv[++i], 10);
        break;
      case "--count":
      case "-c":
        args.count = parseInt(argv[++i], 10);
        break;
      case "--symbols":
      case "-s":
        args.symbols = argv[++i].split(",").map((s) => s.trim().toUpperCase());
        break;
      case "--pretty":
      case "-p":
        args.pretty = true;
        break;
      case "--stats":
        args.stats = true;
        break;
      case "--batch":
      case "-b":
        args.batch = parseInt(argv[++i], 10);
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        console.error(`Unknown argument: ${arg}`);
        printHelp();
        process.exit(1);
    }
  }
  return args;
}

function printHelp() {
  console.log(`
Mock Trade Data Generator
─────────────────────────
Generates high-frequency trade data as JSON to stdout.

Options:
  --rate,    -r <n>     Trades per second (default: 1000)
  --count,   -c <n>     Total trades to generate (default: infinite)
  --symbols, -s <list>  Comma-separated symbols (default: 15 stocks)
  --batch,   -b <n>     Batch size per tick (default: 100)
  --pretty,  -p         Pretty-print JSON output
  --stats               Print throughput stats to stderr every 2s
  --help,    -h         Show this help

Examples:
  node cli.js --rate 500 --stats
  node cli.js --count 100 --pretty
  node cli.js --symbols AAPL,TSLA,NVDA --rate 2000
  node cli.js > trades.jsonl            # Save to file (JSONL format)
  `);
}

// ── Main ────────────────────────────────────────────────────────────

const args = parseArgs(process.argv);

const runner = new StreamRunner({
  tradesPerSecond: args.rate,
  totalTrades: args.count,
  batchSize: args.batch,
  generatorConfig: args.symbols ? { symbols: args.symbols } : {},

  onTrade(trade) {
    const line = args.pretty
      ? JSON.stringify(trade, null, 2)
      : JSON.stringify(trade);
    process.stdout.write(line + "\n");
  },

  onStats: args.stats
    ? (stats) => {
        process.stderr.write(
          `\r⚡ ${stats.currentRate.toLocaleString()} trades/sec | ` +
            `Total: ${stats.totalEmitted.toLocaleString()} | ` +
            `Elapsed: ${stats.elapsed}s`,
        );
      }
    : null,
});

// Graceful shutdown
process.on("SIGINT", () => {
  runner.stop();
  if (args.stats) process.stderr.write("\n");
  process.stderr.write(
    `\nStopped. Total trades emitted: ${runner.totalEmitted.toLocaleString()}\n`,
  );
  process.exit(0);
});

process.on("SIGTERM", () => {
  runner.stop();
  process.exit(0);
});

// Handle broken pipe (e.g. piping to head)
process.stdout.on("error", (err) => {
  if (err.code === "EPIPE") {
    runner.stop();
    process.exit(0);
  }
  throw err;
});

runner.start().then(() => {
  if (args.stats) process.stderr.write("\n");
  process.stderr.write(
    `Done. Generated ${runner.totalEmitted.toLocaleString()} trades.\n`,
  );
  process.exit(0);
});
