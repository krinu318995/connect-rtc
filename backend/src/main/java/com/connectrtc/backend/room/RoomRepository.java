package com.connectrtc.backend.room;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, String> {

    List<Room> findAllByStatusOrderByCreatedAtDesc(Room.RoomStatus status);

    List<Room> findAllByStatusAndAccessTypeNotOrderByCreatedAtDesc(Room.RoomStatus status, Room.AccessType accessType);

    Optional<Room> findByInviteCode(String inviteCode);
}
