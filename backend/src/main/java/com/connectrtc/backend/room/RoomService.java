package com.connectrtc.backend.room;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import com.connectrtc.backend.room.Room.AccessType;
import com.connectrtc.backend.room.Room.RoomStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomService {

    private final PasswordEncoder passwordEncoder;
    private final RoomRepository roomRepository;
    private final RoomParticipantsRepository roomParticipantsRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public RoomDto.Response createRoom(Long userId, RoomDto.CreateRequest request) {
        String roomId = UUID.randomUUID().toString();

        AccessType accessType = request.getAccessType() != null ? request.getAccessType() : AccessType.PUBLIC;

        String encodedPassword = null;
        String inviteCode = null;

        if (accessType == AccessType.PASSWORD) {
            if (!StringUtils.hasText(request.getPassword())) {
                throw new IllegalArgumentException("비밀번호가 설정된 회의실 입니다. 비밀번호를 입력해 주세요.");
            }

            encodedPassword = passwordEncoder.encode(request.getPassword());
        } else if (accessType == AccessType.INVITE_ONLY) {
            inviteCode = UUID.randomUUID().toString().substring(0, 8).toUpperCase();
        }

        Room room = Room.builder()
                .roomId(roomId)
                .title(request.getTitle())
                .roomType(request.getRoomType() != null ? request.getRoomType() : Room.RoomType.GROUP)
                .accessType(accessType)// 추가
                .password(encodedPassword)// 추가
                .inviteCode(inviteCode)// 추가
                .hostId(userId)
                .maxParticipants(request.getMaxParticipants() != null ? request.getMaxParticipants() : 10)
                .status(Room.RoomStatus.OPEN)
                .build();

        Room savedRoom = roomRepository.save(room);

        RoomParticipants participants = RoomParticipants.builder()
                .roomId(roomId)
                .userId(userId)
                .role(RoomParticipants.Role.MEMBER)
                .isActive(true)
                .build();
        roomParticipantsRepository.save(participants);

        return RoomDto.Response.from(savedRoom, 1L);
    }

    public List<RoomDto.Response> getOpenRooms() {
        return roomRepository.findAllByStatusOrderByCreatedAtDesc(RoomStatus.OPEN).stream()
                .map(room -> {
                    long count = roomParticipantsRepository.countByRoomIdAndIsActiveTrue(room.getRoomId());
                    return RoomDto.Response.from(room, count);
                }).toList();
    }

    public RoomDto.Response getRoomDetail(String roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회의실 입니다."));
        long count = roomParticipantsRepository.countByRoomIdAndIsActiveTrue(roomId);
        return RoomDto.Response.from(room, count);
    }

    public RoomDto.Response getRoomByInviteCode(String inviteCode) {
        Room room = roomRepository.findByInviteCode(inviteCode)
                .orElseThrow(() -> new IllegalArgumentException("유효하지 않은 초대코드 입니다."));
        if (room.getStatus() != RoomStatus.OPEN) {
            throw new IllegalStateException("이미 종료된 회의실 입니다.");
        }

        long count = roomParticipantsRepository.countByRoomIdAndIsActiveTrue(room.getRoomId());
        return RoomDto.Response.from(room, count);
    }

    private void validateCapacity(Room room) {
        long currentCount = roomParticipantsRepository.countByRoomIdAndIsActiveTrue(room.getRoomId());

        if (currentCount >= room.getMaxParticipants()) {
            throw new IllegalStateException("회의실 정원이 가득 찼습니다.");
        }
    }

    public void validateAccess(Room room, Long userId, RoomDto.JoinRequest request) {

        if (room.getHostId().equals(userId)) {
            return;
        }
        if (room.getAccessType() == AccessType.PASSWORD) {
            String rawPassword = request != null ? request.getPassword() : null;

            if (!StringUtils.hasText(rawPassword) || !passwordEncoder.matches(rawPassword, rawPassword)) {
                throw new IllegalArgumentException("회의실 비밀번호가 일치하지 않습니다.");
            }
        } else if (room.getAccessType() == AccessType.INVITE_ONLY) {
            String code = request != null ? request.getInviteCode() : null;
            if (!StringUtils.hasText(code) || !code.equals(room.getInviteCode())) {
                throw new IllegalArgumentException("유효하지 않은 초대코드 입니다.");
            }
        }
    }

    @Transactional
    public RoomDto.Response joinRoom(String roomId, Long userId, RoomDto.JoinRequest request) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회의실 입니다."));

        if (room.getStatus() != Room.RoomStatus.OPEN) {
            throw new IllegalStateException("이미 종료된 희의실 입니다.");
        }

        RoomParticipants participants = roomParticipantsRepository
                .findByRoomIdAndUserId(roomId, userId)
                .orElse(null);

        if (participants != null) {
            if (!participants.isActive()) {
                validateAccess(room, userId, request);
                validateCapacity(room);
                participants.setActive(true);
                participants.setLeftAt(null);

            }
        } else {
            validateAccess(room, userId, request);
            validateCapacity(room);
            RoomParticipants newParticipants = RoomParticipants.builder()
                    .roomId(roomId)
                    .userId(userId)
                    .role(RoomParticipants.Role.MEMBER)
                    .isActive(true)
                    .build();

            roomParticipantsRepository.save(newParticipants);
        }

        long currentCount = roomParticipantsRepository.countByRoomIdAndIsActiveTrue(roomId);
        broadcastLobbyUpdate();
        return RoomDto.Response.from(room, currentCount);
    }

    @Transactional
    public void leaveRoom(String roomId, Long userId) {
        RoomParticipants participants = roomParticipantsRepository.findByRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new IllegalArgumentException("해당 회의실에 참석자가 없습니다."));

        participants.setActive(false);
        participants.setLeftAt(LocalDateTime.now());
        broadcastLobbyUpdate();
    }

    @Transactional
    public void deleteRoom(String roomId, Long userId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 회의실 입니다."));
        if (!room.getHostId().equals(userId)) {
            throw new IllegalStateException("방장만 회의실을 종료할 수 있습니다.");

        }
        room.setStatus(Room.RoomStatus.CLOSED);

        List<RoomParticipants> activeList = roomParticipantsRepository.findAllByRoomIdAndIsActiveTrue(roomId);
        LocalDateTime now = LocalDateTime.now();

        for (RoomParticipants p : activeList) {
            p.setActive(false);
            p.setLeftAt(now);
        }
    }

    public void broadcastLobbyUpdate() {
        messagingTemplate.convertAndSend("/sub/lobby", getOpenRooms());
    }

}
