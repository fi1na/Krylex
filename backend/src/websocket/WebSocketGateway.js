/**
 * WebSocket Server Module
 * Manages real-time client connections and broadcasts Kafka messages
 */

const WebSocket = require("ws");
const http = require("http");
const { v4: uuidv4 } = require("uuid");

class WebSocketGateway {
  constructor() {
    this.server = null;
    this.wss = null;
    this.clients = new Map();
    this.messageBuffer = [];
    this.messageBufferSize = 50;
    this.broadcastInterval = null;
    this.isRunning = false;
  }

  /**
   * Initialize WebSocket server
   */
  initialize() {
    const port = process.env.WS_PORT || 8080;
    const host = process.env.WS_HOST || "localhost";

    this.server = http.createServer((req, res) => {
      if (req.url === "/health") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            status: "ok",
            clients: this.clients.size,
            bufferedMessages: this.messageBuffer.length,
          }),
        );
      } else if (req.url === "/metrics") {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(this.getMetrics()));
      } else {
        res.writeHead(404);
        res.end();
      }
    });

    this.wss = new WebSocket.Server({ server: this.server });

    this.wss.on("connection", (ws) => this.handleClientConnection(ws));
    this.wss.on("error", (error) => {
      console.error("[WebSocket] Server error:", error.message);
    });

    this.server.listen(port, host, () => {
      console.log(`[WebSocket] Server listening on ws://${host}:${port}`);
      this.isRunning = true;
    });

    // Start batch broadcast interval
    this.startBatchBroadcast();
  }

  /**
   * Handle new client connection
   */
  handleClientConnection(ws) {
    const clientId = uuidv4();
    const clientInfo = {
      id: clientId,
      ws,
      connectedAt: new Date(),
      messagesReceived: 0,
      messagesSent: 0,
      isAlive: true,
    };

    this.clients.set(clientId, clientInfo);
    console.log(
      `[WebSocket] Client connected: ${clientId} (Total: ${this.clients.size})`,
    );

    // Send welcome message
    ws.send(
      JSON.stringify({
        type: "connection",
        clientId,
        timestamp: Date.now(),
        message: "Connected to trading dashboard backend",
      }),
    );

    // Handle incoming messages
    ws.on("message", (data) => {
      try {
        const message = JSON.parse(data);
        this.handleClientMessage(clientId, message);
      } catch (error) {
        console.error(
          `[WebSocket] Message parse error from ${clientId}:`,
          error.message,
        );
      }
    });

    // Handle client close
    ws.on("close", () => {
      this.clients.delete(clientId);
      console.log(
        `[WebSocket] Client disconnected: ${clientId} (Total: ${this.clients.size})`,
      );
    });

    // Handle errors
    ws.on("error", (error) => {
      console.error(
        `[WebSocket] Client error from ${clientId}:`,
        error.message,
      );
    });

    // Heartbeat
    ws.isAlive = true;
    ws.on("pong", () => {
      ws.isAlive = true;
    });
  }

  /**
   * Handle incoming client messages
   */
  handleClientMessage(clientId, message) {
    const clientInfo = this.clients.get(clientId);
    if (clientInfo) {
      clientInfo.messagesReceived++;
    }

    switch (message.type) {
      case "subscribe":
        console.log(
          `[WebSocket] Client ${clientId} subscribed to ${message.channel}`,
        );
        break;
      case "ping":
        this.sendToClient(clientId, {
          type: "pong",
          timestamp: Date.now(),
        });
        break;
      default:
        console.log(
          `[WebSocket] Unknown message type from ${clientId}:`,
          message.type,
        );
    }
  }

  /**
   * Add trade to message buffer for batch broadcasting
   */
  addTradeToBatch(trade) {
    this.messageBuffer.push({
      type: "trade",
      data: trade,
      timestamp: Date.now(),
    });

    // Flush if buffer reaches size limit
    if (this.messageBuffer.length >= this.messageBufferSize) {
      this.broadcastBatch();
    }
  }

  /**
   * Broadcast a single trade (immediate)
   */
  broadcastTrade(trade) {
    const message = JSON.stringify({
      type: "trade",
      data: trade,
      timestamp: Date.now(),
    });

    this.broadcast(message);
  }

  /**
   * Start periodic batch broadcast
   */
  startBatchBroadcast() {
    this.broadcastInterval = setInterval(() => {
      if (this.messageBuffer.length > 0) {
        this.broadcastBatch();
      }
      this.performHeartbeat();
    }, 100); // 10 batches per second
  }

  /**
   * Broadcast batched messages to all clients
   */
  broadcastBatch() {
    if (this.messageBuffer.length === 0 || this.clients.size === 0) {
      return;
    }

    const batch = {
      type: "batch",
      trades: this.messageBuffer,
      count: this.messageBuffer.length,
      timestamp: Date.now(),
    };

    const message = JSON.stringify(batch);

    for (const [clientId, clientInfo] of this.clients) {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        try {
          clientInfo.ws.send(message);
          clientInfo.messagesSent++;
        } catch (error) {
          console.error(
            `[WebSocket] Broadcast error to ${clientId}:`,
            error.message,
          );
        }
      }
    }

    this.messageBuffer = [];
  }

  /**
   * Generic broadcast to all connected clients
   */
  broadcast(message) {
    for (const [clientId, clientInfo] of this.clients) {
      if (clientInfo.ws.readyState === WebSocket.OPEN) {
        try {
          clientInfo.ws.send(message);
          clientInfo.messagesSent++;
        } catch (error) {
          console.error(
            `[WebSocket] Broadcast error to ${clientId}:`,
            error.message,
          );
        }
      }
    }
  }

  /**
   * Send message to specific client
   */
  sendToClient(clientId, data) {
    const clientInfo = this.clients.get(clientId);
    if (!clientInfo) return;

    if (clientInfo.ws.readyState === WebSocket.OPEN) {
      try {
        clientInfo.ws.send(JSON.stringify(data));
        clientInfo.messagesSent++;
      } catch (error) {
        console.error(`[WebSocket] Send error to ${clientId}:`, error.message);
      }
    }
  }

  /**
   * Perform heartbeat check
   */
  performHeartbeat() {
    for (const [clientId, clientInfo] of this.clients) {
      if (!clientInfo.isAlive) {
        clientInfo.ws.terminate();
        this.clients.delete(clientId);
        console.log(
          `[WebSocket] Client terminated (heartbeat timeout): ${clientId}`,
        );
        continue;
      }

      clientInfo.isAlive = false;
      clientInfo.ws.ping();
    }
  }

  /**
   * Get gateway metrics
   */
  getMetrics() {
    const uptime = process.uptime();
    let totalMessagesReceived = 0;
    let totalMessagesSent = 0;

    for (const clientInfo of this.clients.values()) {
      totalMessagesReceived += clientInfo.messagesReceived;
      totalMessagesSent += clientInfo.messagesSent;
    }

    return {
      uptime,
      activeClients: this.clients.size,
      totalMessagesReceived,
      totalMessagesSent,
      bufferedMessages: this.messageBuffer.length,
      isRunning: this.isRunning,
      clientDetails: Array.from(this.clients.values()).map((c) => ({
        id: c.id,
        connectedAt: c.connectedAt,
        messagesReceived: c.messagesReceived,
        messagesSent: c.messagesSent,
      })),
    };
  }

  /**
   * Graceful shutdown
   */
  async shutdown() {
    if (this.broadcastInterval) {
      clearInterval(this.broadcastInterval);
    }

    for (const [, clientInfo] of this.clients) {
      clientInfo.ws.close(1000, "Server shutting down");
    }

    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          console.log("[WebSocket] Server shut down");
          this.isRunning = false;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }
}

module.exports = new WebSocketGateway();
