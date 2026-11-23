package com.connectrtc.backend.room;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping
    public ResponseEntity<RoomDto.Response> createRoom(@AuthenticationPrincipal Long userId,
            @Valid @RequestBody RoomDto.CreateRequest request) {
        return ResponseEntity.ok(roomService.createRoom(userId, request));
    }

    @GetMapping
    public ResponseEntity<List<RoomDto.Response>> getOpenRooms() {
        return ResponseEntity.ok(roomService.getOpenRooms());
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<RoomDto.Response> getRoomDetail(@PathVariable String roomId) {
        return ResponseEntity.ok(roomService.getRoomDetail(roomId));
    }

    @PostMapping("/{roomId}/join")
    public ResponseEntity<RoomDto.Response> joinRoom(@AuthenticationPrincipal Long userId,
            @PathVariable String roomId) {

        return ResponseEntity.ok(roomService.joinRoom(roomId, userId));
    }

    @PostMapping("/{roomId}/leave")
    public ResponseEntity<RoomDto.Response> leaveRoom(@AuthenticationPrincipal Long userId,
            @PathVariable String roomId) {

        roomService.leaveRoom(roomId, userId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("{roomId}")
    public ResponseEntity<Void> closeRoom(@PathVariable String roomId,
            @AuthenticationPrincipal Long userId) {
        roomService.deleteRoom(roomId, userId);
        return ResponseEntity.ok().build();
    }

}
