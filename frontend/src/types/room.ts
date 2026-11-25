import type { ChatMessage } from "./signaling";

export interface Room {
  roomId: string;
  title: string;
  maxParticipants: number;
  currentParticipants: number;
  status: string;
}

export interface ParticipantItem {
  userId: number;
  label: string;
  stream: MediaStream | null;
  isLocal: boolean;
}

export type VariantType = "grid" | "stage" | "strip";

export interface ParticipantTileProps {
  participant: ParticipantItem;
  isSpeaking: boolean;
  isPinned: boolean;
  onTogglePin: (userId: number) => void;
  variant?: VariantType;
}

export interface RoomChatPanelProps {
  messages: ChatMessage[];
  myUserId: number;
  onSendMessage: (content: string) => void;
  onClose: () => void;
}
