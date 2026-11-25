package com.connectrtc.backend.chat;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class ChatDto {

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Request {
        private Long senderId;
        private ChatMessage.MessageType messageType;
        private String content;

    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {

        private Long messageId;
        private String roomId;
        private Long senderId;
        private ChatMessage.MessageType messageType;
        private String content;
        private LocalDateTime createdAt;

        public static Response from(ChatMessage entity) {
            return Response.builder()
                    .messageId(entity.getMessageId())
                    .roomId(entity.getRoomId())
                    .senderId(entity.getSenderId())
                    .messageType(entity.getMessageType())
                    .content(entity.getContent())
                    .createdAt(entity.getCreatedAt())
                    .build();
        }

    }

}
