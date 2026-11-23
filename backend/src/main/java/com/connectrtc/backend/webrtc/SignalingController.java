package com.connectrtc.backend.webrtc;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@Slf4j
@RequiredArgsConstructor
public class SignalingController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/signal/{roomId}")
    public void handleSignaling(@DestinationVariable String roomId,
            @Payload SignalingMessage message) {
        log.info("Signaling [{}] roomId={}, sender={}, receiver={}",
                message.getType(), roomId, message.getSenderId(), message.getReceiverId());

        message.setRoomId(roomId);
        messagingTemplate.convertAndSend("/sub/rooms/" + roomId, message);
    }

}
