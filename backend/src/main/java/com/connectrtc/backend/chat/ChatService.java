package com.connectrtc.backend.chat;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.connectrtc.backend.room.Room;
import com.connectrtc.backend.room.RoomRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final RoomRepository roomRepository;

    @Transactional
    public ChatDto.Response saveMessage(String roomId, ChatDto.Request request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회의실 입니다."));

        ChatMessage.MessageType type = request.getMessageType() != null ? request.getMessageType()
                : ChatMessage.MessageType.TEXT;
        ChatMessage chatMessage = ChatMessage.builder()
                .roomId(roomId)
                .senderId(request.getSenderId())
                .messageType(type)
                .content(request.getContent())
                .build();

        ChatMessage savedChatMessage = chatMessageRepository.save(chatMessage);
        room.updateLastMessageAt(LocalDateTime.now());
        return ChatDto.Response.from(savedChatMessage);
    }

    public List<ChatDto.Response> getChatHistory(String roomId) {

        return chatMessageRepository.findAllByRoomIdOrderByCreatedAtAsc(roomId).stream()
                .map(ChatDto.Response::from)
                .toList();

    }

}
