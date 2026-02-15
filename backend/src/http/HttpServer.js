/**
 * Express HTTP Server
 * Provides health checks, metrics, and admin endpoints
 */

const express = require("express");
const DataStreamingService = require("../services/DataStreamingService");
const KafkaManager = require("../kafka/KafkaManager");
const WebSocketGateway = require("../websocket/WebSocketGateway");

function createHttpServer() {
  const app = express();
  const port = process.env.HTTP_PORT || 3000;
  const host = process.env.HTTP_HOST || "localhost";

  // Middleware
  app.use(express.json());
  app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept",
    );
    next();
  });

  // Health check endpoint
  app.get("/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      kafka: KafkaManager.getStatus(),
      streaming: {
        isRunning: DataStreamingService.isRunning,
      },
      websocket: {
        isRunning: WebSocketGateway.isRunning,
        clients: WebSocketGateway.clients.size,
      },
    });
  });

  // Metrics endpoint
  app.get("/metrics", (req, res) => {
    res.json({
      streaming: DataStreamingService.getStats(),
      websocket: WebSocketGateway.getMetrics(),
      kafka: KafkaManager.getStatus(),
      generator: DataStreamingService.getGeneratorInfo(),
    });
  });

  // Start streaming endpoint
  app.post("/api/streaming/start", async (req, res) => {
    try {
      if (DataStreamingService.isRunning) {
        return res.status(400).json({ error: "Streaming already running" });
      }
      await DataStreamingService.start();
      res.json({
        message: "Streaming started",
        stats: DataStreamingService.getStats(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stop streaming endpoint
  app.post("/api/streaming/stop", (req, res) => {
    try {
      DataStreamingService.stop();
      res.json({
        message: "Streaming stopped",
        stats: DataStreamingService.getStats(),
      });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Get streaming stats
  app.get("/api/streaming/stats", (req, res) => {
    res.json(DataStreamingService.getStats());
  });

  // Reset streaming stats
  app.post("/api/streaming/reset", (req, res) => {
    DataStreamingService.resetStats();
    res.json({
      message: "Stats reset",
      stats: DataStreamingService.getStats(),
    });
  });

  // Get generator info
  app.get("/api/generator/info", (req, res) => {
    res.json(DataStreamingService.getGeneratorInfo());
  });

  // WebSocket gateway metrics
  app.get("/api/websocket/metrics", (req, res) => {
    res.json(WebSocketGateway.getMetrics());
  });

  // Kafka status
  app.get("/api/kafka/status", (req, res) => {
    res.json(KafkaManager.getStatus());
  });

  // System info
  app.get("/api/system/info", (req, res) => {
    res.json({
      environment: process.env.NODE_ENV,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
    });
  });

  // Ready check (for container orchestration)
  app.get("/ready", (req, res) => {
    const kafkaReady = KafkaManager.isConnected;
    const wsReady = WebSocketGateway.isRunning;

    if (kafkaReady && wsReady) {
      res.status(200).json({ ready: true });
    } else {
      res.status(503).json({
        ready: false,
        kafka: kafkaReady,
        websocket: wsReady,
      });
    }
  });

  // 404 handler
  app.use((req, res) => {
    res.status(404).json({
      error: "Not found",
      path: req.path,
      method: req.method,
    });
  });

  // Error handler
  app.use((err, req, res, next) => {
    console.error("[Express] Error:", err);
    res.status(500).json({
      error: err.message,
      timestamp: new Date().toISOString(),
    });
  });

  const server = app.listen(port, host, () => {
    console.log(`[Express] HTTP server listening on http://${host}:${port}`);
  });

  return { app, server };
}

module.exports = { createHttpServer };
