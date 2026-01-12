import React, { createContext, useContext, ReactNode } from "react";
import { useVisitTracking } from "@/hooks/useVisitTracking";

interface TrackingContextType {
  sessionId: string | null;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) {
    throw new Error("useTracking deve ser usado dentro de TrackingProvider");
  }
  return context;
};

interface TrackingProviderProps {
  children: ReactNode;
}

export const TrackingProvider: React.FC<TrackingProviderProps> = ({ children }) => {
  const { sessionId } = useVisitTracking();

  return (
    <TrackingContext.Provider value={{ sessionId }}>
      {children}
    </TrackingContext.Provider>
  );
};
