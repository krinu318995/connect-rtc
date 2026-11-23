import { Client } from "@stomp/stompjs";
import { useEffect, useState, useRef } from "react";
import SockJS from "sockjs-client";
import type { SignalingMessage } from "../types/signaling";

//테스트용
const ICE_SERVERS: RTCConfiguration = {
  iceServers: [
    { urls: import.meta.env.VITE_STUN_SERVER_1 },
    { urls: import.meta.env.VITE_STUN_SERVER_2 }, //앞 서버 터지면 여기 연결
  ],
};

function getUserIdFromToken(token: string | null): number {
  if (!token) {
    return 0;
  }

  try {
    const payloadBase64 = token.split(".")[1];
    const decoded = JSON.parse(atob(payloadBase64));
    return Number(decoded.sub) || 0;
  } catch (err: any) {
    return 0;
  }
}

export function useWebRTC(roomId: string | undefined) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);

  const stompClientRef = useRef<Client | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const token = localStorage.getItem("accessToken");
  const myUserId =
    Number(localStorage.getItem("userId")) || getUserIdFromToken(token);

  const sendSignal = (
    message: Omit<SignalingMessage, "roomId" | "senderId">,
  ) => {
    if (
      !stompClientRef.current ||
      !stompClientRef.current.connected ||
      !roomId
    ) {
      return;
    }

    const payload: SignalingMessage = {
      ...message,
      roomId,
      senderId: myUserId,
    };

    stompClientRef.current.publish({
      destination: `pub/signal/${roomId}`,
      body: JSON.stringify(payload),
    });
  }; //sendSignal

  const createPeerConnection = (targetUserId: number) => {
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);
    // 내 로컬 미디어 트랙을 PeerConnection에 추가
    localStreamRef.current?.getTracks().forEach((track) => {
      if (localStreamRef.current) {
        pc.addTrack(track, localStreamRef.current);
      }
    });
    // 상대방 비디오/오디오 스트림 수신 시 remoteVideo에 연결
    pc.ontrack = (e) => {
      if (remoteVideoRef.current && e.streams[0]) {
        remoteVideoRef.current.srcObject = e.streams[0];
        setIsConnected(true);
      }
    };
    // ICE Candidate 발생 시 상대방에게 전송
    pc.onicecandidate = (e) => {
      if (e.candidate) {
        sendSignal({
          type: "ICE",
          receiverId: targetUserId,
          data: e.candidate,
        });
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }; //createPeerConnection

  useEffect(() => {
    if (!roomId || !token) {
      return;
    }

    let isMounted = true;

    const init = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        if (!isMounted) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = stream;
        if (!localVideoRef.current) {
          return;
        } else if (localStreamRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // 2. STOMP 클라이언트 설정 및 연결

        const client = new Client({
          webSocketFactory: () =>
            new SockJS(`${import.meta.env.VITE_API_BASE_URL}/ws-stomp`),
          connectHeaders: {
            Authorization: `Bearer ${token}`,
          },
          onConnect: () => {
            client.subscribe(`/sub/rooms/${roomId}`, async (frame) => {
              const signal: SignalingMessage = JSON.parse(frame.body);

              if (signal.senderId === myUserId) {
                return;
              }

              switch (signal.type) {
                case "JOIN": {
                  const pc = createPeerConnection(signal.senderId);
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  sendSignal({
                    type: "OFFER",
                    receiverId: signal.receiverId,
                    data: offer,
                  });
                  break;
                } //join

                case "OFFER": {
                  // OFFER를 받은 참가자는 ANSWER 생성 후 응답
                  const pc = createPeerConnection(signal.senderId);
                  await pc.setRemoteDescription(
                    new RTCSessionDescription(
                      signal.data as RTCSessionDescriptionInit,
                    ),
                  );

                  //answer 생성
                  const answer = await pc.createAnswer();
                  await pc.setLocalDescription(answer);
                  sendSignal({
                    type: "ANSWER",
                    receiverId: signal.receiverId,
                    data: answer,
                  });
                  break;
                } // offer

                case "ANSWER": {
                  if (peerConnectionRef.current) {
                    await peerConnectionRef.current.setRemoteDescription(
                      new RTCSessionDescription(
                        signal.data as RTCSessionDescriptionInit,
                      ),
                    );
                  }
                  break;
                } // answer

                case "ICE": {
                  if (peerConnectionRef.current && signal.data) {
                    await peerConnectionRef.current.addIceCandidate(
                      new RTCIceCandidate(signal.data as RTCIceCandidateInit),
                    );
                  }
                  break;
                } //ice

                case "LEAVE": {
                  if (remoteVideoRef.current) {
                    remoteVideoRef.current.srcObject = null;
                  }
                  peerConnectionRef.current?.close();
                  peerConnectionRef.current = null;
                  setIsConnected(false);
                  break;
                }
              }
            });

            sendSignal({ type: "JOIN" });
          }, //onConnect
        }); //client
        client.activate();
        stompClientRef.current = client;
      } catch (err: any) {
        console.error("미디어 장치 접근 또는 시그널링 초기화 실패:", err);
        alert("카메라 또는 마이크 권한을 허용해 주세요.");
      } //catch
    }; //init
    init();

    return () => {
      isMounted = false;
      sendSignal({
        type: "LEAVE",
      });
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      peerConnectionRef.current?.close();
      stompClientRef.current?.deactivate();
    };
  }, [roomId]); //useEffect

  const toggleMute = () => {
    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setIsMuted(!audioTrack.enabled);
    }
  }; //toggleMute

  const toggleCam = () => {
    const camTrack = localStreamRef.current?.getVideoTracks()[0];
    if (camTrack) {
      camTrack.enabled = !camTrack.enabled;
      setIsCamOff(!camTrack.enabled);
    }
  }; //toggleCam

  return {
    localVideoRef,
    remoteVideoRef,
    isMuted,
    isCamOff,
    isConnected,
    toggleCam,
    toggleMute,
  };
} // useWebRTC
