import { useLocation } from 'react-router-dom';
import { getDefaultLanguage } from '../../lib/supabaseSync';

const LANG_CONFIG = [
  { code: 'en', label: 'English', path: '/Tudy/' },
  { code: 'zh', label: '中文', path: '/Tudy/cn/' },
  { code: 'ja', label: '日本語', path: '/Tudy/jp/' },
];

interface Props {
  links: { to: string; label: string }[];
  onClose: () => void;
}

export default function MobileNav({ links, onClose }: Props) {
  const location = useLocation();
  const currentLang = getDefaultLanguage();

  return (
    <nav className="md:hidden border-t border-gray-200 bg-white pb-3">
      {links.map((link) => (
        <a
          key={link.to}
          href={`#${link.to}`}
          onClick={() => { window.scrollTo(0, 0); onClose(); }}
          className={`block px-4 py-3 text-sm font-medium ${
            location.pathname === link.to
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {link.label}
        </a>
      ))}

      {/* Language switcher */}
      <div className="border-t border-gray-200 mt-1 pt-2 px-4 flex items-center gap-2">
        {LANG_CONFIG.map((lang) =>
          lang.code === currentLang ? (
            <span
              key={lang.code}
              className="px-3 py-1.5 text-xs font-semibold bg-indigo-100 text-indigo-700 rounded-full"
            >
              {lang.label}
            </span>
          ) : (
            <a
              key={lang.code}
              href={lang.path}
              className="px-3 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-colors"
            >
              {lang.label}
            </a>
          )
        )}
      </div>
    </nav>
  );
}
