# ConnectRTC — WebRTC 기반 실시간 화상회의 서비스

> Spring Boot(WebSocket/STOMP) 시그널링 서버와 React(TypeScript)를 결합하여 구현한 실시간 P2P 화상회의 웹 애플리케이션입니다.

- **개발 기간:** 2026.11 ~ 2026.11 (1인 개발)
- **GitHub:** [리포지토리 링크]
- **시연 영상 / 배포 링크:** [링크 또는 GIF 첨부]

---

## 1. 프로젝트 개요 및 기획 의도
- HTTP 기반 REST API와 실시간 양방향 통신(WebSocket/STOMP), 브라우저 간 직접 미디어 스트림을 교환하는 WebRTC의 동작 원리를 통합적으로 설계하고 구현하기 위해 진행한 프로젝트입니다.
- 중앙 미디어 서버 부하를 줄이는 P2P(Mesh) 구조를 채택하고, 시그널링 과정에서의 비인가 접근을 차단하기 위해 HTTP와 WebSocket 계층 모두에 JWT 인증을 적용했습니다.

---

## 2. 기술 스택

### Backend
- **Language & Framework:** Java 21, Spring Boot 4.1.2
- **Security & Auth:** Spring Security, JWT (jjwt)
- **Real-time Signaling:** Spring WebSocket, STOMP, SockJS
- **Database & ORM:** MySQL, Spring Data JPA, Jasypt

### Frontend
- **Language & Framework:** TypeScript, React 19, Vite
- **Networking & Media:** Axios, `@stomp/stompjs`, `sockjs-client`, WebRTC API
- **Routing & Styling:** React Router, CSS (컴포넌트별 스타일시트 분리)

---

## 3. 시스템 아키텍처 및 핵심 동작 흐름

### 3-1. 이중 계층 JWT 인증 구조
- **HTTP 요청 (`JwtAuthenticationFilter`):** 회의실 생성·조회·입장·퇴장 API 요청 시 `Authorization: Bearer` 헤더를 검증합니다.
- **WebSocket 연결 (`StompHandler`):** 핸드셰이크(`/ws-stomp/**`) 이후 STOMP `CONNECT` 프레임이 인바운드 채널에 진입하는 시점에 네이티브 헤더의 JWT 유효성을 검증하여 비인가 사용자의 시그널링 채널 구독을 차단합니다.
- **클라이언트 라우트 가드 (`PrivateRoute` / `PublicRoute`):** 토큰 유무에 따른 경로 접근 제어를 적용해 미로그인 상태 및 로그아웃 직후 브라우저 뒤로가기를 통한 대기실·회의실 진입을 차단합니다.

### 3-2. WebRTC 시그널링 및 P2P 연결 흐름

```mermaid
sequenceDiagram
    autonumber
    actor UserA as 참여자 A (기존 입장)
    participant Server as Spring Boot (STOMP & StompHandler)
    actor UserB as 참여자 B (신규 입장)

    Note over UserA, Server: 1. 참여자 A WebSocket 연결 및 방 구독
    UserA->>Server: STOMP CONNECT (Authorization: Bearer JWT)
    Server->>Server: StompHandler: JWT 유효성 검증
    Server-->>UserA: STOMP CONNECTED
    UserA->>Server: SUBSCRIBE /sub/rooms/{roomId}

    Note over UserB, Server: 2. 참여자 B 입장 및 JOIN 신호 발행
    UserB->>Server: STOMP CONNECT (Authorization: Bearer JWT)
    Server->>Server: StompHandler: JWT 유효성 검증
    Server-->>UserB: STOMP CONNECTED
    UserB->>Server: SUBSCRIBE /sub/rooms/{roomId}
    UserB->>Server: PUBLISH /pub/signal/{roomId} (type: JOIN)
    Server-->>UserA: 브로드캐스트 (type: JOIN, senderId: UserB)

    Note over UserA, UserB: 3. SDP Offer / Answer 미디어 협상
    UserA->>UserA: RTCPeerConnection 생성 & createOffer()
    UserA->>UserA: setLocalDescription(Offer)
    UserA->>Server: PUBLISH /pub/signal/{roomId} (type: OFFER)
    Server-->>UserB: 전달 (type: OFFER)

    UserB->>UserB: RTCPeerConnection 생성 & setRemoteDescription(Offer)
    UserB->>UserB: createAnswer() & setLocalDescription(Answer)
    UserB->>Server: PUBLISH /pub/signal/{roomId} (type: ANSWER)
    Server-->>UserA: 전달 (type: ANSWER)
    UserA->>UserA: setRemoteDescription(Answer)

    Note over UserA, UserB: 4. ICE Candidate 교환 및 P2P 개통
    par 비동기 네트워크 경로 탐색 (Trickle ICE)
        UserA->>Server: PUBLISH (type: ICE Candidate)
        Server-->>UserB: 전달 (type: ICE) → addIceCandidate()
    and
        UserB->>Server: PUBLISH (type: ICE Candidate)
        Server-->>UserA: 전달 (type: ICE) → addIceCandidate()
    end

    UserA<==>>UserB: WebRTC P2P 직접 미디어 스트림 송수신 (ontrack)
