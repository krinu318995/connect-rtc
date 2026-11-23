package com.connectrtc.backend.room;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomRepository extends JpaRepository<Room, String> {

    List<Room> findAllByStatusOrderByCreatedAtDesc(Room.RoomStatus status);

}
