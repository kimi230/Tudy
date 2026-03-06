import { useRef } from 'react';
import { useAuth } from './useAuth';

/** Shared hook: keeps a ref to the current user ID, always up-to-date. */
export function useUserIdRef() {
  const auth = useAuth();
  const userId = auth.user?.id;
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  return { auth, userId, userIdRef };
}
