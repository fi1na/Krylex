/**
 * Configuration Module
 * Loads and validates all environment variables
 * Best Practice: Centralized configuration management
 */

const path = require("path");
const fs = require("fs");

// Load environment variables from .env file
const envPath = path.resolve(__dirname, "../.env");
if (!fs.existsSync(envPath)) {
  console.warn(`[WARNING] .env file not found at ${envPath}. Using defaults.`);
}
require("dotenv").config({ path: envPath });

/**
 * Configuration object with validation
 */
const config = {
  // Kafka Configuration
  kafka: {
    brokers: parseArray(process.env.KAFKA_BROKERS, "localhost:9092"),
    tradesTopicName: parseString(
      process.env.KAFKA_TRADES_TOPIC,
      "trades",
      "KAFKA_TRADES_TOPIC",
    ),
    alertsTopicName: parseString(
      process.env.KAFKA_ALERTS_TOPIC,
      "alerts",
      "KAFKA_ALERTS_TOPIC",
    ),
    analyticsTopicName: parseString(
      process.env.KAFKA_ANALYTICS_TOPIC,
      "analytics",
      "KAFKA_ANALYTICS_TOPIC",
    ),
    consumerGroup: parseString(
      process.env.KAFKA_CONSUMER_GROUP,
      "trading-dashboard-backend",
      "KAFKA_CONSUMER_GROUP",
    ),
  },

  // WebSocket Configuration
  websocket: {
    port: parseInt(process.env.WS_PORT || "8080", 10),
    host: parseString(process.env.WS_HOST, "localhost", "WS_HOST"),
  },

  // HTTP Server Configuration
  http: {
    port: parseInt(process.env.HTTP_PORT || "3000", 10),
    host: parseString(process.env.HTTP_HOST, "localhost", "HTTP_HOST"),
  },

  // Trade Generator Configuration
  generator: {
    tradesPerSecond: parseInt(process.env.TRADES_PER_SECOND || "500", 10),
    batchSize: parseInt(process.env.BATCH_SIZE || "50", 10),
    symbols: parseArray(
      process.env.SYMBOLS,
      "AAPL,GOOGL,MSFT,AMZN,TSLA,META,NVDA,AMD,COIN,BTC,ETH,DOGE,NFLX,IBM,INTC,JPM,GS,BAC,WFC,C",
    ),
  },

  // Application Configuration
  app: {
    logLevel: parseString(process.env.LOG_LEVEL, "info", "LOG_LEVEL"),
    environment: parseString(process.env.NODE_ENV, "development", "NODE_ENV"),
  },
};

/**
 * Helper function to parse comma-separated strings into array
 * @param {string} value - Environment variable value
 * @param {string} defaultValue - Default value if not provided
 * @returns {Array} Parsed array
 */
function parseArray(value, defaultValue) {
  if (!value) {
    return defaultValue.split(",").map((v) => v.trim());
  }
  return value.split(",").map((v) => v.trim());
}

/**
 * Helper function to parse and validate string values
 * @param {string} value - Environment variable value
 * @param {string} defaultValue - Default value if not provided
 * @param {string} varName - Variable name for logging
 * @returns {string} Validated string value
 */
function parseString(value, defaultValue, varName = "") {
  if (!value) {
    if (varName) {
      console.log(
        `[CONFIG] ${varName} not set, using default: "${defaultValue}"`,
      );
    }
    return defaultValue;
  }

  const trimmedValue = value.trim();
  if (!trimmedValue) {
    console.warn(
      `[CONFIG] ${varName} is empty, using default: "${defaultValue}"`,
    );
    return defaultValue;
  }

  return trimmedValue;
}

/**
 * Validate configuration
 * @throws {Error} If configuration is invalid
 */
