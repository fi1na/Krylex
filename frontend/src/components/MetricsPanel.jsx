import React from "react";
import { useSelector } from "react-redux";
import { selectTradeStats, selectDarkMode } from "../store";

export const MetricsPanel = () => {
  const stats = useSelector(selectTradeStats);
  const darkMode = useSelector(selectDarkMode);

  const metrics = [
    {
      label: "Total Trades",
      value: stats.totalTrades.toLocaleString(),
      icon: "📈",
      color: "primary",
      colorCode: "#ff7777",
      bgColorDark: "rgba(255, 119, 119, 0.1)",
      bgColorLight: "rgba(255, 119, 119, 0.08)",
      borderColorDark: "rgba(255, 119, 119, 0.3)",
      borderColorLight: "rgba(255, 119, 119, 0.25)",
    },
    {
      label: "Total Volume",
      value: stats.totalVolume.toLocaleString(),
      icon: "📊",
      color: "success",
      colorCode: "#22c55e",
      bgColorDark: "rgba(34, 197, 94, 0.1)",
      bgColorLight: "rgba(34, 197, 94, 0.08)",
      borderColorDark: "rgba(34, 197, 94, 0.3)",
      borderColorLight: "rgba(34, 197, 94, 0.25)",
    },
    {
      label: "Avg Price",
      value: `$${stats.avgPrice.toFixed(2)}`,
      icon: "💰",
      color: "accent",
      colorCode: "#0ea5e9",
      bgColorDark: "rgba(14, 165, 233, 0.1)",
      bgColorLight: "rgba(14, 165, 233, 0.08)",
      borderColorDark: "rgba(14, 165, 233, 0.3)",
      borderColorLight: "rgba(14, 165, 233, 0.25)",
    },
    {
      label: "Buy/Sell Ratio",
      value:
        stats.sellCount > 0
          ? (stats.buyCount / stats.sellCount).toFixed(2)
          : "0.00",
      icon: "⚖️",
      color: "warning",
      colorCode: "#f59e0b",
      bgColorDark: "rgba(245, 158, 11, 0.1)",
      bgColorLight: "rgba(245, 158, 11, 0.08)",
      borderColorDark: "rgba(245, 158, 11, 0.3)",
      borderColorLight: "rgba(245, 158, 11, 0.25)",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8 animate-slide-up">
      {metrics.map((metric, index) => (
        <div
          key={index}
          style={{
            backgroundColor: darkMode ? metric.bgColorDark : metric.bgColorLight,
            borderColor: darkMode ? metric.borderColorDark : metric.borderColorLight,
            borderWidth: "1px",
            borderStyle: "solid",
          }}
          className="metric-card glass-panel-hover relative group cursor-pointer rounded-2xl"
        >
          {/* Gradient Top Bar */}
          <div
            style={{
              background: `linear-gradient(135deg, ${metric.colorCode}, transparent)`,
            }}
            className="absolute top-0 left-0 right-0 h-1 rounded-t-2xl"
          ></div>

          {/* Icon */}
          <div className="text-3xl mb-3">{metric.icon}</div>

          {/* Label */}
          <p
            style={{ color: darkMode ? "rgba(255, 255, 255, 0.7)" : "#64748b" }}
            className="text-xs font-semibold uppercase tracking-wider mb-2"
          >
            {metric.label}
          </p>

          {/* Value */}
          <p
            style={{ color: metric.colorCode }}
            className="text-3xl font-bold font-mono mb-2"
          >
            {metric.value}
          </p>

          {/* Hover Glow Line */}
          <div
            style={{
              background: `linear-gradient(90deg, transparent, ${metric.colorCode}, transparent)`,
              opacity: 0,
            }}
            className="absolute bottom-0 left-0 right-0 h-px transition-all duration-300 group-hover:opacity-100"
          ></div>
        </div>
      ))}
    </div>
  );
};
