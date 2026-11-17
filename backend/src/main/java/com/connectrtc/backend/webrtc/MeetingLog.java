package com.connectrtc.backend.webrtc;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Table(name = "meeting_logs")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
public class MeetingLog {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "meeting_id")
    private Long meetingId;

    @Column(name = "room_id", length = 36, nullable = false)
    private String roomId;

    @Column(name = "started_by", nullable = false)
    private Long startedBy;

    @Column(name = "started_at", insertable = false, updatable = false)
    private LocalDateTime startedAt;

    // 화상 회의 종료 시 종료 시각을 기록해야 하므로 updatable 허용
    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    // 통화 종료 처리용 편의 메서드
    public void endMeeting(LocalDateTime endedAt) {
        this.endedAt = endedAt;
    }
}