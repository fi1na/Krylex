import React from "react";
import { useSelector } from "react-redux";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { selectChartData, selectDarkMode } from "../store";

export const PriceChart = () => {
  const data = useSelector(selectChartData);
  const darkMode = useSelector(selectDarkMode);

  return (
    <div className="chart-container glass-panel mb-8 animate-slide-up">
      <h2
        className={`text-lg font-bold mb-6 flex items-center gap-2 ${
          darkMode ? "text-white" : "text-slate-900"
        }`}
      >
        <span className="text-2xl">📈</span>
        <span className="bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
          Price Chart
        </span>
        <span
          className={`text-xs px-3 py-1 rounded-lg font-normal ml-auto ${
            darkMode
              ? "bg-white/10 text-white/70"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          Last 50 Trades
        </span>
      </h2>

      {data.length > 0 ? (
        <div className="relative">
          {/* Glow Background */}
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 via-blue-500/5 to-cyan-500/5 rounded-xl pointer-events-none"></div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={data}
              margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
            >
              <defs>
                {/* Gradient for the line */}
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.1} />
                </linearGradient>

                {/* Glow filter */}
                <filter id="glowPrice">
                  <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                  <feMerge>
                    <feMergeNode in="coloredBlur" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={
                  darkMode ? "rgba(255, 255, 255, 0.05)" : "rgba(0, 0, 0, 0.06)"
                }
                vertical={false}
              />

              <XAxis
                dataKey="time"
                stroke={darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}
                style={{ fontSize: "12px" }}
                tick={{
                  fill: darkMode ? "rgba(255,255,255,0.5)" : "#64748b",
                }}
              />

              <YAxis
                stroke={darkMode ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.15)"}
                style={{ fontSize: "12px" }}
                tick={{
                  fill: darkMode ? "rgba(255,255,255,0.5)" : "#64748b",
                }}
              />

              <Tooltip
                contentStyle={
                  darkMode
                    ? {
                        backgroundColor: "rgba(15, 23, 42, 0.8)",
                        border: "1px solid rgba(6, 182, 212, 0.3)",
                        borderRadius: "12px",
                        boxShadow: "0 0 20px rgba(6, 182, 212, 0.3)",
                        backdropFilter: "blur(12px)",
                      }
                    : {
                        backgroundColor: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.1)",
                      }
                }
                labelStyle={{
                  color: darkMode ? "#06b6d4" : "#0284c7",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
                formatter={(value) => [`$${value.toFixed(2)}`, "Price"]}
                itemStyle={{
                  color: darkMode ? "#86efac" : "#166534",
                  fontSize: "12px",
                }}
              />

              <Line
                type="monotone"
                dataKey="price"
                stroke="#06b6d4"
                strokeWidth={2.5}
                dot={false}
                isAnimationActive={false}
                filter={darkMode ? "url(#glowPrice)" : undefined}
                fill="url(#colorPrice)"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div
          className={`h-72 flex items-center justify-center ${
            darkMode ? "text-white/40" : "text-slate-400"
          }`}
        >
          <div className="text-center">
            <p className="text-lg mb-2">⏳</p>
            <p>Waiting for price data...</p>
          </div>
        </div>
      )}
    </div>
  );
};
