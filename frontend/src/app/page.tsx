"use client";

import { useState } from "react";
import { checkBackend } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState("Not checked");

  async function handleCheckBackend() {
    try {
      const data = await checkBackend();
      setStatus(data.status);
    } catch {
      setStatus("Backend unavailable");
    }
  }

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold">Resumatch</h1>

      <p className="mt-4">
        Backend status: <strong>{status}</strong>
      </p>

      <button
        onClick={handleCheckBackend}
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        Check Backend
      </button>
    </main>
  );
}