package com.connectrtc.backend.room;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.connectrtc.backend.room.Room.RoomStatus;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantsRepository roomParticipantsRepository;

    @Transactional
    public RoomDto.Response createRoom(Long userId, RoomDto.CreateRequest request) {
        String roomId = UUID.randomUUID().toString();

        Room room = Room.builder()
                .roomId(roomId)
                .title(request.getTitle())
                .roomType(request.getRoomType() != null ? request.getRoomType() : Room.RoomType.GROUP)
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

    private void validateCapacity(Room room) {
        long currentCount = roomParticipantsRepository.countByRoomIdAndIsActiveTrue(room.getRoomId());

        if (currentCount >= room.getMaxParticipants()) {
            throw new IllegalStateException("회의실 정원이 가득 찼습니다.");
        }
    }

    @Transactional
    public RoomDto.Response joinRoom(String roomId, Long userId) {
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
                validateCapacity(room);
                participants.setActive(true);
                participants.setLeftAt(null);

            }
        } else {
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
        return RoomDto.Response.from(room, currentCount);
    }

    @Transactional
    public void leaveRoom(String roomId, Long userId) {
        RoomParticipants participants = roomParticipantsRepository.findByRoomIdAndUserId(roomId, userId)
                .orElseThrow(() -> new IllegalArgumentException("해당 회의실에 참석자가 없습니다."));

        participants.setActive(false);
        participants.setLeftAt(LocalDateTime.now());
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

}
