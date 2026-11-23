package com.connectrtc.backend.room;

import java.time.LocalDateTime;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

public class RoomDto {

    @Getter
    @NoArgsConstructor
    public static class CreateRequest {

        @NotBlank(message = "방 제목을 입력해 주세요.")
        private String title;

        private Room.RoomType roomType;

        @Min(value = 1)
        @Max(value = 50, message = "최대 인원은 50명 입니다.")
        private Integer maxParticipants;

    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {

        private String roomId;
        private String title;
        private Room.RoomType roomType;
        private Long hostId;
        private int maxParticipants;
        private Long currentParticipants;
        private Room.RoomStatus status;
        private LocalDateTime createdAt;

        public static Response from(Room room, Long currentParticipants) {
            return Response.builder()
                    .roomId(room.getRoomId())
                    .title(room.getTitle())
                    .roomType(room.getRoomType())
                    .hostId(room.getHostId())
                    .maxParticipants(room.getMaxParticipants())
                    .currentParticipants(currentParticipants)
                    .status(room.getStatus())
                    .createdAt(room.getCreatedAt())
                    .build();
        }

    }

}
