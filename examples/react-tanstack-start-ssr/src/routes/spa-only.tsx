import { lazy } from "react";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/spa-only")({
  ssr: false,
  component: RouteComponent,
});

const remoteCounterUrl = `${window.location.origin}/react-remote-counter.js`;
const RemoteCounter = lazy(() => import(/* @vite-ignore */ remoteCounterUrl));

function RouteComponent() {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-gradient-to-br from-zinc-800 to-black p-4 text-white"
      style={{
        backgroundImage:
          "radial-gradient(50% 50% at 20% 60%, #1a1a1a 0%, #0a0a0a 50%, #000000 100%)",
      }}
    >
      <RemoteCounter />
    </div>
  );
}
