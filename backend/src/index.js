/**
 * Main Entry Point
 * Orchestrates Kafka, WebSocket, and data streaming services
 * Best Practices: Error handling, graceful shutdown, dependency injection
 */

// Load configuration first (before anything else)
const config = require("./config");

const KafkaManager = require("./kafka/KafkaManager");
const WebSocketGateway = require("./websocket/WebSocketGateway");
const DataStreamingService = require("./services/DataStreamingService");
const { createHttpServer } = require("./http/HttpServer");

class Application {
  constructor() {
    this.httpServer = null;
    this.isShuttingDown = false;
    this.startTime = null;
  }

  /**
   * Initialize and start all services
   */
  async start() {
    try {
      this.startTime = Date.now();

      console.log("=".repeat(60));
      console.log("[Application] Starting Trading Dashboard Backend");
      console.log(`[Application] Environment: ${config.app.environment}`);
      console.log("=".repeat(60));

      // 1. Initialize Kafka
      console.log("\n[Application] Step 1: Initializing Kafka...");
      await KafkaManager.initialize();

      // Optional: Create topics (can be disabled if auto-create is enabled in Kafka)
      console.log("[Application] Creating Kafka topics...");
      try {
        await KafkaManager.createTopics();
      } catch (error) {
        console.warn("[Application] Topic creation warning:", error.message);
        console.log("[Application] Continuing with auto-create enabled...");
      }

      // 2. Initialize WebSocket Gateway
      console.log("\n[Application] Step 2: Initializing WebSocket Gateway...");
      WebSocketGateway.initialize();

      // 3. Subscribe WebSocket to Kafka trades
      console.log(
        "[Application] Step 3: Setting up Kafka Consumer -> WebSocket bridge...",
      );
      await KafkaManager.subscribeToTrades(async (trade) => {
        // Forward each trade from Kafka to WebSocket clients (batched internally)
        WebSocketGateway.addTradeToBatch(trade);
      });

      // 4. Start HTTP server
      console.log("[Application] Step 4: Starting HTTP Server...");
      const { app, server } = createHttpServer();
      this.httpServer = { app, server };

      // 5. Start data streaming
      console.log("[Application] Step 5: Starting data streaming...");
      await DataStreamingService.start();

      console.log("\n" + "=".repeat(60));
      console.log("[Application] All services started successfully!");
      console.log("=".repeat(60));
      console.log("\n[Application] API Endpoints:");
      console.log(
        `  - Health: http://${config.http.host}:${config.http.port}/health`,
      );
      console.log(
        `  - Metrics: http://${config.http.host}:${config.http.port}/metrics`,
      );
      console.log(
        `  - WebSocket: ws://${config.websocket.host}:${config.websocket.port}`,
      );
      console.log("\n[Application] Use Ctrl+C to stop\n");

      // Setup graceful shutdown
      this.setupGracefulShutdown();

      return true;
    } catch (error) {
      console.error("[Application] Startup failed:", error.message);
      console.error(error.stack);
      process.exit(1);
    }
  }

  /**
   * Setup graceful shutdown handlers
   */
  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      if (this.isShuttingDown) return;
      this.isShuttingDown = true;

      console.log(
        `\n[Application] Received ${signal}, shutting down gracefully...`,
      );

      try {
        // Stop data streaming
        console.log("[Application] Stopping data streaming...");
        DataStreamingService.stop();

        // Close WebSocket gateway
        console.log("[Application] Closing WebSocket gateway...");
        await WebSocketGateway.shutdown();

        // Disconnect Kafka
        console.log("[Application] Disconnecting Kafka...");
        await KafkaManager.disconnect();

        // Close HTTP server
        if (this.httpServer && this.httpServer.server) {
          console.log("[Application] Closing HTTP server...");
          await new Promise((resolve) => {
            this.httpServer.server.close(() => {
              console.log("[Application] HTTP server closed");
              resolve();
            });
          });
        }

        const uptime = Math.floor((Date.now() - this.startTime) / 1000);
        console.log(`[Application] Shutdown complete (uptime: ${uptime}s)`);
        process.exit(0);
      } catch (error) {
        console.error("[Application] Shutdown error:", error.message);
        process.exit(1);
      }
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));

    // Handle uncaught exceptions
    process.on("uncaughtException", (error) => {
      console.error("[Application] Uncaught exception:", error.message);
      console.error(error.stack);
      shutdown("uncaughtException");
    });

    // Handle unhandled promise rejections
    process.on("unhandledRejection", (reason, promise) => {
      console.error("[Application] Unhandled promise rejection:", reason);
      console.error("Promise:", promise);
      shutdown("unhandledRejection");
    });
  }

  /**
   * Get application status
   */
  getStatus() {
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      running: !this.isShuttingDown,
      uptime,
      startTime: this.startTime,
      services: {
        kafka: KafkaManager.getStatus(),
        websocket: {
          isRunning: WebSocketGateway.isRunning,
        },
        streaming: {
          isRunning: DataStreamingService.isRunning,
        },
      },
    };
  }
}

// Start application
if (require.main === module) {
  const app = new Application();
  app.start().catch((error) => {
    console.error("[Application] Fatal error:", error.message);
    process.exit(1);
  });
}

module.exports = Application;
