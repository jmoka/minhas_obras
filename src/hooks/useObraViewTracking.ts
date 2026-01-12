import { useEffect, useRef, useState } from "react";
import { recordObraView, updateObraViewDuration, getObraViewCount } from "@/integrations/supabase/api";
import { getIpAndGeolocation } from "@/utils/geolocation";

const SESSION_ID_KEY = "minhas_artes_session_id";
const UPDATE_INTERVAL = 30000;

export const useObraViewTracking = (obraId: string | undefined) => {
  const [viewCount, setViewCount] = useState<number>(0);
  const [isTracking, setIsTracking] = useState<boolean>(false);
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const viewIdRef = useRef<string | null>(null);

  const getSessionId = (): string | null => {
    return sessionStorage.getItem(SESSION_ID_KEY);
  };

  const updateDuration = async () => {
    if (!viewIdRef.current) return;

    const currentTime = Date.now();
    const durationSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);

    await updateObraViewDuration(viewIdRef.current, durationSeconds);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      updateDuration();
    }
  };

  const initializeTracking = async () => {
    if (!obraId) return;

    const sessionId = getSessionId();
    if (!sessionId) {
      console.warn("Session ID não encontrado. Rastreamento de obra não iniciado.");
      return;
    }

    const geoData = await getIpAndGeolocation();
    const viewId = await recordObraView(obraId, sessionId, geoData);

    if (viewId) {
      viewIdRef.current = viewId;
      setIsTracking(true);

      intervalRef.current = setInterval(updateDuration, UPDATE_INTERVAL);

      document.addEventListener("visibilitychange", handleVisibilityChange);
      window.addEventListener("beforeunload", updateDuration);
    }

    const count = await getObraViewCount(obraId);
    setViewCount(count);
  };

  useEffect(() => {
    initializeTracking();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", updateDuration);
      
      updateDuration();
    };
  }, [obraId]);

  return {
    viewCount,
    isTracking,
  };
};
