package com.connectrtc.backend.user;

import org.springframework.boot.webmvc.autoconfigure.WebMvcProperties.Apiversion.Use;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

public class UserDto {

    @Getter
    @NoArgsConstructor
    public static class SignupRequest {

        private String email;
        private String password;
        private String nickName;

    }

    @Getter
    @NoArgsConstructor
    public static class LoginRequest {
        private String email;
        private String password;

    }

    @Getter
    @AllArgsConstructor
    @Builder
    public static class Response {

        private Long userId;
        private String email;
        private String nickName;
        private String accessToken;

        // 회원 정보만 회원가입, 내 정보 조회
        public static Response from(User user) {
            return Response.builder()
                    .userId(user.getId())
                    .email(user.getEmail())
                    .nickName(user.getNickname())
                    .build();
        }

        // 인증토큰도같이 -> 로그인
        public static Response of(User user, String accessToken) {
            return Response.builder()
                    .userId(user.getId())
                    .email(user.getEmail())
                    .nickName(user.getNickname())
                    .accessToken(accessToken).build();
        }

    }
}
