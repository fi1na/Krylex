import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  toggleTheme,
  selectDarkMode,
  selectIsConnected,
  selectSymbolFilter,
  setSymbolFilter,
  setSideFilter,
  selectSideFilter,
} from "../store";

export const Header = () => {
  const dispatch = useDispatch();
  const darkMode = useSelector(selectDarkMode);
  const isConnected = useSelector(selectIsConnected);
  const symbolFilter = useSelector(selectSymbolFilter);
  const sideFilter = useSelector(selectSideFilter);
  const [showSideDropdown, setShowSideDropdown] = useState(false);

  const sideOptions = [
    { value: "", label: "All Trades" },
    { value: "buy", label: "Buy Only" },
    { value: "sell", label: "Sell Only" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 backdrop-blur-xl border-b ${
        darkMode
          ? "bg-white/5 border-white/10"
          : "bg-white/80 border-slate-200 shadow-sm"
      }`}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Top Row: Logo + Status + Theme */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              {/* Krylex Monogram */}
              <div
                className="w-10 h-10 rounded-[10px] flex items-center justify-center"
                style={{ background: darkMode ? "#F0F1F4" : "#0A0A0B" }}
              >
                <span
                  className="font-['Inter'] font-bold text-[16px] tracking-[0.02em]"
                  style={{ color: darkMode ? "#0B0C0F" : "#FAFAFA" }}
                >
                  K
                </span>
              </div>
              {/* Krylex Wordmark */}
              <div>
                <div>
                  <div>
                    <h1
                      className="font-['Inter'] font-semibold text-[18px] tracking-[0.12em] uppercase leading-none antialiased"
                      style={{ color: darkMode ? "#F0F1F4" : "#0A0A0B" }}
                    >
                      Krylex
                    </h1>
                    <p
                      className="font-['Inter'] text-[10px] font-normal tracking-[0.22em] uppercase mt-1"
                      style={{ color: darkMode ? "#A0A2B0" : "#4A4B57" }}
                    >
                      Trading Analytics
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Status + Theme */}
          <div className="flex items-center gap-4">
            {/* Connection Status */}
            <div
              className={`status-badge ${isConnected ? "status-connected" : "status-disconnected"}`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-400" : "bg-red-400"
                } animate-pulse`}
              ></span>
              <span>{isConnected ? "Connected" : "Disconnected"}</span>
            </div>

            {/* Theme Toggle */}
            <button
              onClick={() => dispatch(toggleTheme())}
              className="btn-glass px-4 py-2"
            >
              {darkMode ? "☀️" : "🌙"}
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex gap-4 items-end">
          <div className="flex-1">
            <label
              className={`text-xs font-semibold uppercase tracking-wide block mb-2 ${
                darkMode ? "text-white/70" : "text-slate-500"
              }`}
            >
              Symbol Filter
            </label>
            <input
              type="text"
              placeholder="e.g., AAPL, GOOGL, TSLA..."
              value={symbolFilter || ""}
              onChange={(e) =>
                dispatch(setSymbolFilter(e.target.value || null))
              }
              className="input-glass w-full"
            />
          </div>

          <div className="w-40 relative">
            <label
              className={`text-xs font-semibold uppercase tracking-wide block mb-2 ${
                darkMode ? "text-white/70" : "text-slate-500"
              }`}
            >
              Trade Side
            </label>

            {/* Custom Dropdown Button */}
            <button
              onClick={() => setShowSideDropdown(!showSideDropdown)}
              className="select-glass w-full text-left flex justify-between items-center relative z-40"
            >
              <span>
                {sideOptions.find((opt) => opt.value === sideFilter)?.label ||
                  "All Trades"}
              </span>
              <span
                className={`transition-transform ${showSideDropdown ? "rotate-180" : ""}`}
              >
                ▼
              </span>
            </button>

            {/* Custom Dropdown Menu */}
            {showSideDropdown && (
              <div
                className={`absolute top-full left-0 right-0 mt-2 rounded-lg overflow-hidden z-[9999] shadow-2xl border ${
                  darkMode
                    ? "glass-panel border-white/20"
                    : "bg-white border-slate-200 shadow-lg"
                }`}
              >
                {sideOptions.map((option, idx) => (
                  <button
                    key={option.value}
                    onClick={() => {
                      dispatch(setSideFilter(option.value || null));
                      setShowSideDropdown(false);
                    }}
                    className={`w-full px-4 py-3 text-left text-sm transition-all ${
                      sideFilter === option.value
                        ? darkMode
                          ? "bg-cyan-500/30 text-cyan-300 border-l-2 border-cyan-500"
                          : "bg-cyan-50 text-cyan-700 border-l-2 border-cyan-500"
                        : darkMode
                          ? "text-white/70 hover:bg-white/10 hover:text-white"
                          : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    } ${
                      idx !== sideOptions.length - 1
                        ? darkMode
                          ? "border-b border-white/10"
                          : "border-b border-slate-100"
                        : ""
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button className="btn-glass px-6 py-2 h-10">Search</button>
        </div>
      </div>

      {/* Click outside to close dropdown */}
      {showSideDropdown && (
        <div
          className="fixed inset-0 z-[9998]"
          onClick={() => setShowSideDropdown(false)}
        ></div>
      )}
    </header>
  );
};
