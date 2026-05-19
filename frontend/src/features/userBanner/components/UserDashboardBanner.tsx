import { useEffect, useMemo, useState } from 'react';

import { useActiveUserBanner } from '../hooks/useUserBanner';
import { UserBannerView } from './UserBannerView';

function dismissedKey(id: string, updatedAt: string) {
  const token = localStorage.getItem('token') || 'anonymous';
  return `user-banner-dismissed:${id}:${updatedAt}:${token}`;
}

export function UserDashboardBanner() {
  const { data: banner, isLoading } = useActiveUserBanner();
  const key = useMemo(
    () => (banner ? dismissedKey(banner.id, banner.updatedAt) : null),
    [banner],
  );
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(key ? sessionStorage.getItem(key) === '1' : false);
  }, [key]);

  if (isLoading || !banner || !banner.enabled || dismissed) return null;

  return (
    <UserBannerView
      banner={banner}
      onDismiss={
        banner.dismissible
          ? () => {
              if (key) sessionStorage.setItem(key, '1');
              setDismissed(true);
            }
          : undefined
      }
    />
  );
}
