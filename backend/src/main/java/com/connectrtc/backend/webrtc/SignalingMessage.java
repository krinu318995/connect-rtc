package com.connectrtc.backend.webrtc;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SignalingMessage {
    public enum MessageType {
        JOIN,
        OFFER,
        ANSWER,
        ICE,
        LEAVE

    }

    private MessageType type;
    private String roomId;
    private Long senderId;
    private Long receiverId;
    private Object data;
}
