import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../assets/style/RoomPage.css";
import { useWebRTC } from "../hook/useWebRTC";

export default function RoomPage() {
  const { roomId } = useParams<{ roomId: string }>();

  const navigate = useNavigate();

  const {
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCamOff,
    isConnected,
    toggleCam,
    toggleMute,
  } = useWebRTC(roomId);

  const handleLeaveRoom = async () => {
    try {
      if (roomId) {
        await api.post(`/api/rooms/${roomId}/leave`);
      }
    } catch (err: any) {
      console.error("퇴장 요청 실패", err);
    } finally {
      navigate("/lobby");
    }
  };

  return (
    <div className="room-container">
      <div className="room-header">
        <h2>회의실 ({roomId})</h2>
        <span className="room-status">
          {isConnected ? "연결" : "참석자 입장 대기 중"}
        </span>
      </div>

      <div className="room-video-grid">
        <div className="room-video-box">
          <video
            className="room-video"
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
          />
          <span className="room-video-label">나 (Local)</span>
        </div>
        <div className="room-video-box">
          <video
            className="room-video"
            autoPlay
            playsInline
            ref={remoteVideoRef}
          />
          <span className="room-video-label">상대방 (Remote)</span>
        </div>
        <div className="room-controls">
          <button
            className={`room-control-btn ${isMuted ? "active" : ""}`}
            type="button"
            onClick={toggleMute}
          >
            {isMuted ? "마이크 켜기" : "마이크 끄기"}
          </button>
          <button
            className={`room-control-btn ${isCamOff ? "active" : ""}`}
            type="button"
            onClick={toggleCam}
          >
            {isCamOff ? "카메라 켜기" : "카메라 끄기"}
          </button>
          <button
            className="room-leave-btn"
            type="button"
            onClick={handleLeaveRoom}
          >
            회의 나가기
          </button>
        </div>
      </div>
    </div>
  );
}
