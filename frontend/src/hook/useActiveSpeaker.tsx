import { useEffect, useState } from "react";
import type { ParticipantItem } from "../types/room";

export function useActiveSpeaker(participants: ParticipantItem[]) {
  const [activeSpeakerId, setActiveSpeakerId] = useState<number | null>(null);
  const [speakingUsers, setSpeakingUsers] = useState<Set<number>>(new Set());

  useEffect(() => {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;

    if (!AudioCtx) {
      return;
    }

    const audioContext = new AudioCtx();
    const analysers = new Map<
      number,
      { analyser: AnalyserNode; dataArray: Uint8Array<ArrayBuffer> }
    >();

    participants.forEach((p) => {
      if (!p.stream) {
        return;
      }

      const audioTracks = p.stream.getAudioTracks();
      if (audioTracks.length === 0 || !audioTracks[0].enabled) {
        return;
      }

      try {
        const source = audioContext.createMediaStreamSource(p.stream);
        const analyser = audioContext.createAnalyser();

        analyser.fftSize = 256;
        source.connect(analyser);
        analysers.set(p.userId, {
          analyser,
          dataArray: new Uint8Array(analyser.frequencyBinCount),
        });
      } catch {}
    }); //participants

    const interval = setInterval(() => {
      const currentSpeaking = new Set<number>();
      let maxVolume = 22;
      let loudestUser: number | null = null;

      analysers.forEach(({ analyser, dataArray }, userId) => {
        analyser.getByteFrequencyData(dataArray);

        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }

        const avg = sum / dataArray.length;

        if (avg > 22) {
          currentSpeaking.add(userId);
          if (avg > maxVolume) {
            maxVolume = avg;
            loudestUser = userId;
          }
        }

        setSpeakingUsers(currentSpeaking);
        if (loudestUser !== null) {
          setActiveSpeakerId(loudestUser);
        }
      }, 250);

      return () => {
        clearInterval(interval);
        audioContext.close().catch(() => {});
      };
    }); //interval
  }, [participants]); //useEffect

  return { activeSpeakerId, speakingUsers };
}