function validateConfig() {
  const errors = [];

  // Validate Kafka brokers
  if (!config.kafka.brokers || config.kafka.brokers.length === 0) {
    errors.push("KAFKA_BROKERS must be configured");
  }
  config.kafka.brokers.forEach((broker, index) => {
    if (!broker.includes(":")) {
      errors.push(
        `KAFKA_BROKERS[${index}] must be in format "host:port", got: ${broker}`,
      );
    }
  });

  // Validate topic names
  if (
    !config.kafka.tradesTopicName ||
    typeof config.kafka.tradesTopicName !== "string"
  ) {
    errors.push("KAFKA_TRADES_TOPIC must be a valid string");
  }
  if (
    !config.kafka.alertsTopicName ||
    typeof config.kafka.alertsTopicName !== "string"
  ) {
    errors.push("KAFKA_ALERTS_TOPIC must be a valid string");
  }
  if (
    !config.kafka.analyticsTopicName ||
    typeof config.kafka.analyticsTopicName !== "string"
  ) {
    errors.push("KAFKA_ANALYTICS_TOPIC must be a valid string");
  }

  // Validate ports
  if (
    isNaN(config.websocket.port) ||
    config.websocket.port < 1 ||
    config.websocket.port > 65535
  ) {
    errors.push(
      `WS_PORT must be a valid port number (1-65535), got: ${config.websocket.port}`,
    );
  }
  if (
    isNaN(config.http.port) ||
    config.http.port < 1 ||
    config.http.port > 65535
  ) {
    errors.push(
      `HTTP_PORT must be a valid port number (1-65535), got: ${config.http.port}`,
    );
  }

  // Validate generator settings
  if (config.generator.tradesPerSecond < 1) {
    errors.push(
      `TRADES_PER_SECOND must be >= 1, got: ${config.generator.tradesPerSecond}`,
    );
  }
  if (config.generator.batchSize < 1) {
    errors.push(`BATCH_SIZE must be >= 1, got: ${config.generator.batchSize}`);
  }
  if (!config.generator.symbols || config.generator.symbols.length === 0) {
    errors.push("SYMBOLS must contain at least one symbol");
  }

  // Throw error if validation failed
  if (errors.length > 0) {
    const errorMessage = `Configuration validation failed:\n${errors.map((e) => `  - ${e}`).join("\n")}`;
    throw new Error(errorMessage);
  }
}

/**
 * Log current configuration (without sensitive data)
 */
function logConfig() {
  console.log("\n" + "=".repeat(60));
  console.log("[Configuration] Current Settings");
  console.log("=".repeat(60));

  console.log("\n[Kafka]");
  console.log(`  Brokers: ${config.kafka.brokers.join(", ")}`);
  console.log(`  Trades Topic: ${config.kafka.tradesTopicName}`);
  console.log(`  Alerts Topic: ${config.kafka.alertsTopicName}`);
  console.log(`  Analytics Topic: ${config.kafka.analyticsTopicName}`);
  console.log(`  Consumer Group: ${config.kafka.consumerGroup}`);

  console.log("\n[WebSocket]");
  console.log(`  Host: ${config.websocket.host}`);
  console.log(`  Port: ${config.websocket.port}`);

  console.log("\n[HTTP Server]");
  console.log(`  Host: ${config.http.host}`);
  console.log(`  Port: ${config.http.port}`);

  console.log("\n[Trade Generator]");
  console.log(`  Trades/Second: ${config.generator.tradesPerSecond}`);
  console.log(`  Batch Size: ${config.generator.batchSize}`);
  console.log(
    `  Symbols: ${config.generator.symbols.length} (${config.generator.symbols.slice(0, 5).join(", ")}...)`,
  );

  console.log("\n[Application]");
  console.log(`  Environment: ${config.app.environment}`);
  console.log(`  Log Level: ${config.app.logLevel}`);
  console.log("=".repeat(60) + "\n");
}

// Validate configuration on load
try {
  validateConfig();
  logConfig();
} catch (error) {
  console.error("[Configuration Error]", error.message);
  process.exit(1);
}

module.exports = config;
