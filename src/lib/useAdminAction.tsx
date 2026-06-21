"use client";

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth";
import AdminPrompt from "@/components/AdminPrompt";

export function useAdminAction() {
  const { isAdmin } = useAuth();
  const [promptOpen, setPromptOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);

  const requireAdmin = useCallback(
    (action: () => void) => {
      if (isAdmin) {
        action();
      } else {
        setPendingAction(() => action);
        setPromptOpen(true);
      }
    },
    [isAdmin]
  );

  const adminGate = (
    <>
      {promptOpen && (
        <AdminPrompt
          onClose={() => {
            setPromptOpen(false);
            setPendingAction(null);
          }}
          onSuccess={() => {
            setPromptOpen(false);
            if (pendingAction) {
              pendingAction();
              setPendingAction(null);
            }
          }}
        />
      )}
    </>
  );

  return { requireAdmin, adminGate, isAdmin };
}
