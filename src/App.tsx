import { AppProvider, useApp } from "./store";
import Auth from "./screens/Auth";
import Shell from "./components/Shell";
import { registerServiceWorker } from "./pwa";

registerServiceWorker();

function Root() {
  const { status } = useApp();

  if (status === "loading")
    return (
      <div className="grid min-h-dvh place-items-center">
        <div className="flex flex-col items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-3xl brand-grad text-white anim-float">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M3 8a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 9h18M16.5 13.5h.01" />
            </svg>
          </span>
          <p className="text-sm font-bold text-muted">در حال بارگذاری گاوصندوق مالی…</p>
        </div>
      </div>
    );

  if (status !== "unlocked") return <Auth />;
  return <Shell />;
}

export default function App() {
  return (
    <AppProvider>
      <Root />
    </AppProvider>
  );
}
