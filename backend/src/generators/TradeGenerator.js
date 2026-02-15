/**
 * Trade Generator
 * Produces high-frequency realistic mock trading data
 */

class TradeGenerator {
  constructor() {
    this.symbols = (
      process.env.SYMBOLS || "AAPL,GOOGL,MSFT,AMZN,TSLA,META,NVDA,AMD,COIN,BTC"
    ).split(",");
    this.tradeId = 0;
    this.symbolPrices = this.initializeSymbolPrices();
    this.symbolVolatility = this.initializeVolatility();
  }

  /**
   * Initialize starting prices for symbols
   */
  initializeSymbolPrices() {
    const prices = {};
    this.symbols.forEach((symbol) => {
      // Realistic price ranges
      if (symbol === "BTC" || symbol === "ETH" || symbol === "DOGE") {
        prices[symbol] = Math.random() * 50000 + 20000; // Crypto: $20k-$70k
      } else if (symbol === "COIN") {
        prices[symbol] = Math.random() * 150 + 50; // $50-$200
      } else {
        prices[symbol] = Math.random() * 500 + 50; // $50-$550 for stocks
      }
    });
    return prices;
  }

  /**
   * Initialize volatility for each symbol
   */
  initializeVolatility() {
    const volatility = {};
    this.symbols.forEach((symbol) => {
      volatility[symbol] = Math.random() * 0.03 + 0.01; // 1-4% daily volatility
    });
    return volatility;
  }

  /**
   * Generate a single trade
   */
  generateTrade() {
    const symbol =
      this.symbols[Math.floor(Math.random() * this.symbols.length)];
    const currentPrice = this.symbolPrices[symbol];
    const volatility = this.symbolVolatility[symbol];

    // Random price movement (Brownian motion simulation)
    const priceChange = (Math.random() - 0.5) * volatility * currentPrice;
    const newPrice = Math.max(currentPrice + priceChange, currentPrice * 0.5); // Prevent negative prices
    this.symbolPrices[symbol] = newPrice;

    // Random volume (realistic distribution: 100-10000 shares)
    const volume = Math.floor(Math.random() * 9900 + 100);

    // 55% buy, 45% sell (slight buy bias)
    const side = Math.random() < 0.55 ? "buy" : "sell";

    const trade = {
      id: this.tradeId++,
      timestamp: Date.now(),
      symbol,
      price: parseFloat(newPrice.toFixed(2)),
      volume,
      side,
      value: parseFloat((newPrice * volume).toFixed(2)),
      change: parseFloat(priceChange.toFixed(2)),
      changePercent: parseFloat(
        ((priceChange / currentPrice) * 100).toFixed(4),
      ),
    };

    return trade;
  }

  /**
   * Generate batch of trades
   */
  generateBatch(count) {
    const trades = [];
    for (let i = 0; i < count; i++) {
      trades.push(this.generateTrade());
    }
    return trades;
  }

  /**
   * Generate continuous stream of trades
   */
  *streamTrades(tradesPerSecond = 500) {
    const batchSize = Math.max(1, Math.floor(tradesPerSecond / 10)); // 10 batches per second
    const delayMs = 100; // 10 batches per second

    let batchCount = 0;
    while (true) {
      const trades = this.generateBatch(batchSize);
      yield trades;
      batchCount++;

      // Every 10 batches (1 second), log progress if this were streaming
      if (batchCount % 10 === 0) {
        const actualRate = batchSize * 10;
        // Silent operation - consumer will handle logging
      }
    }
  }

  /**
   * Get current symbol prices
   */
  getSymbolPrices() {
    return { ...this.symbolPrices };
  }

  /**
   * Get symbol volatility
   */
  getVolatility() {
    return { ...this.symbolVolatility };
  }

  /**
   * Reset generator state
   */
  reset() {
    this.tradeId = 0;
    this.symbolPrices = this.initializeSymbolPrices();
    this.symbolVolatility = this.initializeVolatility();
  }
}

module.exports = TradeGenerator;
