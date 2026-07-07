import { useState, useCallback } from "react";

interface UseConfirmDeleteReturn<T> {
  /** The item pending deletion, or null if dialog is closed */
  pendingDelete: T | null;
  /** Call this to open the confirm dialog for an item */
  requestDelete: (item: T) => void;
  /** Call this to cancel — closes dialog without deleting */
  cancelDelete: () => void;
  /** Call this when the user confirms — runs the handler then closes */
  confirmDelete: () => void;
}

/**
 * Manages confirm-before-delete state.
 *
 * Usage:
 *   const { pendingDelete, requestDelete, cancelDelete, confirmDelete } =
 *     useConfirmDelete<MyItem>((item) => deleteMutation.mutate(item.id));
 */
export function useConfirmDelete<T>(
  onConfirm: (item: T) => void
): UseConfirmDeleteReturn<T> {
  const [pendingDelete, setPendingDelete] = useState<T | null>(null);

  const requestDelete = useCallback((item: T) => setPendingDelete(item), []);
  const cancelDelete  = useCallback(() => setPendingDelete(null), []);
  const confirmDelete = useCallback(() => {
    if (pendingDelete !== null) {
      onConfirm(pendingDelete);
      setPendingDelete(null);
    }
  }, [pendingDelete, onConfirm]);

  return { pendingDelete, requestDelete, cancelDelete, confirmDelete };
}
