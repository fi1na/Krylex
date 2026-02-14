/**
 * StreamRunner - Orchestrates continuous or fixed-count trade generation.
 *
 * Emits trades via a callback at a configurable rate (trades/sec).
 * Designed so a Kafka producer or WebSocket server can simply plug into
 * the onTrade callback.
 */

const TradeGenerator = require("./TradeGenerator");

class StreamRunner {
  /**
   * @param {Object} [options]
   * @param {number}   [options.tradesPerSecond=1000] - Target throughput.
   * @param {number}   [options.totalTrades=Infinity] - Stop after N trades (Infinity = continuous).
   * @param {number}   [options.batchSize=100] - Trades generated per tick.
   * @param {Function} [options.onTrade] - Called with each trade object.
   * @param {Function} [options.onBatch] - Called with an array of trades (alternative to onTrade).
   * @param {Function} [options.onStats] - Called every statsInterval ms with throughput stats.
   * @param {number}   [options.statsInterval=2000] - How often to report stats (ms).
   * @param {Object}   [options.generatorConfig] - Passed through to TradeGenerator.
   */
  constructor(options = {}) {
    this.tradesPerSecond = options.tradesPerSecond ?? 1000;
    this.totalTrades = options.totalTrades ?? Infinity;
    this.batchSize = options.batchSize ?? Math.min(100, this.tradesPerSecond);
    this.onTrade = options.onTrade || null;
    this.onBatch = options.onBatch || null;
    this.onStats = options.onStats || null;
    this.statsInterval = options.statsInterval ?? 2000;

    this.generator = new TradeGenerator(options.generatorConfig);

    this._running = false;
    this._totalEmitted = 0;
    this._timer = null;
    this._statsTimer = null;
    this._statsWindowStart = 0;
    this._statsWindowCount = 0;
  }

  /**
   * Start generating trades.
   * @returns {Promise} Resolves when generation stops (finite mode) or on stop().
   */
  start() {
    if (this._running) return Promise.resolve();
    this._running = true;
    this._totalEmitted = 0;
    this._statsWindowStart = Date.now();
    this._statsWindowCount = 0;

    return new Promise((resolve) => {
      // Calculate tick interval: how often we emit a batch
      const ticksPerSecond = Math.max(1, this.tradesPerSecond / this.batchSize);
      const intervalMs = Math.max(1, Math.floor(1000 / ticksPerSecond));

      this._timer = setInterval(() => {
        if (!this._running) return;

        const remaining = this.totalTrades - this._totalEmitted;
        if (remaining <= 0) {
          this.stop();
          resolve();
          return;
        }

        const count = Math.min(this.batchSize, remaining);
        const batch = this.generator.generateBatch(count);

        this._totalEmitted += batch.length;
        this._statsWindowCount += batch.length;

        if (this.onBatch) {
          this.onBatch(batch);
        }
        if (this.onTrade) {
          for (const trade of batch) {
            this.onTrade(trade);
          }
        }
      }, intervalMs);

      // Stats reporting
      if (this.onStats) {
        this._statsTimer = setInterval(() => {
          const elapsed = (Date.now() - this._statsWindowStart) / 1000;
          const rate = Math.round(this._statsWindowCount / elapsed);
          this.onStats({
            totalEmitted: this._totalEmitted,
            currentRate: rate,
            elapsed: Math.round(elapsed),
            prices: this.generator.getPriceSnapshot(),
          });
          this._statsWindowStart = Date.now();
          this._statsWindowCount = 0;
        }, this.statsInterval);
      }
    });
  }

  /**
   * Stop generation gracefully.
   */
  stop() {
    this._running = false;
    if (this._timer) clearInterval(this._timer);
    if (this._statsTimer) clearInterval(this._statsTimer);
    this._timer = null;
    this._statsTimer = null;
  }

  get isRunning() {
    return this._running;
  }

  get totalEmitted() {
    return this._totalEmitted;
  }
}

module.exports = StreamRunner;
