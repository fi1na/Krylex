import { useEffect, useRef, useCallback } from "react";
import { useDispatch } from "react-redux";
import { addTrades, setConnected } from "../store";

export const useWebSocket = (url) => {
  const dispatch = useDispatch();
  const ws = useRef(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const reconnectDelay = useRef(3000);
  const messageBuffer = useRef([]);
  const flushInterval = useRef(null);
  const heartbeatInterval = useRef(null);

  const flushMessages = useCallback(() => {
    if (messageBuffer.current.length > 0) {
      dispatch(addTrades(messageBuffer.current));
      messageBuffer.current = [];
    }
  }, [dispatch]);

  const sendHeartbeat = useCallback(() => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({ type: "ping" }));
    }
  }, []);

  const connect = useCallback(() => {
    try {
      ws.current = new WebSocket(url);

      ws.current.onopen = () => {
        console.log("✅ WebSocket connected");
        dispatch(setConnected(true));
        reconnectAttempts.current = 0;
        reconnectDelay.current = 3000;

        // Start flushing messages every 100ms
        if (flushInterval.current) clearInterval(flushInterval.current);
        flushInterval.current = setInterval(flushMessages, 100);

        // Start sending heartbeat every 30 seconds
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
        heartbeatInterval.current = setInterval(sendHeartbeat, 30000);
      };

      ws.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);

          // Handle pong response
          if (data.type === "pong") {
            return;
          }

          if (data.trades && Array.isArray(data.trades)) {
            messageBuffer.current.push(...data.trades);
          }
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.current.onerror = (error) => {
        console.error("❌ WebSocket error:", error);
        dispatch(setConnected(false));
      };

      ws.current.onclose = () => {
        console.log("⚠️ WebSocket disconnected");
        dispatch(setConnected(false));
        if (flushInterval.current) clearInterval(flushInterval.current);
        if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);

        // Attempt to reconnect
        if (reconnectAttempts.current < maxReconnectAttempts) {
          reconnectAttempts.current += 1;
          console.log(
            `Reconnecting... (${reconnectAttempts.current}/${maxReconnectAttempts})`,
          );
          setTimeout(() => connect(), reconnectDelay.current);
          reconnectDelay.current = Math.min(
            reconnectDelay.current * 1.5,
            30000,
          );
        }
      };
    } catch (error) {
      console.error("Error creating WebSocket:", error);
      dispatch(setConnected(false));
    }
  }, [url, dispatch, flushMessages, sendHeartbeat]);

  useEffect(() => {
    connect();

    return () => {
      if (flushInterval.current) clearInterval(flushInterval.current);
      if (heartbeatInterval.current) clearInterval(heartbeatInterval.current);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [connect]);

  return ws.current;
};
