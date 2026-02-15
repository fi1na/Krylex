/**
 * Kafka Module
 * Handles all Kafka producer, consumer, and admin operations
 * Best Practices: Dependency injection, validation, error handling
 */

const { Kafka, logLevel } = require("kafkajs");
const config = require("../config");

class KafkaManager {
  constructor(kafkaConfig) {
    this.config = kafkaConfig;
    this.kafka = null;
    this.producer = null;
    this.consumer = null;
    this.isConnected = false;
  }

  /**
   * Initialize Kafka client and connect
   * @throws {Error} If connection fails
   */
  async initialize() {
    try {
      console.log("[Kafka] Initializing with brokers:", this.config.brokers);

      this.kafka = new Kafka({
        clientId: "trading-dashboard-backend",
        brokers: this.config.brokers,
        logLevel: logLevel.ERROR,
        requestTimeout: 30000,
        connectionTimeout: 10000,
        retry: {
          initialRetryTime: 100,
          retries: 8,
          randomizationFactor: 0.2,
        },
      });

      this.producer = this.kafka.producer({
        idempotent: true,
        maxInFlightRequests: 5,
        compression: 1, // Gzip
        timeout: 30000,
        retry: {
          initialRetryTime: 100,
          retries: 8,
        },
      });

      await this.producer.connect();
      console.log("[Kafka Producer] Connected to Kafka cluster");
      this.isConnected = true;

      return true;
    } catch (error) {
      console.error("[Kafka Producer] Failed to connect:", error.message);
      throw error;
    }
  }

  /**
   * Create topics if they don't exist
   * @throws {Error} If topic creation fails (except for already exists)
   */
  async createTopics() {
    if (!this.kafka) {
      throw new Error("Kafka not initialized. Call initialize() first.");
    }

    const admin = this.kafka.admin();

    try {
      await admin.connect();
      console.log("[Kafka Admin] Connected");

      // Define topics with environment-driven names
      const topics = [
        {
          name: this.config.tradesTopicName,
          numPartitions: 8,
          replicationFactor: 1,
          configEntries: [
            { name: "retention.ms", value: "3600000" }, // 1 hour
            { name: "compression.type", value: "snappy" },
          ],
        },
        {
          name: this.config.alertsTopicName,
          numPartitions: 4,
          replicationFactor: 1,
          configEntries: [
            { name: "retention.ms", value: "86400000" }, // 24 hours
          ],
        },
        {
          name: this.config.analyticsTopicName,
          numPartitions: 4,
          replicationFactor: 1,
          configEntries: [
            { name: "retention.ms", value: "604800000" }, // 7 days
          ],
        },
      ];

      // Validate all topic names before sending to Kafka
      topics.forEach((topic, index) => {
        if (
          !topic.name ||
          typeof topic.name !== "string" ||
          !topic.name.trim()
        ) {
          throw new Error(`Topic[${index}] has invalid name: ${topic.name}`);
        }
        if (topic.numPartitions < 1) {
          throw new Error(
            `Topic[${index}] ${topic.name} must have at least 1 partition`,
          );
        }
        if (topic.replicationFactor < 1) {
          throw new Error(
            `Topic[${index}] ${topic.name} must have replication factor >= 1`,
          );
        }
      });

      console.log(
        `[Kafka Admin] Creating ${topics.length} topics:`,
        topics.map((t) => t.name).join(", "),
      );

      await admin.createTopics({
        topics,
        validateOnly: false,
        timeout: 30000,
      });

      console.log("[Kafka Admin] Topics created/verified successfully");
      await admin.disconnect();

      return true;
    } catch (error) {
      // Topic already exists is not an error
      if (error.message && error.message.includes("already exists")) {
        console.log("[Kafka Admin] Topics already exist (no action needed)");
        await admin.disconnect();
        return true;
      }

      console.error("[Kafka Admin] Error:", error.message);
      try {
        await admin.disconnect();
      } catch (disconnectError) {
        console.error(
          "[Kafka Admin] Error during disconnect:",
          disconnectError.message,
        );
      }
      throw error;
    }
  }

