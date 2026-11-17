package com.connectrtc.backend.room;

import org.springframework.data.jpa.repository.JpaRepository;

public interface RoomParticipantsRepository extends JpaRepository<RoomParticipants, Long> {

}
