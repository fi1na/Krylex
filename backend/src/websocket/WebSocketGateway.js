const WebSocket = require("ws");
const { v4: uuidv4 } = require("uuid");

class WebSocketGateway {
  constructor() {
    this.port = 8080;
    this.wss = null;
    this.clients = new Map();
    this.isRunning = false;
    this.tradeBuffer = [];
    this.broadcastInterval = null;
  }

  static initialize() {
    if (!WebSocketGateway.instance) {
      WebSocketGateway.instance = new WebSocketGateway();
    }
    WebSocketGateway.instance.start();
  }

  start() {
    this.wss = new WebSocket.Server({ port: this.port });
    this.isRunning = true;
    this.setupServer();
    console.log(`[WebSocket] Server listening on ws://localhost:${this.port}`);

    // Broadcast batched trades every 100ms
    this.broadcastInterval = setInterval(() => {
      if (this.tradeBuffer.length > 0) {
        this.broadcast({ trades: this.tradeBuffer });
        this.tradeBuffer = [];
      }
    }, 100);
  }

  setupServer() {
    this.wss.on("connection", (ws) => {
      const clientId = uuidv4();
      const client = {
        id: clientId,
        ws,
        isAlive: true,
        lastHeartbeat: Date.now(),
      };

      this.clients.set(clientId, client);
      console.log(
        `[WebSocket] Client connected: ${clientId} (Total: ${this.clients.size})`,
      );

      ws.on("message", (data) => {
        try {
          const message = JSON.parse(data);

          if (message.type === "ping") {
            ws.send(JSON.stringify({ type: "pong" }));
            client.isAlive = true;
            client.lastHeartbeat = Date.now();
          }
        } catch (error) {
          console.error(
            `[WebSocket] Error parsing message from ${clientId}:`,
            error.message,
          );
        }
      });

      ws.on("pong", () => {
        client.isAlive = true;
        client.lastHeartbeat = Date.now();
      });

      ws.on("close", () => {
        this.clients.delete(clientId);
        console.log(
          `[WebSocket] Client disconnected: ${clientId} (Total: ${this.clients.size})`,
        );
      });

      ws.on("error", (error) => {
        console.error(
          `[WebSocket] Error from client ${clientId}:`,
          error.message,
        );
      });
    });

    // Heartbeat check every 60 seconds
    setInterval(() => {
      this.clients.forEach((client, clientId) => {
        const timeSinceLastHeartbeat = Date.now() - client.lastHeartbeat;

        if (timeSinceLastHeartbeat > 90000) {
          console.log(
            `[WebSocket] Client terminated (heartbeat timeout): ${clientId}`,
          );
          client.ws.terminate();
          this.clients.delete(clientId);
        } else if (client.ws.readyState === WebSocket.OPEN) {
          client.ws.ping();
        }
      });
    }, 60000);
  }

  static addTradeToBatch(trade) {
    if (WebSocketGateway.instance) {
      WebSocketGateway.instance.tradeBuffer.push(trade);
    }
  }

  broadcast(message) {
    if (this.clients.size === 0) return;

    const data = JSON.stringify(message);
    let successCount = 0;

    this.clients.forEach((client, clientId) => {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data, (error) => {
          if (error) {
            console.error(
              `[WebSocket] Error sending to ${clientId}:`,
              error.message,
            );
          } else {
            successCount++;
          }
        });
      }
    });

    return successCount;
  }

  static async shutdown() {
    if (!WebSocketGateway.instance) return;

    const instance = WebSocketGateway.instance;
    instance.isRunning = false;

    if (instance.broadcastInterval) {
      clearInterval(instance.broadcastInterval);
    }

    instance.clients.forEach((client) => {
      client.ws.close();
    });

    if (instance.wss) {
      await new Promise((resolve) => {
        instance.wss.close(() => {
          console.log("[WebSocket] Server closed");
          resolve();
        });
      });
    }
  }

  getClientCount() {
    return this.clients.size;
  }
}

module.exports = WebSocketGateway;
