export type MessageType =
  | "CONNECTION_STATUS"
  | "DEVICE_STATUS"
  | "PAIRING_STATUS"
  | "ACK"
  | "ERROR"
  | "LOCATION_UPDATE"
  | "DEVICE_TELEMETRY"
  | "TELEMETRY_ACK"
  | "TELEMETRY_ERROR";

export interface Message {
  type: MessageType;
  id: string; // Unique message UUID
  timestamp: string; // ISO timestamp
  payload: any;
}
