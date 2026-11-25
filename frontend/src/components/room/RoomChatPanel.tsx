import { useRef, useState, useEffect, type SyntheticEvent } from "react";
import type { ChatMessage } from "../../types/signaling";

import type { RoomChatPanelProps } from "../../types/room";

export default function RoomChatPanel({
  messages,
  myUserId,
  onClose,
  onSendMessage,
}: RoomChatPanelProps) {
  const [chatInput, setChatInput] = useState("");
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSubmit = (e: SyntheticEvent) => {
    e.preventDefault();

    if (!chatInput) {
      return;
    }

    onSendMessage(chatInput);
    setChatInput("");
  }; //handleSubmit

  return (
    <aside className="room-chat-panel">
      <div className="room-chat-header">
        <h3>채팅</h3>
        <button className="room-chat-close" onClick={close} type="button">
          X
        </button>
      </div>
      <div className="room-chat-message">
        {messages.length === 0 ? (
          <p className="room-chat-empty">내화 내용이 없습니다.</p>
        ) : (
          messages.map((msg, idx) => {
            const isMine = msg.senderId === myUserId;
            return (
              <div
                key={msg.messageId ?? idx}
                className={`room-chat-item ${isMine ? "mine" : "other"}`}
              >
                {!isMine && (
                  <span className="room-chat-sender">User #{msg.senderId}</span>
                )}
                <div className="room-chat-bubble">{msg.content}</div>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>
      <form className="room-chat-form" onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="메시지 입력"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
        />
        <button type="submit">전송</button>
      </form>
    </aside>
  );
}
