import { Link, useLocation } from 'react-router-dom';

interface Props {
  links: { to: string; label: string }[];
  onClose: () => void;
}

export default function MobileNav({ links, onClose }: Props) {
  const location = useLocation();

  return (
    <nav className="md:hidden border-t border-gray-200 bg-white pb-3">
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          onClick={onClose}
          className={`block px-4 py-3 text-sm font-medium ${
            location.pathname === link.to
              ? 'bg-indigo-50 text-indigo-700'
              : 'text-gray-600 hover:bg-gray-50'
          }`}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
