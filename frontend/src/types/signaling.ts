export type SingalingType = "JOIN" | "OFFER" | "ANSWER" | "ICE" | "LEAVE";

export interface SignalingMessage {
  type: SingalingType;
  roomId: string;
  senderId: number;
  receiverId?: number | null;
  data?: unknown;
}
