import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: 'https://reestrpap.ru/about', label: 'О нас' },
  { to: '/registry', label: 'Реестр' },
  { href: 'https://reestrpap.ru/certification', label: 'Специалистам о сертификации' },
  { href: 'https://reestrpap.ru/pricing', label: 'Тарифы' },
  { href: 'https://reestrpap.ru/contacts', label: 'Контакты' },
];

export default function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);

  // Закрываем мобильное меню при переходе по ссылке
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="bg-white header-shadow relative">
      <div className="container-fixed mx-auto flex items-center justify-between px-2 py-[9px] md:px-0">
        {/* Телефон — только мобильная версия */}
        <Link to={'https://reestrpap.ru/chat'} className="md:hidden">
          <img src="/icons/phone.svg" alt="Телефон" className="h-[22px]" />
        </Link>

        {/* Логотип */}
        <div className="flex items-center gap-2">
          <Link to={'http://www.reestrpap.ru'}>
            <img src="/logo.svg" alt="ЦС ПАП" className="h-16 w-[146px]" />
          </Link>
        </div>

        {/* Навигация — только десктоп */}
        <nav className="hidden md:flex gap-[20.3px] items-center">
          {NAV_LINKS.map((link) =>
            link.to ? (
              <Link key={link.label} to={link.to} className="nav-btn">
                {link.label}
              </Link>
            ) : (
              <a key={link.label} href={link.href} className="nav-btn">
                {link.label}
              </a>
            ),
          )}
        </nav>

        {/* Иконки — только десктоп */}
        <div className="hidden md:flex items-center gap-4">
          <Link to={'https://reestrpap.ru/reestr'}>
            <img src="/icons/search.svg" alt="Поиск" className="h-[22px]" />
          </Link>
          <Link to={'https://reestrpap.ru/chat'}>
            <img src="/icons/chat.svg" alt="Чат" className="h-[22px]" />
          </Link>
          <Link to={'https://reestrpap.ru/chat'}>
            <img src="/icons/phone.svg" alt="Телефон" className="h-[22px]" />
          </Link>
          <Link to={'/login'}>
            <img src="/icons/user.svg" alt="Профиль" className="h-[22px]" />
          </Link>
        </div>

        {/* Бургер — только мобильная версия */}
        <button
          type="button"
          onClick={() => setMenuOpen((open) => !open)}
          className="md:hidden p-1"
          aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* Мобильное меню */}
      {menuOpen && (
        <div className="md:hidden border-t border-black/10 bg-white">
          <nav className="container-fixed mx-auto flex flex-col py-2">
            {NAV_LINKS.map((link) =>
              link.to ? (
                <Link
                  key={link.label}
                  to={link.to}
                  onClick={closeMenu}
                  className="nav-btn py-3 border-b border-black/5 last:border-b-0"
                >
                  {link.label}
                </Link>
              ) : (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={closeMenu}
                  className="nav-btn py-3 border-b border-black/5 last:border-b-0"
                >
                  {link.label}
                </a>
              ),
            )}
          </nav>

          <div className="container-fixed mx-auto flex items-center gap-6 py-3 border-t border-black/5">
            <Link to={'https://reestrpap.ru/reestr'} onClick={closeMenu}>
              <img src="/icons/search.svg" alt="Поиск" className="h-[22px]" />
            </Link>
            <Link to={'https://reestrpap.ru/chat'} onClick={closeMenu}>
              <img src="/icons/chat.svg" alt="Чат" className="h-[22px]" />
            </Link>
            <Link to={'/login'} onClick={closeMenu}>
              <img src="/icons/user.svg" alt="Профиль" className="h-[22px]" />
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
