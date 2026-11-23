package com.connectrtc.backend.room;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table(name = "rooms")
@Getter
@Setter
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Entity
public class Room {

    @Id
    @Column(name = "room_id", length = 36, nullable = false)
    private String roomId;

    @Column(name = "title", length = 100, nullable = false)
    private String title;

    @Column(name = "room_type", length = 20, nullable = false)
    @Builder.Default
    @Enumerated(EnumType.STRING)
    private RoomType roomType = RoomType.GROUP;

    @Column(name = "host_id", nullable = false)
    private Long hostId;

    @Column(name = "max_participants", nullable = false)
    @Builder.Default
    private int maxParticipants = 10;

    @Column(name = "status", length = 20, nullable = false)
    @Builder.Default
    @Enumerated(EnumType.STRING)
    private RoomStatus status = RoomStatus.OPEN;

    @Column(name = "last_message_at", insertable = false)
    private LocalDateTime lastMessageAt;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    public void updateLastMessageAt(LocalDateTime time) {
        this.lastMessageAt = time;
    }

    public enum RoomType {
        GROUP, DIRECT
    }

    public enum RoomStatus {
        OPEN, CLOSED
    }
}
