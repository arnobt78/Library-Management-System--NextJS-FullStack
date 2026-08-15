/**
 * Syncs BookForm RHF validity to AdminBookFormShell toolbar submit
 * (toolbar sits outside FormProvider; uses form= id).
 * Parent: REQ-0033 disable CTAs until valid
 */
"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type GateState = {
  canSubmit: boolean;
  isPending: boolean;
};

type GateContextValue = GateState & {
  setGate: (next: Partial<GateState>) => void;
};

const BookAdminFormGateContext = createContext<GateContextValue | null>(null);

export function BookAdminFormGateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [state, setState] = useState<GateState>({
    canSubmit: false,
    isPending: false,
  });

  const setGate = useCallback((next: Partial<GateState>) => {
    setState((prev) => ({ ...prev, ...next }));
  }, []);

  const value = useMemo(
    () => ({ ...state, setGate }),
    [state, setGate],
  );

  return (
    <BookAdminFormGateContext.Provider value={value}>
      {children}
    </BookAdminFormGateContext.Provider>
  );
}

/** No-op setters when BookForm is rendered outside the shell (tests). */
export function useBookAdminFormGate(): GateContextValue {
  const ctx = useContext(BookAdminFormGateContext);
  if (ctx) return ctx;
  return {
    canSubmit: false,
    isPending: false,
    setGate: () => {},
  };
}
