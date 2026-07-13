import { useEffect } from 'react';
import { isRouteErrorResponse, useRouteError } from 'react-router-dom';

function getReturnPath() {
  try {
    return localStorage.getItem('token') ? '/dashboard-v2' : '/login';
  } catch {
    return '/login';
  }
}

export function AppRouteError() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;
  const returnPath = getReturnPath();

  useEffect(() => {
    console.error('Route rendering failed', error);
  }, [error]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F0F0F0] px-4 py-8">
      <section
        role="alert"
        className="card-section w-full max-w-[680px] px-5 py-8 text-center shadow-soft sm:px-8 sm:py-10"
      >
        <h1 className="dashboard-v2-page-title">
          {isNotFound ? 'Страница не найдена' : 'Не удалось открыть страницу'}
        </h1>
        <p className="dashboard-v2-text mx-auto mt-4 max-w-[520px] text-[#6F7895]">
          {isNotFound
            ? 'Проверьте адрес страницы или вернитесь в личный кабинет.'
            : 'Возникла непредвиденная ошибка. Обновите страницу или вернитесь в личный кабинет.'}
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <a
            href={returnPath}
            className="btn inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[var(--color-blue-dark)] px-5 font-semibold text-white"
          >
            Вернуться в личный кабинет
          </a>
          <button
            type="button"
            className="btn inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[var(--color-blue-dark)] px-5 font-semibold text-[var(--color-blue-dark)]"
            onClick={() => window.location.reload()}
          >
            Попробовать снова
          </button>
        </div>
      </section>
    </main>
  );
}
