package com.connectrtc.backend.chat;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@Slf4j
@RestController
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/chat/{roomId}")
    public void sendMessage(@DestinationVariable String roomId,
            @Payload ChatDto.Request request) {
        log.info("Chat message roomId={}, senderId={}", roomId, request.getSenderId(), request.getMessageType());

        ChatDto.Response savedResponse = chatService.saveMessage(roomId, request);
        messagingTemplate.convertAndSend("/sub/chat/" + roomId, savedResponse);
    }

    @GetMapping("/api/rooms/{roomId}/messages")
    public ResponseEntity<List<ChatDto.Response>> getChatHistory(@PathVariable String roomId) {
        return ResponseEntity.ok(chatService.getChatHistory(roomId));
    }

}
