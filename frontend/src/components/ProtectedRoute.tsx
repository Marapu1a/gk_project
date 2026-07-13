import type { ReactNode } from 'react';
import { Navigate, Outlet, useLocation, useParams } from 'react-router-dom';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { buildLoginPath } from '@/features/auth/utils/authRedirect';
import { restartAuthentication } from '@/features/auth/utils/authSession';
import { canAccessRoute, type RouteAccess } from '@/features/auth/model/routeAccess';

type ProtectedRouteProps = {
  children?: ReactNode;
  access?: RouteAccess;
};

export function ProtectedRoute({ children, access = 'authenticated' }: ProtectedRouteProps) {
  const location = useLocation();
  const token = localStorage.getItem('token');
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  if (!token) {
    return <Navigate to={buildLoginPath(currentPath)} replace />;
  }

  return <AuthenticatedRoute access={access}>{children}</AuthenticatedRoute>;
}

function AuthenticatedRoute({ children, access }: ProtectedRouteProps & { access: RouteAccess }) {
  const location = useLocation();
  const { kind } = useParams();
  const { data: user, isLoading, isError, refetch } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="container-fixed px-2 py-6 sm:px-6">
        <p className="dashboard-v2-text text-blue-dark">Проверяем доступ...</p>
      </div>
    );
  }

  if (isError || !user) {
    return (
      <div className="container-fixed px-2 py-6 sm:px-6">
        <section className="card-section px-5 py-5 shadow-soft">
          <p className="dashboard-v2-text text-blue-dark">
            Не удалось проверить доступ. Проверьте соединение и попробуйте ещё раз.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => refetch()}
              className="btn min-h-[38px] rounded-[10px] bg-[var(--color-blue-dark)] px-4 font-semibold text-white"
            >
              Повторить
            </button>
            <button
              type="button"
              onClick={() =>
                restartAuthentication(
                  `${location.pathname}${location.search}${location.hash}`,
                )
              }
              className="btn min-h-[38px] rounded-[10px] border border-[var(--color-blue-dark)] px-4 font-semibold text-[var(--color-blue-dark)]"
            >
              Войти заново
            </button>
          </div>
        </section>
      </div>
    );
  }

  if (!canAccessRoute(user, access, kind)) {
    return (
      <Navigate
        to="/access-denied"
        replace
        state={{ from: `${location.pathname}${location.search}` }}
      />
    );
  }

  return children ?? <Outlet />;
}
