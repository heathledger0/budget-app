import { useRegisterSW } from 'virtual:pwa-register/react';

// Checks for a newly deployed version periodically while the app stays open,
// and lets the user apply it with one tap instead of having to clear the
// PWA's cache or reinstall from the browser to see updates.
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

export default function UpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return;
      setInterval(() => {
        registration.update();
      }, CHECK_INTERVAL_MS);
    },
  });

  if (!needRefresh) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 flex items-center justify-between gap-3 rounded-lg bg-blue-600 px-4 py-3 text-sm text-white shadow-lg sm:inset-x-auto sm:right-4 sm:max-w-xs">
      <span>🔄 새 버전이 있어요</span>
      <button
        type="button"
        onClick={() => updateServiceWorker(true)}
        className="shrink-0 rounded-md bg-white px-3 py-1.5 font-semibold text-blue-600 hover:bg-blue-50"
      >
        업데이트
      </button>
    </div>
  );
}
