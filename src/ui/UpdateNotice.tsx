import { useRegisterSW } from 'virtual:pwa-register/react';
import { Button } from './controls';

export type RegisterHook = typeof useRegisterSW;

/**
 * Registers the service worker and, when a new version has downloaded, offers to switch to it.
 * Never reloads on its own, so a deploy can't interrupt reading. `useRegister` is for tests.
 */
export function UpdateNotice({ useRegister = useRegisterSW }: { useRegister?: RegisterHook }) {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegister({
    onRegisterError(error: unknown) {
      console.error('Could not register the service worker; offline use is unavailable', error);
    },
  });

  if (!needRefresh) return null;
  return (
    <div className="update-notice" role="status">
      <span>A new version is ready.</span>
      <Button variant="primary" onClick={() => void updateServiceWorker(true)}>
        Reload
      </Button>
      <Button onClick={() => setNeedRefresh(false)}>Later</Button>
    </div>
  );
}
