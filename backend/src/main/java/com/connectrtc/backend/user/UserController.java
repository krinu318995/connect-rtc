package com.connectrtc.backend.user;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.GetMapping;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<UserDto.Response> signUp(@RequestBody UserDto.SignupRequest request) {
        UserDto.Response response = userService.signUp(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("login")
    public ResponseEntity<UserDto.Response> login(@RequestBody UserDto.LoginRequest request) {

        UserDto.Response response = userService.login(request);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/user")
    public ResponseEntity<UserDto.Response> getUserInfo(@AuthenticationPrincipal Long userId) {
        UserDto.Response response = userService.getUserInfo(userId);
        return ResponseEntity.ok(response);
    }

}
