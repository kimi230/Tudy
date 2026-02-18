interface Props {
  value: number; // 0-100
  label?: string;
  color?: string;
  className?: string;
}

export default function ProgressBar({ value, label, color = 'bg-indigo-600', className = '' }: Props) {
  return (
    <div className={className}>
      {label && (
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="text-gray-500">{Math.round(value)}%</span>
        </div>
      )}
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${color} h-2 rounded-full transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        />
      </div>
    </div>
  );
}
