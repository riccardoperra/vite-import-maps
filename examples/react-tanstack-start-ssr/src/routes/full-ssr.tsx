import { createFileRoute } from "@tanstack/react-router";
import { lazy } from "react";
import { getPunkSongs } from "@/data/demo.punk-songs";

export const Route = createFileRoute("/full-ssr")({
  component: RouteComponent,
  loader: async () => await getPunkSongs(),
});

const host =
  "window" in globalThis
    ? window.location.origin
    : import.meta.env.PROD
      ? `${process.cwd()}/dist/client`
      : `/public`;
const remoteCounterUrl = `${host}/react-remote-counter.js`;

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
