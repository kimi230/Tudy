import { Link } from 'react-router-dom';
import type { Category } from '../../types';

interface Props {
  categories: Category[];
  activeCategoryId?: string;
}

const iconMap: Record<string, string> = {
  mic: '🎙',
  briefcase: '💼',
  chat: '💬',
  graduation: '🎓',
  plane: '✈️',
  code: '💻',
  newspaper: '📰',
  palette: '🎨',
  flask: '🔬',
  fire: '🔥',
};

export default function Sidebar({ categories, activeCategoryId }: Props) {
  return (
    <aside className="w-56 shrink-0 hidden lg:block">
      <nav className="sticky top-20 space-y-1">
        <h3 className="px-3 mb-2 text-xs font-semibold text-gray-400 uppercase tracking-wider">카테고리</h3>
        {categories.map((cat) => (
          <Link
            key={cat.id}
            to={`/category/${cat.id}`}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
              activeCategoryId === cat.id
                ? 'bg-indigo-50 text-indigo-700 font-medium'
                : 'text-gray-600 hover:bg-gray-50'
            }`}
          >
            <span>{iconMap[cat.icon] || '📁'}</span>
            <span>{cat.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
