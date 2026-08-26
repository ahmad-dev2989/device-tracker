import { api, getApiBaseUrl } from "./api";
import { secureStore } from "./secureStore";
import type { Message } from "../types/message";

export type ConnectionState =
  | "Disconnected"
  | "Connecting"
  | "Connected"
  | "Reconnecting"
  | "Offline"
  | "PairingRevoked"
  | "AuthFailed";

class ConnectionManager {
  private ws: WebSocket | null = null;
  private state: ConnectionState = "Disconnected";
  private onStateChangeCallback: ((state: ConnectionState) => void) | null = null;
  private onMessageCallback: ((msg: Message) => void) | null = null;
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private isExplicitClosed = false;
  private processedMessageIds = new Set<string>();

  public subscribe(
    onStateChange: (state: ConnectionState) => void,
    onMessage: (msg: Message) => void
  ) {
    this.onStateChangeCallback = onStateChange;
    this.onMessageCallback = onMessage;
    // Emit initial state
    onStateChange(this.state);
  }

  public unsubscribe() {
    this.onStateChangeCallback = null;
    this.onMessageCallback = null;
  }

  private updateState(newState: ConnectionState) {
    this.state = newState;
    if (this.onStateChangeCallback) {
      this.onStateChangeCallback(newState);
    }
  }

  public getState(): ConnectionState {
    return this.state;
  }

  public async connect() {
    this.isExplicitClosed = false;
    
    // Prevent duplicate connections (Requirement 7)
    if (this.ws && (this.ws.readyState === WebSocket.CONNECTING || this.ws.readyState === WebSocket.OPEN)) {
      console.log("[ConnectionManager] WebSocket already active. Skipping duplicate connection.");
      return;
    }

    this.cleanup();

    if (this.reconnectAttempts > 0) {
      this.updateState("Reconnecting");
    } else {
      this.updateState("Connecting");
    }

    try {
      // Refresh credentials by doing a dummy API fetch to check token validity (Requirement 3)
      try {
        await api.getMe();
      } catch (err: any) {
        if (
          err.message?.includes("authentication") || 
          err.message?.includes("Authentication") || 
          err.message?.includes("Forbidden") || 
          err.message?.includes("Unauthorized") ||
          err.status === 401 ||
          err.status === 403
        ) {
          console.warn("[ConnectionManager] Authentication check failed on connect.");
          this.updateState("AuthFailed");
          return;
        }
      }

      const token = await secureStore.get("accessToken");
      if (!token) {
        console.warn("[ConnectionManager] Missing access token, connection aborted.");
        this.updateState("AuthFailed");
        return;
      }

      const wsBaseUrl = getApiBaseUrl().replace(/^http/, "ws");
      const wsUrl = `${wsBaseUrl}?token=${token}`;

      console.log(`[ConnectionManager] Connecting to WebSocket: ${wsBaseUrl}...`);
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log("[ConnectionManager] WebSocket connection opened successfully.");
        this.reconnectAttempts = 0;
        this.updateState("Connected");
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as Message;
          
          // Deduplicate incoming messages (Requirement 10)
          if (this.processedMessageIds.has(msg.id)) {
            return;
          }
          this.processedMessageIds.add(msg.id);
          setTimeout(() => this.processedMessageIds.delete(msg.id), 60000);

          console.log("[ConnectionManager] Message received:", msg);

          // Handle special control messages (Requirement 6)
          if (msg.type === "PAIRING_STATUS" && msg.payload?.status === "REVOKED") {
            this.handlePairingRevocation();
            return;
          }

          if (this.onMessageCallback) {
            this.onMessageCallback(msg);
          }
        } catch (err) {
          console.error("[ConnectionManager] Failed to parse message:", err);
        }
      };

      this.ws.onclose = (event) => {
        console.log(`[ConnectionManager] WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
        this.ws = null;

        if (event.reason === "PAIRING_REVOKED" || event.code === 4003) {
          this.handlePairingRevocation();
          return;
        }

        if (this.isExplicitClosed) {
          this.updateState("Disconnected");
          return;
        }

        this.updateState("Offline");
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error("[ConnectionManager] WebSocket error:", err);
        // Let onClose handle cleanup and reconnection
      };
    } catch (err: any) {
      console.error("[ConnectionManager] Connection setup failed:", err);
      this.updateState("Offline");
      this.scheduleReconnect();
    }
  }

  private handlePairingRevocation() {
    console.log("[ConnectionManager] Pairing has been revoked. Halting reconnection.");
    this.updateState("PairingRevoked");
    this.isExplicitClosed = true;
    this.cleanup();
  }

  private scheduleReconnect() {
    if (this.isExplicitClosed || this.state === "PairingRevoked" || this.state === "AuthFailed") {
      return;
    }

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
    }

    // Exponential backoff strategy: 2s, 4s, 8s, 16s, max 30s with random jitter (Requirement 4)
    const delay = Math.min(30000, 2000 * Math.pow(2, this.reconnectAttempts)) + Math.random() * 1000;
    this.reconnectAttempts++;

    console.log(`[ConnectionManager] Reconnecting in ${Math.round(delay)}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  public sendMessage(type: Message["type"], payload: any): string {
    const id = window.crypto.randomUUID();
    const message: Message = {
      type,
      id,
      timestamp: new Date().toISOString(),
      payload,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return id;
    } else {
      console.warn("[ConnectionManager] Cannot send message, WebSocket is not open.");
      return "";
    }
  }

  public disconnect() {
    this.isExplicitClosed = true;
    this.cleanup();
    this.updateState("Disconnected");
  }

  private cleanup() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      // Clear handlers to prevent leaks during shutdown (Requirement 7)
      this.ws.onopen = null;
      this.ws.onmessage = null;
      this.ws.onclose = null;
      this.ws.onerror = null;
      try {
        this.ws.close();
      } catch (e) {
        // Ignore close error
      }
      this.ws = null;
    }
  }
}

export const connectionManager = new ConnectionManager();
