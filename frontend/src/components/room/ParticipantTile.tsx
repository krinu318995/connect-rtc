import { useEffect, useRef } from "react";
import type { ParticipantTileProps } from "../../types/room";

export default function ParticipantTile({
  participant,
  isPinned,
  isSpeaking,
  onTogglePin,
  variant = "grid",
}: ParticipantTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current && participant.stream) {
      videoRef.current.srcObject = participant.stream;
    }
  }, [participant.stream]); //useEffect

  return (
    <div
      className={`room-vedio-box ${variant} ${isSpeaking ? "speaking" : ""} ${isPinned ? "pinned" : ""}`}
      onClick={() => onTogglePin(participant.userId)}
      title="클릭하여 화면 고정(Pin)"
    >
      <video
        className={`room-video ${participant.isLocal ? "mirror" : ""}`}
        ref={videoRef}
        autoPlay
        playsInline
        muted={participant.isLocal}
      />
      <div className="room-vidio-overlay">
        <span className="room-vidio-label">
          {participant.label}
          {isPinned && " 📌"}
        </span>
        {isSpeaking && <span className="room-speaking-badge">발언 중</span>}
      </div>
    </div>
  );
}
