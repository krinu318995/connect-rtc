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

        private Room.AccessType accessType;

        private String password;

        @Min(value = 1)
        @Max(value = 20, message = "최대 인원은 20명 입니다.")
        private Integer maxParticipants;

    }

    @Getter
    @NoArgsConstructor
    public static class JoinRequest {
        private String password;
        private String inviteCode;

    }

    @Getter
    @Builder
    @AllArgsConstructor
    public static class Response {

        private String roomId;
        private String title;
        private Room.RoomType roomType;
        private Room.AccessType accessType;
        private String inviteCode;
        private boolean hasPassword;
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
                    .accessType(room.getAccessType())
                    .hasPassword(room.getAccessType() == Room.AccessType.PASSWORD)
                    .inviteCode(room.getInviteCode())
                    .hostId(room.getHostId())
                    .maxParticipants(room.getMaxParticipants())
                    .currentParticipants(currentParticipants)
                    .status(room.getStatus())
                    .createdAt(room.getCreatedAt())
                    .build();
        }

    }

}
