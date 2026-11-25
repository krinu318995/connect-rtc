package com.connectrtc.backend.webrtc;

import java.util.Map;

import org.springframework.context.event.EventListener;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.messaging.SessionDisconnectEvent;

import com.connectrtc.backend.room.RoomService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketEventListener {

    private final RoomService roomService;
    private final SimpMessagingTemplate messagingTemplate;

    @EventListener
    public void handleWebSocketDisconnectListener(SessionDisconnectEvent event) {

        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(event.getMessage());
        Map<String, Object> sessionAttributes = accessor.getSessionAttributes();

        if (sessionAttributes == null) {
            return;
        }

        Long userId = (Long) sessionAttributes.get("userId");
        String roomId = (String) sessionAttributes.get("roomId");

        if (userId != null && roomId != null) {
            log.info("WebSocket 비정상 연결 종료 감지 : userId = {}, roomId = {}", userId, roomId);
            roomService.leaveRoom(roomId, userId);

            SignalingMessage leageSignal = SignalingMessage.builder()
                    .type(SignalingMessage.MessageType.LEAVE)
                    .roomId(roomId)
                    .senderId(userId)
                    .build();

            messagingTemplate.convertAndSend("/sub/rooms/" + roomId, leageSignal);
        }

    }
}