  /**
   * Publish trades to Kafka
   * @param {Array} trades - Array of trade objects
   * @throws {Error} If publish fails
   */
  async publishTrades(trades) {
    if (!this.producer || !this.isConnected) {
      throw new Error("Kafka producer not connected. Call initialize() first.");
    }

    if (!Array.isArray(trades) || trades.length === 0) {
      return; // Nothing to publish
    }

    // Validate trade objects
    trades.forEach((trade, index) => {
      if (!trade.symbol || !trade.timestamp || trade.price === undefined) {
        throw new Error(
          `Trade[${index}] is missing required fields: symbol, timestamp, price`,
        );
      }
    });

    const messages = trades.map((trade) => ({
      key: `${trade.symbol}-${Math.floor(trade.timestamp / 1000)}`,
      value: JSON.stringify(trade),
      timestamp: Date.now().toString(),
    }));

    try {
      await this.producer.send({
        topic: this.config.tradesTopicName,
        messages,
        timeout: 30000,
        compression: 1,
      });

      return { count: messages.length, success: true };
    } catch (error) {
      console.error("[Kafka Producer] Send error:", error.message);
      throw error;
    }
  }

  /**
   * Subscribe to trades topic
   * @param {Function} messageHandler - Callback for handling messages
   * @throws {Error} If subscription fails
   */
  async subscribeToTrades(messageHandler) {
    if (!this.kafka) {
      throw new Error("Kafka not initialized. Call initialize() first.");
    }

    if (typeof messageHandler !== "function") {
      throw new Error("messageHandler must be a function");
    }

    try {
      this.consumer = this.kafka.consumer({
        groupId: this.config.consumerGroup,
        sessionTimeout: 30000,
        heartbeatInterval: 3000,
        rebalanceTimeout: 60000,
      });

      await this.consumer.connect();
      console.log("[Kafka Consumer] Connected");

      await this.consumer.subscribe({
        topic: this.config.tradesTopicName,
        fromBeginning: false,
      });

      console.log(
        `[Kafka Consumer] Subscribed to topic: ${this.config.tradesTopicName}`,
      );

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          try {
            const trade = JSON.parse(message.value.toString());

            // Validate trade before passing to handler
            if (
              !trade.symbol ||
              !trade.timestamp ||
              trade.price === undefined
            ) {
              console.error("[Kafka Consumer] Invalid trade received:", trade);
              return;
            }

            await messageHandler(trade);
          } catch (error) {
            console.error(
              "[Kafka Consumer] Error processing message:",
              error.message,
            );
            // Don't rethrow - continue processing other messages
          }
        },
        autoCommit: true,
        autoCommitInterval: 5000,
        autoCommitThreshold: 100,
        partitionsConsumedConcurrently: 4,
      });

      return true;
    } catch (error) {
      console.error("[Kafka Consumer] Subscription error:", error.message);
      throw error;
    }
  }

  /**
   * Disconnect all Kafka connections
   */
  async disconnect() {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        console.log("[Kafka Consumer] Disconnected");
      }
      if (this.producer) {
        await this.producer.disconnect();
        console.log("[Kafka Producer] Disconnected");
      }
      this.isConnected = false;
    } catch (error) {
      console.error("[Kafka] Disconnect error:", error.message);
    }
  }

  /**
   * Get Kafka connection status
   */
  getStatus() {
    return {
      isConnected: this.isConnected,
      producer: !!this.producer,
      consumer: !!this.consumer,
      brokers: this.config.brokers,
      tradesTopicName: this.config.tradesTopicName,
    };
  }
}

// Create singleton instance with config
const kafkaManager = new KafkaManager(config.kafka);

module.exports = kafkaManager;
