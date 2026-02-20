import React, { useEffect } from "react";
import { useSelector } from "react-redux";
import { selectDarkMode } from "./store";
import { useWebSocket } from "./hooks/useWebSocket";
import { Header } from "./components/Header";
import { MetricsPanel } from "./components/MetricsPanel";
import { PriceChart } from "./components/PriceChart";
import { TradeTable } from "./components/TradeTable";

function App() {
  const darkMode = useSelector(selectDarkMode);

  // Initialize WebSocket connection
  useWebSocket(import.meta.env.VITE_WS_URL || "ws://localhost:8080");

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      document.body.classList.add("dark");
      // Remove any inline styles so CSS takes over
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    } else {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
      document.body.style.backgroundColor = "";
      document.body.style.color = "";
    }
  }, [darkMode]);

  return (
    <div
      className={`min-h-screen transition-colors ${
        darkMode ? "bg-transparent text-white" : "bg-transparent text-slate-900"
      }`}
    >
      <Header />

      <main className="max-w-7xl mx-auto px-6 py-8">
        <MetricsPanel />
        <PriceChart />
        <TradeTable />
      </main>
    </div>
  );
}

export default App;
