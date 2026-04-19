import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type AlertType = "alert" | "news";

export interface AppAlert {
  id: string;
  title: string;
  body: string;
  type: AlertType;
  createdAt: string;
  postedBy: string;
}

interface AlertContextType {
  alerts: AppAlert[];
  addAlert: (data: Pick<AppAlert, "title" | "body" | "type">, postedBy: string) => void;
  removeAlert: (id: string) => void;
  loading: boolean;
}

const AlertContext = createContext<AlertContextType | null>(null);

const STORAGE_KEY = "connectt_alerts_v1";

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<AppAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored) setAlerts(JSON.parse(stored));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const save = (updated: AppAlert[]) => {
    setAlerts(updated);
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated)).catch(() => {});
  };

  const addAlert = (data: Pick<AppAlert, "title" | "body" | "type">, postedBy: string) => {
    const newAlert: AppAlert = {
      ...data,
      id: "ALT" + Date.now().toString().slice(-6),
      createdAt: new Date().toISOString(),
      postedBy,
    };
    save([newAlert, ...alerts]);
  };

  const removeAlert = (id: string) => {
    save(alerts.filter((a) => a.id !== id));
  };

  return (
    <AlertContext.Provider value={{ alerts, addAlert, removeAlert, loading }}>
      {children}
    </AlertContext.Provider>
  );
}

export function useAlerts() {
  const ctx = useContext(AlertContext);
  if (!ctx) throw new Error("useAlerts must be used inside AlertProvider");
  return ctx;
}
