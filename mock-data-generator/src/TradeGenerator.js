/**
 * TradeGenerator - Core engine for generating realistic mock trade data.
 *
 * Simulates price movements using a bounded random walk with:
 *   - Momentum (trend continuation bias)
 *   - Mean reversion (prices pulled back toward a base)
 *   - Volatility clustering (bursts of high/low activity)
 *   - Volume correlation with price movement magnitude
 *   - Buy/sell pressure influenced by price direction
 */

class TradeGenerator {
  /**
   * @param {Object} [config]
   * @param {string[]} [config.symbols] - Ticker symbols to generate trades for.
   * @param {Object}   [config.basePrices] - Optional override of starting prices per symbol.
   * @param {number}   [config.volatility=0.0015] - Base volatility factor (std-dev of % change).
   * @param {number}   [config.momentumFactor=0.6] - How strongly the previous move influences the next.
   * @param {number}   [config.meanReversionStrength=0.02] - Pull-back strength toward the base price.
   */
  constructor(config = {}) {
    this.symbols = config.symbols || [
      "AAPL",
      "GOOGL",
      "TSLA",
      "AMZN",
      "MSFT",
      "META",
      "NVDA",
      "NFLX",
      "AMD",
      "INTC",
      "JPM",
      "V",
      "DIS",
      "PYPL",
      "UBER",
    ];

    const defaultBasePrices = {
      AAPL: 189.5,
      GOOGL: 141.8,
      TSLA: 248.9,
      AMZN: 178.25,
      MSFT: 415.6,
      META: 505.3,
      NVDA: 875.4,
      NFLX: 628.7,
      AMD: 164.2,
      INTC: 43.9,
      JPM: 198.5,
      V: 280.1,
      DIS: 112.4,
      PYPL: 63.8,
      UBER: 72.3,
    };

    this.basePrices = { ...defaultBasePrices, ...config.basePrices };
    this.volatility = config.volatility ?? 0.0015;
    this.momentumFactor = config.momentumFactor ?? 0.6;
    this.meanReversionStrength = config.meanReversionStrength ?? 0.02;

    // Internal state per symbol
    this._state = {};
    for (const sym of this.symbols) {
      const base = this.basePrices[sym] || 100;
      this._state[sym] = {
        price: base,
        basePrice: base,
        momentum: 0,
        volatilityMultiplier: 1,
      };
    }

    this._tradeId = 0;
  }

  // ── Price Simulation ────────────────────────────────────────────────

  /**
   * Advance the price of a single symbol by one tick and return a trade object.
   * @param {string} symbol
   * @returns {Object} trade
   */
  nextTrade(symbol) {
    const s = this._state[symbol];

    // Volatility clustering: slow-moving multiplier
    s.volatilityMultiplier += (Math.random() - 0.5) * 0.05;
    s.volatilityMultiplier = clamp(s.volatilityMultiplier, 0.4, 2.5);

    const vol = this.volatility * s.volatilityMultiplier;

    // Random component (normal-ish via Box-Muller)
    const randomShock = gaussianRandom() * vol;

    // Momentum
    const momentumComponent = s.momentum * this.momentumFactor;

    // Mean reversion
    const deviation = (s.price - s.basePrice) / s.basePrice;
    const reversionComponent = -deviation * this.meanReversionStrength;

    const pctChange = randomShock + momentumComponent + reversionComponent;
    s.momentum = pctChange;

    s.price *= 1 + pctChange;
    s.price = Math.max(s.price * 0.5, Math.min(s.price, s.basePrice * 2)); // hard bounds
    s.price = roundTo(s.price, 2);

    // Volume correlates with move magnitude
    const moveSize = Math.abs(pctChange);
    const baseVolume = 50 + Math.floor(Math.random() * 200);
    const spikeVolume = Math.floor(moveSize * 80000);
    const volume = baseVolume + spikeVolume + Math.floor(Math.random() * 50);

    // Buy/sell pressure follows price direction with some noise
    const buyBias = 0.5 + pctChange * 30 + (Math.random() - 0.5) * 0.3;
    const side = Math.random() < clamp(buyBias, 0.25, 0.75) ? "buy" : "sell";

    this._tradeId += 1;

    return {
      id: this._tradeId,
      timestamp: new Date().toISOString(),
      symbol,
      price: s.price,
      volume,
      side,
    };
  }

  /**
   * Generate a batch of trades across random symbols.
   * @param {number} count - Number of trades to generate.
   * @returns {Object[]}
   */
  generateBatch(count) {
    const trades = [];
    for (let i = 0; i < count; i++) {
      const sym = this.symbols[Math.floor(Math.random() * this.symbols.length)];
      trades.push(this.nextTrade(sym));
    }
    return trades;
  }

  /**
   * Return a snapshot of current prices for all symbols.
   * @returns {Object} { AAPL: 190.23, ... }
   */
  getPriceSnapshot() {
    const snap = {};
    for (const sym of this.symbols) {
      snap[sym] = this._state[sym].price;
    }
    return snap;
  }

  /**
   * Reset all prices back to their base values.
   */
  reset() {
    for (const sym of this.symbols) {
      const s = this._state[sym];
      s.price = s.basePrice;
      s.momentum = 0;
      s.volatilityMultiplier = 1;
    }
    this._tradeId = 0;
  }
}

// ── Helpers ─────────────────────────────────────────────────────────────

function gaussianRandom() {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  return Math.sqrt(-2 * Math.log(u1 || 1e-10)) * Math.cos(2 * Math.PI * u2);
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}

function roundTo(num, decimals) {
  const f = 10 ** decimals;
  return Math.round(num * f) / f;
}

module.exports = TradeGenerator;
