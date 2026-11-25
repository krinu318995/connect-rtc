export type SingalingType = "JOIN" | "OFFER" | "ANSWER" | "ICE" | "LEAVE";

export interface SignalingMessage {
  type: SingalingType;
  roomId: string;
  senderId: number;
  receiverId?: number | null;
  data?: unknown;
}

export type ChatMessageType = "TEXT" | "IMAGE" | "FILE" | "SYSTEM";

export interface ChatMessage {
  messageId?: number;
  roomId: string;
  senderId: number;
  messageType: ChatMessageType;
  content: string;
  createdAt?: string;
}
