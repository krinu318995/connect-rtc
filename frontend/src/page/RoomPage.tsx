import { useNavigate, useParams } from "react-router-dom";
import api from "../api/axios";
import "../assets/style/RoomPage.css";
import { useWebRTC } from "../hook/useWebRTC";
import type { ParticipantItem, ParticipantTileProps } from "../types/room";
import {
  useEffect,
  useState,
  useMemo,
  type SyntheticEvent /** FormEvent 대신 사용, DOM 요소에 직접 접근해야 하는 경우라면 SubmitEvent<HTMLFormElement> */,
} from "react";

import { useActiveSpeaker } from "../hook/useActiveSpeaker";
import ParticipantTile from "../components/room/ParticipantTile";
import RoomChatPanel from "../components/room/RoomChatPanel";

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
    chatMessage,
    localStreamRef,
    myUserId,
    remoteStreams,
    sendChatMessage,
    setChatMessage,
    localStream,
  } = useWebRTC(roomId);

  const [viewMode, setViewMode] = useState<"GALLERY" | "SPEAKER">("GALLERY");
  const [currentPage, setCurrentPage] = useState(0);
  const [pinnedUserId, setPinnedUserId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState<number>(20);
  useEffect(() => {
    if (!roomId) {
      return;
    }

    api
      .get(`/api/rooms/${roomId}/messages`)
      .then((res) => setChatMessage(res.data))
      .catch((err) =>
        console.error("이전 대화 내용을 불러오는데 실패했습니다.", err),
      );
  }, [roomId, setChatMessage]);

  // 전체 참가자 통합 리스트 (나 + 원격 최대 19명 = 20명)
  const participants = useMemo<ParticipantItem[]>(() => {
    const list: ParticipantItem[] = [
      {
        userId: myUserId,
        label: `나 (User #${myUserId})`,
        stream: localStream,
        isLocal: true,
      },
    ]; //list

    remoteStreams.forEach((stream, userId) => {
      list.push({
        userId,
        label: `참가자 #${userId}`,
        stream,
        isLocal: false,
      });
    }); //remoteStreams

    return list;
  }, [myUserId, localStream, remoteStreams]);

  const { activeSpeakerId, speakingUsers } = useActiveSpeaker(participants);

  //페이지 설정
  const PAGE_SIZE = 9;
  const totalPage = Math.max(1, Math.ceil(participants.length / PAGE_SIZE));

  useEffect(() => {
    if (currentPage >= totalPage) {
      setCurrentPage(Math.max(0, totalPage - 1));
    }
  }, [currentPage, totalPage]);

  const visibleGalleryParticipants = useMemo(() => {
    const start = currentPage * PAGE_SIZE;
    return participants.slice(start, start + PAGE_SIZE);
  }, [participants, currentPage]);

  const getGridClass = (count: number) => {
    if (count === 1) return "grid-1";
    if (count === 2) return "grid-2";
    if (count <= 4) return "grid-4";
    if (count <= 6) return "grid-6";
    return "grid-9";
  };

  //발표자 뷰 대상 선정 (핀 고정 > 현재 발화자 > 첫 번째 참가자)
  const stageParticipant = useMemo(() => {
    if (pinnedUserId != null) {
      const found = participants.find((p) => p.userId === pinnedUserId);
      if (found) {
        return found;
      }
    }

    if (activeSpeakerId !== null) {
      const speaker = participants.find((p) => p.userId === activeSpeakerId);
      if (speaker) {
        return speaker;
      }
    }

    return participants[0];
  }, [participants, pinnedUserId, activeSpeakerId]);

  const stripParticipants = useMemo(
    () => participants.filter((p) => p.userId !== stageParticipant?.userId),
    [participants, stageParticipant],
  );

  const handleTogglePin = (userId: number) => {
    setPinnedUserId((prev) => (prev === userId ? null : userId));
    setViewMode("SPEAKER");
  };

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
        <div className="room-header-left">
          {" "}
          <h2>회의실 ({roomId})</h2>
          <span className="room-participant-count">
            참여 인원 {participants.length} / {maxParticipants}명
          </span>
        </div>

        <div className="room-header-right">
          <div className="room-view-switcher">
            <button
              type="button"
              className={`room-view-btn ${viewMode === "GALLERY" ? "active" : ""}`}
              onClick={() => setViewMode("GALLERY")}
            >
              갤러리 뷰
            </button>
            <button
              type="button"
              className={`room-view-btn ${viewMode === "SPEAKER" ? "active" : ""}`}
              onClick={() => setViewMode("SPEAKER")}
            >
              발표자 뷰
            </button>
          </div>
          {/**end switcher */}*{" "}
          <span className="room-status">
            {isConnected ? "연결됨" : "참석자 입장 대기 중"}
          </span>
        </div>
        {/**end header right */}
      </div>
      {/**end room header */}

      <div className="room-main-body">
        <div className="room-stage-area">
          {viewMode === "GALLERY" ? (
            <div className="room-gallery-layout">
              <div
                className={`room-video-grid ${getGridClass(
                  visibleGalleryParticipants.length,
                )}`}
              >
                {visibleGalleryParticipants.map((p) => (
                  <ParticipantTile
                    key={p.userId}
                    participant={p}
                    isSpeaking={speakingUsers.has(p.userId)}
                    isPinned={pinnedUserId === p.userId}
                    onTogglePin={handleTogglePin}
                    variant="grid"
                  />
                ))}
              </div>

              {totalPage > 1 && (
                <div className="room-pagination">
                  <button
                    type="button"
                    disabled={currentPage === 0}
                    onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
                  >
                    ◀ 이전
                  </button>
                  <span>
                    {currentPage + 1} / {totalPage} 페이지
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPage - 1}
                    onClick={() =>
                      setCurrentPage((p) => Math.min(totalPage - 1, p + 1))
                    }
                  >
                    다음 ▶
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="room-speaker-layout">
              <div className="room-speaker-main">
                {stageParticipant && (
                  <ParticipantTile
                    participant={stageParticipant}
                    isSpeaking={speakingUsers.has(stageParticipant.userId)}
                    isPinned={pinnedUserId === stageParticipant.userId}
                    onTogglePin={handleTogglePin}
                    variant="stage"
                  />
                )}
              </div>

              {stripParticipants.length > 0 && (
                <div className="room-speaker-strip">
                  {stripParticipants.map((p) => (
                    <ParticipantTile
                      key={p.userId}
                      participant={p}
                      isSpeaking={speakingUsers.has(p.userId)}
                      isPinned={pinnedUserId === p.userId}
                      onTogglePin={handleTogglePin}
                      variant="strip"
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {isChatOpen && (
          <RoomChatPanel
            messages={chatMessage}
            myUserId={myUserId}
            onSendMessage={sendChatMessage}
            onClose={() => setIsChatOpen(false)}
          />
        )}
      </div>
      {/* 
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
      </div> */}

      <div className="room-controls">
        <button
          className={`room-control-btn ${isChatOpen ? "chat-active" : ""}`}
          type="button"
          onClick={() => setIsChatOpen((prev) => !prev)}
        >
          채팅 {chatMessage.length > 0 ? `(${chatMessage.length})` : ""}
        </button>
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
  );
}
