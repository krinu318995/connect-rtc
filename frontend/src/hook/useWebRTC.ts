import { Client } from "@stomp/stompjs";
import { useEffect, useState, useRef, useCallback } from "react";
import SockJS from "sockjs-client";
import type { SignalingMessage, ChatMessage } from "../types/signaling";

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

  //내 컴퓨터의 카메라와 마이크에서 직접 추출한 내 스트림
  const localStreamRef = useRef<MediaStream | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const stompClientRef = useRef<Client | null>(null);

  // const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  // 다인원 peerConnection Map
  const peerConnectionsRef = useRef<Map<number, RTCPeerConnection>>(new Map());
  //원격 참가자 스트림 map(key : 상대방 userid)
  //다른 참가자들(최대 19명)로부터 네트워크를 통해 받아오는 원격 스트림들
  const [remoteStreams, setRemoteStreams] = useState<Map<number, MediaStream>>(
    new Map(),
  );
  const [chatMessage, setChatMessage] = useState<ChatMessage[]>([]);

  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [isConnected, setIsConnected] = useState(false);

  const token = localStorage.getItem("accessToken");
  const myUserId =
    Number(localStorage.getItem("userId")) || getUserIdFromToken(token);

  const sendSignal = useCallback(
    (message: Omit<SignalingMessage, "roomId" | "senderId">) => {
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
        destination: `/pub/signal/${roomId}`,
        body: JSON.stringify(payload),
      });
    },
    [roomId, myUserId],
  ); //sendSignal

  //채팅 메시지 전송(/pub/chat/{roomId})
  const sendChatMessage = useCallback(
    (content: string) => {
      if (
        !stompClientRef.current ||
        !stompClientRef.current.connected ||
        !roomId ||
        !content.trim()
      ) {
        return;
      }

      const payload = {
        senderId: myUserId,
        messageType: "TEXT",
        content: content.trim(),
      };

      stompClientRef.current.publish({
        destination: `/pub/chat/${roomId}`,
        body: JSON.stringify(payload),
      });
    },
    [roomId, myUserId],
  );

  //참가자 연결 및 스트림 제거 헬퍼
  const removeParticipant = useCallback((targetUserId: number) => {
    const existingPc = peerConnectionsRef.current.get(targetUserId);
    if (existingPc) {
      existingPc.close();
      peerConnectionsRef.current.delete(targetUserId);
    }

    setRemoteStreams((prev) => {
      if (!prev.has(targetUserId)) {
        return prev;
      }

      const next = new Map(prev);
      next.delete(targetUserId);
      return next;
    });
  }, []);

  //targetUserId와의 개별 peerConnection 생성
  const createPeerConnection = useCallback(
    (targetUserId: number) => {
      const existingPc = peerConnectionsRef.current.get(targetUserId);

      if (existingPc) {
        existingPc.close();
      }

      // if (peerConnectionRef.current) {
      //   peerConnectionRef.current.close();
      // }

      const pc = new RTCPeerConnection(ICE_SERVERS);
      // 내 로컬 미디어 트랙을 PeerConnection에 추가
      localStreamRef.current?.getTracks().forEach((track) => {
        if (localStreamRef.current) {
          pc.addTrack(track, localStreamRef.current);
        }
      });

      // 상대방 비디오/오디오 스트림 수신 시 remoteVideo에 연결

      pc.ontrack = (e) => {
        if (e.streams[0]) {
          setRemoteStreams((prev) => {
            const next = new Map(prev);
            next.set(targetUserId, e.streams[0]);
            return next;
          });
        }
      };
      // pc.ontrack = (e) => {
      //   if (remoteVideoRef.current && e.streams[0]) {
      //     remoteVideoRef.current.srcObject = e.streams[0];
      //     setIsConnected(true);
      //   }
      // };
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

      //상대방 비정상 단절 감지 시 해당 피어 정리
      pc.oniceconnectionstatechange = () => {
        const state = pc.iceConnectionState;
        if (
          state === "disconnected" ||
          state === "failed" ||
          state === "closed"
        ) {
          removeParticipant(targetUserId);
        }
      };

      peerConnectionsRef.current.set(targetUserId, pc);
      return pc;
    },
    [sendSignal, removeParticipant],
  ); //createPeerConnection

  useEffect(() => {
    if (!roomId || !token) {
      return;
    }

    let isMounted = true;
    let isCleandUp = false;

    const cleanupSession = () => {
      if (isCleandUp === true) {
        return;
      }
      isCleandUp = true;

      sendSignal({
        type: "LEAVE",
      });
      // 내 카메라·마이크 하드웨어 점유 즉시 해제, 실제로 카메라와 마이크를 종료하는 역할
      localStreamRef.current?.getTracks().forEach((track) => {
        track.enabled = false;
        track.stop();
      });

      //메모리 참조 해제
      localStreamRef.current = null;
      setLocalStream(null);
      //송출 종료
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = null;
      }
      //리액트의 상태만 변경
      setIsCamOff(true);
      setIsMuted(true);

      peerConnectionsRef.current?.forEach((pc) => pc.close());
      peerConnectionsRef.current.clear();
      setRemoteStreams(new Map());

      stompClientRef.current?.deactivate();
    }; //cleanupSession

    //방에 들어올 때 브라우저에 "창 닫힐 때 감시 시작해!"라고 등록(add)
    window.addEventListener("beforeunload", cleanupSession);

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

        // localStreamRef.current = stream;
        // if (!localVideoRef.current) {
        //   return;
        // } else if (localStreamRef.current) {
        //   localVideoRef.current.srcObject = stream;
        // }
        localStreamRef.current = stream;
        setLocalStream(stream);
        setIsCamOff(false);
        setIsMuted(false);
        // STOMP 클라이언트 설정 및 연결

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
              // 1:1 대상 지정 메시지(OFFER, ANSWER, ICE)는 수신자가 본인일 때만 처리
              if (
                signal.receiverId !== undefined &&
                signal.receiverId !== null &&
                signal.receiverId != myUserId
              ) {
                return;
              }

              switch (signal.type) {
                case "JOIN": {
                  const pc = createPeerConnection(signal.senderId);
                  const offer = await pc.createOffer();
                  await pc.setLocalDescription(offer);
                  sendSignal({
                    type: "OFFER",
                    receiverId: signal.senderId,
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
                    receiverId: signal.senderId,
                    data: answer,
                  });
                  break;
                } // offer

                case "ANSWER": {
                  const pc = peerConnectionsRef.current.get(signal.senderId);

                  if (pc) {
                    await pc.setRemoteDescription(
                      new RTCSessionDescription(
                        signal.data as RTCSessionDescription,
                      ),
                    );
                  }
                  // if (peerConnectionRef.current) {
                  //   await peerConnectionRef.current.setRemoteDescription(
                  //     new RTCSessionDescription(
                  //       signal.data as RTCSessionDescriptionInit,
                  //     ),
                  //   );
                  // }
                  break;
                } // answer

                case "ICE": {
                  const pc = peerConnectionsRef.current.get(signal.senderId);
                  if (pc && signal.data) {
                    await pc.addIceCandidate(
                      new RTCIceCandidate(signal.data as RTCIceCandidateInit),
                    );
                  }
                  // if (peerConnectionRef.current && signal.data) {
                  //   await peerConnectionRef.current.addIceCandidate(
                  //     new RTCIceCandidate(signal.data as RTCIceCandidateInit),
                  //   );
                  // }
                  break;
                } //ice

                case "LEAVE": {
                  // if (remoteVideoRef.current) {
                  //   remoteVideoRef.current.srcObject = null;
                  // }
                  // peerConnectionRef.current?.close();
                  // peerConnectionRef.current = null;

                  removeParticipant(signal.senderId);
                  setIsConnected(false);
                  break;
                }
              }
            });

            client.subscribe(`/sub/chat/${roomId}`, (frame) => {
              const newMsg: ChatMessage = JSON.parse(frame.body);
              setChatMessage((prev) => [...prev, newMsg]);
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
      //브라우저를 닫을 때, "아까 등록했던 감시 이제 꺼!"라고 삭제(remove)
      window.removeEventListener("beforeunload", cleanupSession);
      //회의실 나갈 때
      cleanupSession();
    };
  }, [
    roomId,
    token,
    myUserId,
    createPeerConnection,
    removeParticipant,
    sendSignal,
  ]); //useEffect

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
    myUserId,
    localVideoRef,
    localStreamRef,
    remoteVideoRef,
    localStream,
    remoteStreams,
    chatMessage,
    setChatMessage,
    sendChatMessage,
    isMuted,
    isCamOff,
    isConnected: remoteStreams.size > 0,
    toggleCam,
    toggleMute,
  };
} // useWebRTC
