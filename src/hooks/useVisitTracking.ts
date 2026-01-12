import { useEffect, useRef } from "react";
import { recordSiteVisit, updateVisitDuration } from "@/integrations/supabase/api";
import { getIpAndGeolocation } from "@/utils/geolocation";

const SESSION_ID_KEY = "minhas_artes_session_id";
const UPDATE_INTERVAL = 30000;

export const useVisitTracking = () => {
  const startTimeRef = useRef<number>(Date.now());
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const isTrackingRef = useRef<boolean>(false);

  const getOrCreateSessionId = (): string => {
    let sessionId = sessionStorage.getItem(SESSION_ID_KEY);
    
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      sessionStorage.setItem(SESSION_ID_KEY, sessionId);
    }
    
    return sessionId;
  };

  const updateDuration = async () => {
    if (!sessionIdRef.current) return;

    const currentTime = Date.now();
    const durationSeconds = Math.floor((currentTime - startTimeRef.current) / 1000);

    await updateVisitDuration(sessionIdRef.current, durationSeconds);
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      updateDuration();
    }
  };

  const initializeTracking = async () => {
    if (isTrackingRef.current) return;

    const sessionId = getOrCreateSessionId();
    sessionIdRef.current = sessionId;

    const existingVisit = sessionStorage.getItem(`visit_recorded_${sessionId}`);
    
    if (!existingVisit) {
      // Executar geolocalização em background (não-bloqueante)
      // Isso evita que erros de geolocalização bloqueiem outras funcionalidades
      getIpAndGeolocation()
        .then(geoData => {
          return recordSiteVisit(sessionId, geoData);
        })
        .catch(error => {
          console.warn("Erro ao obter geolocalização, registrando visita sem geo:", error);
          // Fallback: registrar visita sem dados de geo
          return recordSiteVisit(sessionId, { ip: "unknown", country: null, city: null });
        })
        .finally(() => {
          sessionStorage.setItem(`visit_recorded_${sessionId}`, "true");
        });
    }

    isTrackingRef.current = true;

    intervalRef.current = setInterval(updateDuration, UPDATE_INTERVAL);

    document.addEventListener("visibilitychange", handleVisibilityChange);

    window.addEventListener("beforeunload", updateDuration);
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
  }, []);

  return {
    sessionId: sessionIdRef.current,
  };
};
