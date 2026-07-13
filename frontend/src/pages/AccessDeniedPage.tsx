import { Link, useLocation } from 'react-router-dom';

type AccessDeniedState = {
  from?: string;
};

export default function AccessDeniedPage() {
  const location = useLocation();
  const from = (location.state as AccessDeniedState | null)?.from;

  return (
    <div className="mx-auto w-full max-w-[680px] px-2 py-8 sm:px-4">
      <section className="card-section px-5 py-7 text-center shadow-soft sm:px-8">
        <h1 className="dashboard-v2-page-title">Нет доступа к этой странице</h1>
        <p className="dashboard-v2-text mt-4 text-[#6F7895]">
          Для вашей роли или уровня квалификации этот раздел недоступен.
        </p>
        {from ? (
          <p className="dashboard-v2-caption mt-2 break-all text-[#8D96B5]">
            Запрошенный раздел: {from}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard-v2"
            replace
            className="btn inline-flex min-h-[40px] items-center justify-center rounded-[10px] bg-[var(--color-blue-dark)] px-5 font-semibold text-white"
          >
            В личный кабинет
          </Link>
          <Link
            to="/registry"
            className="btn inline-flex min-h-[40px] items-center justify-center rounded-[10px] border border-[var(--color-blue-dark)] px-5 font-semibold text-[var(--color-blue-dark)]"
          >
            Открыть реестр
          </Link>
        </div>
      </section>
    </div>
  );
}
