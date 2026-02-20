import React from "react";
import { useSelector } from "react-redux";
import { FixedSizeList as List } from "react-window";
import { selectFilteredTrades, selectSymbolFilter, selectDarkMode } from "../store";

const Row = ({ index, style, trades, darkMode }) => {
  const trade = trades[index];
  const isBuy = trade.side === "buy";

  return (
    <div
      style={style}
      className={`trade-row px-6 py-3 flex items-center gap-6 text-sm ${
        darkMode ? "" : "border-b border-slate-100"
      }`}
    >
      {/* Time */}
      <div
        className={`flex-1 min-w-[120px] font-mono ${
          darkMode ? "text-white/70" : "text-slate-500"
        }`}
      >
        {new Date(trade.timestamp).toLocaleTimeString()}
      </div>

      {/* Symbol */}
      <div className="flex-1 min-w-[100px]">
        <span
          className={`font-bold ${
            darkMode ? "text-white" : "text-slate-900"
          }`}
        >
          {trade.symbol}
        </span>
      </div>

      {/* Price */}
      <div className="flex-1 min-w-[120px] text-right font-mono">
        <span className={darkMode ? "text-cyan-400" : "text-cyan-600"}>
          ${trade.price.toFixed(2)}
        </span>
      </div>

      {/* Volume */}
      <div
        className={`flex-1 min-w-[120px] text-right font-mono ${
          darkMode ? "text-white/70" : "text-slate-500"
        }`}
      >
        {trade.volume.toLocaleString()}
      </div>

      {/* Side Badge */}
      <div className="flex-1 min-w-[100px] text-right">
        <span className={`badge-side ${isBuy ? "badge-buy" : "badge-sell"}`}>
          {isBuy ? "📈 BUY" : "📉 SELL"}
        </span>
      </div>
    </div>
  );
};

export const TradeTable = () => {
  const trades = useSelector(selectFilteredTrades);
  const symbolFilter = useSelector(selectSymbolFilter);
  const darkMode = useSelector(selectDarkMode);

  return (
    <div className="chart-container glass-panel animate-slide-up">
      {/* Header */}
      <h2
        className={`text-lg font-bold mb-6 flex items-center gap-2 ${
          darkMode ? "text-white" : "text-slate-900"
        }`}
      >
        <span className="text-2xl">📋</span>
        <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Trade Orders
        </span>
        <span
          className={`text-xs px-3 py-1 rounded-lg font-normal ml-auto ${
            darkMode
              ? "bg-white/10 text-white/70"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          {trades.length.toLocaleString()} trades
        </span>
      </h2>

      {/* Table Header */}
      <div
        className={`px-6 py-4 rounded-xl mb-2 flex items-center gap-6 text-xs font-bold uppercase tracking-wider ${
          darkMode
            ? "bg-white/5 border-b border-white/10 text-white/60"
            : "bg-slate-50 border border-slate-200 text-slate-500"
        }`}
      >
        <div className="flex-1 min-w-[120px]">Time</div>
        <div className="flex-1 min-w-[100px]">Symbol</div>
        <div className="flex-1 min-w-[120px] text-right">Price</div>
        <div className="flex-1 min-w-[120px] text-right">Volume</div>
        <div className="flex-1 min-w-[100px] text-right">Side</div>
      </div>

      {/* Table Body */}
      {trades.length > 0 ? (
        <div
          className={`rounded-lg overflow-hidden border ${
            darkMode ? "border-white/10" : "border-slate-200"
          }`}
        >
          <List
            height={400}
            itemCount={trades.length}
            itemSize={48}
            width="100%"
            itemData={trades}
          >
            {({ index, style }) => (
              <Row index={index} style={style} trades={trades} darkMode={darkMode} />
            )}
          </List>
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-2xl mb-2">🔍</p>
          <p className={darkMode ? "text-white/40" : "text-slate-400"}>
            {symbolFilter
              ? `No trades found for ${symbolFilter}`
              : "No trades yet. Waiting for data..."}
          </p>
        </div>
      )}

      {/* Footer Stats */}
      {trades.length > 0 && (
        <div
          className={`mt-6 pt-4 flex justify-between items-center text-xs ${
            darkMode
              ? "border-t border-white/10 text-white/60"
              : "border-t border-slate-200 text-slate-400"
          }`}
        >
          <span>Showing {trades.length.toLocaleString()} trades</span>
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      )}
    </div>
  );
};
