import { Link } from 'react-router-dom';

export default function SiteHeader() {
  return (
    <header className="bg-white header-shadow">
      <div className="container-fixed mx-auto py-[9px] flex items-center justify-between">
        {/* Логотип */}
        <div className="flex items-center gap-2">
          <Link to={'http://www.reestrpap.ru'}>
            <img src="/logo.svg" alt="ЦС ПАП" className="h-[64px] w-[146px]" />
          </Link>
        </div>

        {/* Навигация */}
        <nav className="flex gap-[20.3px] items-center">
          <a href="https://reestrpap.ru/about" className="nav-btn">
            О нас
          </a>

          <Link to="/registry" className="nav-btn">
            Реестр
          </Link>

          <a href="https://reestrpap.ru/certification" className="nav-btn">
            О сертификации
          </a>
          <a href="https://reestrpap.ru/pricing" className="nav-btn">
            Тарифы
          </a>
          <a href="https://reestrpap.ru/contacts" className="nav-btn">
            Контакты
          </a>
        </nav>

        {/* Иконки */}
        <div className="flex items-center gap-4">
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
      </div>
    </header>
  );
}
