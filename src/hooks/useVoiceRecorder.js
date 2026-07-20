import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Press-and-hold voice recorder. Records via MediaRecorder (WebM/Opus),
 * caps at 2 minutes, and exposes { start, stop, cancel, recording,
 * durationMs, blob }. `stop` returns { blob, durationMs } or null on cancel.
 */
export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [durationMs, setDurationMs] = useState(0);
  const [error, setError] = useState(null);

  const mediaRef = useRef(null);
  const chunksRef = useRef([]);
  const startedAtRef = useRef(0);
  const timerRef = useRef(null);
  const cancelledRef = useRef(false);
  const stopPromiseRef = useRef(null);

  const tick = () => {
    setDurationMs(Date.now() - startedAtRef.current);
  };

  const cleanup = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRef.current) {
      try {
        mediaRef.current.stream.getTracks().forEach((t) => t.stop());
      } catch {}
      mediaRef.current = null;
    }
    chunksRef.current = [];
  }, []);

  const start = useCallback(async () => {
    setError(null);
    cancelledRef.current = false;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime =
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      mediaRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mime });
        const dur = Date.now() - startedAtRef.current;
        const resolve = stopPromiseRef.current;
        stopPromiseRef.current = null;
        cleanup();
        setRecording(false);
        setDurationMs(0);
        if (resolve) resolve(cancelledRef.current ? null : { blob, durationMs: dur });
      };
      rec.start();
      startedAtRef.current = Date.now();
      setRecording(true);
      setDurationMs(0);
      timerRef.current = setInterval(() => {
        tick();
        if (Date.now() - startedAtRef.current > 120_000) {
          rec.stop();
        }
      }, 200);
    } catch (e) {
      setError(e.message || "Microphone unavailable");
      setRecording(false);
    }
  }, [cleanup]);

  const stop = useCallback(() => {
    if (!mediaRef.current) return Promise.resolve(null);
    cancelledRef.current = false;
    return new Promise((resolve) => {
      stopPromiseRef.current = resolve;
      try {
        mediaRef.current.stop();
      } catch {
        resolve(null);
      }
    });
  }, []);

  const cancel = useCallback(() => {
    if (!mediaRef.current) return;
    cancelledRef.current = true;
    try {
      mediaRef.current.stop();
    } catch {}
  }, []);

  useEffect(() => cleanup, [cleanup]);

  return { recording, durationMs, error, start, stop, cancel };
}
