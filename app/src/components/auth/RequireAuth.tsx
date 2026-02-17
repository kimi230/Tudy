import { type ReactNode } from 'react';
import { useAuth } from '../../hooks/useAuth';
import Spinner from '../common/Spinner';

interface Props {
  children: ReactNode;
  message?: string;
}

export default function RequireAuth({ children, message = '로그인이 필요합니다.' }: Props) {
  const auth = useAuth();

  if (auth.loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner />
      </div>
    );
  }

  if (!auth.user) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-600 mb-4">{message}</p>
        <button
          onClick={() => auth.signInWithGoogle()}
          className="px-6 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
        >
          Google로 로그인
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
