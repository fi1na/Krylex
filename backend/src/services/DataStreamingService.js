/**
 * Data Streaming Service
 * Bridges TradeGenerator with Kafka producer
 * Manages high-frequency trade streaming with batching
 */

const TradeGenerator = require("../generators/TradeGenerator");
const KafkaManager = require("../kafka/KafkaManager");

class DataStreamingService {
  constructor() {
    this.generator = new TradeGenerator();
    this.isRunning = false;
    this.streamInterval = null;
    this.stats = {
      tradesGenerated: 0,
      tradesPublished: 0,
      batchesPublished: 0,
      errors: 0,
      startTime: null,
    };
  }

  /**
   * Start the data streaming
   */
  async start() {
    if (this.isRunning) {
      console.log("[DataStreamingService] Already running");
      return;
    }

    const tradesPerSecond = parseInt(
      process.env.TRADES_PER_SECOND || "500",
      10,
    );
    const batchSize = parseInt(process.env.BATCH_SIZE || "50", 10);

    // Calculate interval: generate batchSize trades every N milliseconds
    const batchesPerSecond = Math.ceil(tradesPerSecond / batchSize);
    const intervalMs = 1000 / batchesPerSecond;

    this.stats.startTime = Date.now();
    this.isRunning = true;

    console.log(
      `[DataStreamingService] Starting with ${tradesPerSecond} trades/sec (${batchSize} per batch, ${intervalMs.toFixed(0)}ms interval)`,
    );

    this.streamInterval = setInterval(async () => {
      try {
        const trades = this.generator.generateBatch(batchSize);
        this.stats.tradesGenerated += trades.length;

        // Publish to Kafka
        await KafkaManager.publishTrades(trades);
        this.stats.tradesPublished += trades.length;
        this.stats.batchesPublished++;

        // Log progress every 10,000 trades
        if (this.stats.tradesGenerated % 10000 < batchSize) {
          this.logProgress();
        }
      } catch (error) {
        this.stats.errors++;
        console.error("[DataStreamingService] Streaming error:", error.message);
      }
    }, intervalMs);
  }

  /**
   * Stop the data streaming
   */
  stop() {
    if (this.streamInterval) {
      clearInterval(this.streamInterval);
      this.streamInterval = null;
    }
    this.isRunning = false;
    console.log("[DataStreamingService] Stopped");
  }

  /**
   * Log progress
   */
  logProgress() {
    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    const actualRate = this.stats.tradesPublished / elapsed;
    const successRate = (
      (this.stats.tradesPublished / this.stats.tradesGenerated) *
      100
    ).toFixed(2);

    console.log(`[DataStreamingService] 
      Generated: ${this.stats.tradesGenerated}, 
      Published: ${this.stats.tradesPublished}, 
      Batches: ${this.stats.batchesPublished}, 
      Rate: ${actualRate.toFixed(0)} trades/sec, 
      Success: ${successRate}%, 
      Errors: ${this.stats.errors}`);
  }

  /**
   * Get current stats
   */
  getStats() {
    if (!this.stats.startTime) {
      return this.stats;
    }

    const elapsed = (Date.now() - this.stats.startTime) / 1000;
    return {
      ...this.stats,
      uptime: elapsed.toFixed(2),
      actualRate: (this.stats.tradesPublished / elapsed).toFixed(0),
      successRate: (
        (this.stats.tradesPublished / this.stats.tradesGenerated) *
        100
      ).toFixed(2),
    };
  }

  /**
   * Get generator info
   */
  getGeneratorInfo() {
    return {
      symbols: this.generator.symbols,
      prices: this.generator.getSymbolPrices(),
      volatility: this.generator.getVolatility(),
    };
  }

  /**
   * Reset stats
   */
  resetStats() {
    this.stats = {
      tradesGenerated: 0,
      tradesPublished: 0,
      batchesPublished: 0,
      errors: 0,
      startTime: this.isRunning ? Date.now() : null,
    };
  }
}

module.exports = new DataStreamingService();
