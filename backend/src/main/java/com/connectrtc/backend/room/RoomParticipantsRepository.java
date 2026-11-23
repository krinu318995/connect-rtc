package com.connectrtc.backend.room;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomParticipantsRepository extends JpaRepository<RoomParticipants, Long> {

    Optional<RoomParticipants> findByRoomIdAndUserId(String roomId, Long userId);

    List<RoomParticipants> findAllByRoomIdAndIsActiveTrue(String roomId);

    Long countByRoomIdAndIsActiveTrue(String roomId);
}
