"use client";

import { useEffect, useState } from "react";
import { checkBackend, getExperiences } from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState("Not checked");

  const [experiences, setExperiences] = useState([]);

useEffect(() => {
  async function loadExperiences() {
    const data = await getExperiences();
    setExperiences(data);
  }

  loadExperiences();
}, []);

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
      <h1 className="text-3xl font-bold">Naomatch</h1>

      <p className="mt-4">
        Backend status: <strong>{status}</strong>
      </p>

      <button
        onClick={handleCheckBackend}
        className="mt-4 rounded bg-black px-4 py-2 text-white"
      >
        Check Backend
      </button>

      <div className="mt-8">
  <h2 className="text-2xl font-semibold">Experiences</h2>

  {experiences.map((experience: any) => (
    <div key={experience.id} className="mt-4 rounded border p-4">
      <h3 className="text-xl font-bold">{experience.title}</h3>
      <p>{experience.organization}</p>
      <p>{experience.description}</p>
    </div>
  ))}
</div>

    </main>
  );
}