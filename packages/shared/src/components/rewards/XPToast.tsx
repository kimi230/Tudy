import { useEffect, useState } from 'react';

interface XPToastProps {
  xp: number;
  label: string;
  onDone: () => void;
}

export default function XPToast({ xp, label, onDone }: XPToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Slide in
    requestAnimationFrame(() => setVisible(true));
    // Auto-dismiss after 2.5s
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 2500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed top-20 right-4 z-[100] transition-all duration-300 ${
        visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'
      }`}
    >
      <div className="bg-indigo-600 text-white px-4 py-3 rounded-xl shadow-lg flex items-center gap-3">
        <div className="w-8 h-8 bg-indigo-500 rounded-full flex items-center justify-center text-lg font-bold">
          +{xp}
        </div>
        <div>
          <p className="text-sm font-medium">XP 획득!</p>
          <p className="text-xs text-indigo-200">{label}</p>
        </div>
      </div>
    </div>
  );
}
