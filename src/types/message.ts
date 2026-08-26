export type MessageType =
  | "CONNECTION_STATUS"
  | "DEVICE_STATUS"
  | "PAIRING_STATUS"
  | "ACK"
  | "ERROR";

export interface Message {
  type: MessageType;
  id: string; // Unique message UUID
  timestamp: string; // ISO timestamp
  payload: any;
}
