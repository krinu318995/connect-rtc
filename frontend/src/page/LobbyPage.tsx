import { useEffect, useState, type SubmitEvent } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";
import "../assets/style/LobbyPage.css";
import type { Room } from "../types/room";
import { create } from "axios";

export default function LobbyPage() {
  const navigate = useNavigate();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [title, setTitle] = useState("");
  const [maxParticipants, setMaxParticipants] = useState(2);

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const MIN_PARTICIPANTS = 2;
  const MAX_PARTICIPANTS = 20;
  const participantOptions: number[] = [];

  for (let i = MIN_PARTICIPANTS; i <= MAX_PARTICIPANTS; i++) {
    participantOptions.push(i);
  }
  const fetchRooms = async () => {
    try {
      const res = await api.get("/api/rooms");
      setRooms(res.data);
    } catch (err: any) {
      console.error(err, " 회의실 목록 조회 실패");
    }
  };
  useEffect(() => {
    fetchRooms();
  }, []);

  const handleCreateRoom = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim()) {
      return;
    }

    try {
      const res = await api.post("/api/rooms", { title, maxParticipants });
      const createRoomId = res.data.roomId;

      await api.post(`/api/rooms/${createRoomId}/join`);
      navigate(`/rooms/${createRoomId}`);
    } catch (err: any) {
      console.error(err, " 회의실 생성 중 오류가 발생하였습니다.");
    }
  };

  const handleJoinRooms = async (roomId: string) => {
    try {
      await api.post(`/api/rooms/${roomId}/join`);
      navigate(`/rooms/${roomId}`);
    } catch (err: any) {
      alert("회의실 입장에 실패했습니다.");
      console.error(err, " 회의실 입장 실패");
      fetchRooms();
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/");
  };

  return (
    <div className="Lobby-containter">
      <div className="Lobby-header">
        <h2>대기실</h2>
        <button className="lobby-logout-btn" onClick={handleLogout}>
          로그아웃
        </button>
        {/**회의실 생성 */}
        <form className="lobby-create-room" onSubmit={handleCreateRoom}>
          <input
            type="text"
            className="lobby-title-input"
            placeholder="회의실 제목 입력"
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
            }}
            required
          />
          {/* <select
            className="lobby-select"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
          >
            {participantOptions.map((count) => (
              <option key={count} value={count}>
                최대 {count}명
              </option>
            ))}
          </select> */}
          <div className="lobby-custom-select">
            <button
              type="button"
              className="lobby-select-trigger"
              onClick={() => {
                setIsDropdownOpen((prev) => !prev);
              }}
            >
              <span>최대 {maxParticipants}명</span>
              <span className="lobby-select-arrow">
                {isDropdownOpen ? "▲" : "▼"}
              </span>
            </button>
            {isDropdownOpen && (
              <ul className="lobby-select-menu">
                {participantOptions.map((count) => (
                  <li
                    key={count}
                    className={`lobby-select-option ${maxParticipants === count ? "selected" : ""}`}
                    onClick={() => {
                      setMaxParticipants(count);
                      setIsDropdownOpen(false);
                    }}
                  >
                    최대 {count}명
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/**custom select end */}
          <button type="submit" className="lobby-create-btn">
            방 만들기
          </button>
        </form>
        {/** 회의실 리스트 */}
        {rooms.length === 0 ? (
          <p className="lobby-empty-text">현재 열려있는 회의실이 없습니다.</p>
        ) : (
          <ul className="lobby-room-list">
            {rooms.map((room) => (
              <li key={room.roomId} className="lobby-room-item">
                <div>
                  <strong>{room.title}</strong>
                  <span className="lobby-room-meta">
                    인원: {room.currentParticipants} / {room.maxParticipants} (
                    {room.status})
                  </span>
                  <button
                    className="lobby-join-btn"
                    onClick={() => handleJoinRooms(room.roomId)}
                    disabled={room.status === "CLOSED"}
                  >
                    입장
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
  //////////////////
}
