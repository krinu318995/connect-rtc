package com.connectrtc.backend.global.jwt;

import java.util.Map;

import org.jspecify.annotations.Nullable;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;
import org.springframework.security.access.AccessDeniedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Slf4j
@RequiredArgsConstructor
@Component
public class StompHandler implements ChannelInterceptor {

    private final JwtProvider jwtProvider;

    @Override
    public @Nullable Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String authHeader = accessor.getFirstNativeHeader("Authorization");

            if (authHeader == null || !authHeader.startsWith("Bearer ")) {
                log.warn("STOMP 연결 실패: Authorization 헤더 누락");
                throw new AccessDeniedException("인증 토큰이 없습니다.");
            }

            String token = authHeader.substring(7);

            if (!jwtProvider.validateToken(token)) {
                log.warn("STOMP 연결 실패: 유요하지 않은 JWT토큰");
                throw new AccessDeniedException("유효하지 않은 토큰입니다.");
            }

            Long userId = jwtProvider.getUserId(token);
            Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
            if (sessionAttributes != null && userId != null) {
                sessionAttributes.put("userId", userId);
            }

            log.info("STOMP JWT 인증 성공");

        } else if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            String destination = accessor.getDestination();

            if (destination != null && destination.startsWith("/sub/rooms/")) {
                String roomId = destination.substring("/sub/rooms/".length());
                Map<String, Object> sessionAttributes = accessor.getSessionAttributes();
                if (sessionAttributes != null) {
                    sessionAttributes.put("roomId", roomId);
                }
            }
        }

        return message;
    }

}
