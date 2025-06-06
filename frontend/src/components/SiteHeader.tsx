import { Link } from 'react-router-dom';

export default function SiteHeader() {
  return (
    <header className="bg-white header-shadow">
      <div className="container-fixed mx-auto py-[9px] flex items-center justify-between">
        {/* Логотип */}
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="ЦС ПАП" className="h-[64px] w-[146px]" />
        </div>

        {/* Навигация */}
        <nav className="flex gap-[20.3px] items-center">
          <a href="https://основной-сайт.рф/o-nas" className="nav-btn">
            О нас
          </a>
          <a href="https://основной-сайт.рф/reestr" className="nav-btn">
            Реестр
          </a>
          <a href="https://основной-сайт.рф/sertifikatsiya" className="nav-btn">
            О сертификации
          </a>
          <a href="https://основной-сайт.рф/tarify" className="nav-btn">
            Тарифы
          </a>
          <a href="https://основной-сайт.рф/kontakty" className="nav-btn">
            Контакты
          </a>
        </nav>

        {/* Иконки */}
        <div className="flex items-center gap-4">
          <img src="/icons/search.svg" alt="Поиск" className="h-[22px]" />
          <img src="/icons/chat.svg" alt="Чат" className="h-[22px]" />
          <img src="/icons/phone.svg" alt="Телефон" className="h-[22px]" />
          <img src="/icons/user.svg" alt="Профиль" className="h-[22px]" />
        </div>
      </div>
    </header>
  );
}
