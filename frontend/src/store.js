import { configureStore, createSlice, createSelector } from "@reduxjs/toolkit";

// ============================================================================
// TRADES SLICE
// ============================================================================

const tradesSlice = createSlice({
  name: "trades",
  initialState: {
    trades: [],
    symbolFilter: null,
    sideFilter: null,
    isConnected: false,
  },
  reducers: {
    addTrades: (state, action) => {
      state.trades = [...state.trades, ...action.payload];
      // Keep only last 1500 trades for performance
      if (state.trades.length > 1500) {
        state.trades = state.trades.slice(-1500);
      }
    },
    setConnected: (state, action) => {
      state.isConnected = action.payload;
    },
    setSymbolFilter: (state, action) => {
      state.symbolFilter = action.payload;
    },
    setSideFilter: (state, action) => {
      state.sideFilter = action.payload;
    },
    clearTrades: (state) => {
      state.trades = [];
    },
  },
});

// ============================================================================
// THEME SLICE
// ============================================================================

const themeSlice = createSlice({
  name: "theme",
  initialState: {
    darkMode: localStorage.getItem("darkMode") === "true" || false,
  },
  reducers: {
    toggleTheme: (state) => {
      state.darkMode = !state.darkMode;
      localStorage.setItem("darkMode", state.darkMode);
    },
  },
});

// ============================================================================
// STORE CONFIGURATION
// ============================================================================

export const store = configureStore({
  reducer: {
    trades: tradesSlice.reducer,
    theme: themeSlice.reducer,
  },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
  addTrades,
  setConnected,
  setSymbolFilter,
  setSideFilter,
  clearTrades,
} = tradesSlice.actions;
export const { toggleTheme } = themeSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

// Raw selectors
const selectTradesState = (state) => state.trades;
const selectThemeState = (state) => state.theme;

// Memoized selectors
export const selectAllTrades = createSelector(
  [selectTradesState],
  (trades) => trades.trades,
);

export const selectIsConnected = createSelector(
  [selectTradesState],
  (trades) => trades.isConnected,
);

export const selectSymbolFilter = createSelector(
  [selectTradesState],
  (trades) => trades.symbolFilter,
);

export const selectSideFilter = createSelector(
  [selectTradesState],
  (trades) => trades.sideFilter,
);

export const selectDarkMode = createSelector(
  [selectThemeState],
  (theme) => theme.darkMode,
);

// Filtered trades
export const selectFilteredTrades = createSelector(
  [selectAllTrades, selectSymbolFilter, selectSideFilter],
  (trades, symbolFilter, sideFilter) => {
    return trades.filter((trade) => {
      if (symbolFilter && trade.symbol !== symbolFilter) return false;
      if (sideFilter && trade.side !== sideFilter) return false;
      return true;
    });
  },
);

// Chart data (last 50 candles)
export const selectChartData = createSelector(
  [selectFilteredTrades],
  (trades) => {
    if (trades.length === 0) return [];

    const last50 = trades.slice(-50);
    return last50.map((trade) => ({
      time: new Date(trade.timestamp).toLocaleTimeString(),
      price: trade.price,
      volume: trade.volume,
    }));
  },
);

// Trade statistics
export const selectTradeStats = createSelector(
  [selectFilteredTrades],
  (trades) => {
    if (trades.length === 0) {
      return {
        totalTrades: 0,
        totalVolume: 0,
        avgPrice: 0,
        buyCount: 0,
        sellCount: 0,
        buyVolume: 0,
        sellVolume: 0,
      };
    }

    const totalTrades = trades.length;
    const totalVolume = trades.reduce((sum, t) => sum + t.volume, 0);
    const avgPrice = trades.reduce((sum, t) => sum + t.price, 0) / totalTrades;

    const buys = trades.filter((t) => t.side === "buy");
    const sells = trades.filter((t) => t.side === "sell");

    const buyVolume = buys.reduce((sum, t) => sum + t.volume, 0);
    const sellVolume = sells.reduce((sum, t) => sum + t.volume, 0);

    return {
      totalTrades,
      totalVolume,
      avgPrice,
      buyCount: buys.length,
      sellCount: sells.length,
      buyVolume,
      sellVolume,
    };
  },
);

// Symbol statistics
export const selectSymbolStats = createSelector([selectAllTrades], (trades) => {
  const stats = {};

  trades.forEach((trade) => {
    if (!stats[trade.symbol]) {
      stats[trade.symbol] = {
        symbol: trade.symbol,
        count: 0,
        volume: 0,
        avgPrice: 0,
        lastPrice: 0,
      };
    }
    stats[trade.symbol].count += 1;
    stats[trade.symbol].volume += trade.volume;
    stats[trade.symbol].lastPrice = trade.price;
  });

  // Calculate average price
  Object.keys(stats).forEach((symbol) => {
    const symbolTrades = trades.filter((t) => t.symbol === symbol);
    stats[symbol].avgPrice =
      symbolTrades.reduce((sum, t) => sum + t.price, 0) / symbolTrades.length;
  });

  return Object.values(stats);
});
