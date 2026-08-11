"use client";

import { useEffect, useState } from "react";
import {
  checkBackend,
  createExperience,
  deleteExperience,
  getExperiences,
  updateExperience,
} from "@/lib/api";

export default function Home() {
  const [status, setStatus] = useState("Not checked");
  const [experiences, setExperiences] = useState<any[]>([]);
  const [formData, setFormData] = useState({
  type: "",
  organization: "",
  title: "",
  location: "",
  start_date: "",
  end_date: "",
  description: "",
});
const [editingExperienceId, setEditingExperienceId] = useState<number | null>(
  null
);

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

  async function handleCreateExperience(event: React.FormEvent) {
  event.preventDefault();

  if (!formData.type.trim() || !formData.title.trim()) {
  return;
}

  try {
    const savedExperience =
      editingExperienceId === null
      ? await createExperience({
        ...formData,
        bullets: [],
      })
    : await updateExperience(editingExperienceId, {
        ...formData,
        bullets: [],
      });

    setExperiences((currentExperiences: any[]) =>
  editingExperienceId === null
    ? [...currentExperiences, savedExperience]
    : currentExperiences.map((experience) =>
        experience.id === editingExperienceId
          ? savedExperience
          : experience
      )
);

    setFormData({
      type: "",
      organization: "",
      title: "",
      location: "",
      start_date: "",
      end_date: "",
      description: "",
    });
    setEditingExperienceId(null);
  } catch (error) {
    console.error(error);
  }
}

async function handleDeleteExperience(experienceId: number) {
  try {
    await deleteExperience(experienceId);

    setExperiences((currentExperiences: any[]) =>
      currentExperiences.filter(
        (experience) => experience.id !== experienceId
      )
    );
  } catch (error) {
    console.error(error);
  }
}

function handleEditExperience(experience: any) {
  setEditingExperienceId(experience.id);

  setFormData({
    type: experience.type ?? "",
    organization: experience.organization ?? "",
    title: experience.title ?? "",
    location: experience.location ?? "",
    start_date: experience.start_date ?? "",
    end_date: experience.end_date ?? "",
    description: experience.description ?? "",
  });
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

    <form onSubmit={handleCreateExperience} className="mt-8 space-y-3">
      <h2 className="text-2xl font-semibold">Add Experience</h2>

      <input
        type="text"
        placeholder="Type"
        value={formData.type}
        onChange={(e) =>
          setFormData({ ...formData, type: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="text"
        placeholder="Organization"
        value={formData.organization}
        onChange={(e) =>
          setFormData({ ...formData, organization: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="text"
        placeholder="Title"
        value={formData.title}
        onChange={(e) =>
          setFormData({ ...formData, title: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="text"
        placeholder="Location"
        value={formData.location}
        onChange={(e) =>
          setFormData({ ...formData, location: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="date"
        value={formData.start_date}
        onChange={(e) =>
          setFormData({ ...formData, start_date: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <input
        type="date"
        value={formData.end_date}
        onChange={(e) =>
          setFormData({ ...formData, end_date: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <textarea
        placeholder="Description"
        value={formData.description}
        onChange={(e) =>
          setFormData({ ...formData, description: e.target.value })
        }
        className="block w-full rounded border p-2"
      />

      <button
        type="submit"
        className="rounded bg-black px-4 py-2 text-white"
      >
        {editingExperienceId === null ? "Add Experience" : "Save Changes"}
      </button>
    </form>

    <div className="mt-8">
      <h2 className="text-2xl font-semibold">Experiences</h2>

      {experiences.map((experience: any) => (
        <div
          key={experience.id}
          className="mt-4 rounded border p-4"
        >
          <h3 className="text-xl font-bold">
            {experience.title}
          </h3>

          <p>{experience.organization}</p>
          <p>{experience.description}</p>

          <button
            onClick={() => handleEditExperience(experience)}
            className="mt-3 mr-2 rounded border px-3 py-1"
          >
            Edit
          </button>

          <button
            onClick={() => handleDeleteExperience(experience.id)}
            className="mt-3 rounded border px-3 py-1"
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  </main>
);
}