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
const [bullets, setBullets] = useState<string[]>([""]);
const [loading, setLoading] = useState(true);
const [error, setError] = useState("");
const [formMessage, setFormMessage] = useState("");

useEffect(() => {
 async function loadExperiences() {
  try {
    const data = await getExperiences();
    setExperiences(data);
    setError("");
  } catch {
    setError("Unable to load experiences.");
  } finally {
    setLoading(false);
  }
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
       bullets: bullets
        .filter((bullet) => bullet.trim() !== "")
        .map((bullet) => ({
          bullet_text: bullet.trim(),
        })),
      })
    : await updateExperience(editingExperienceId, {
        ...formData,
        bullets: bullets
        .filter((bullet) => bullet.trim() !== "")
        .map((bullet) => ({
          bullet_text: bullet.trim(),
        })),
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
    setFormMessage("Experience saved successfully.");
    setBullets([""]);
 } catch (error) {
  console.error(error);
  setFormMessage("Unable to save experience.");
 }
}

async function handleDeleteExperience(experienceId: number) {
  const confirmed = window.confirm(
    "Are you sure you want to delete this experience?"
  );

  if (!confirmed) {
    return;
  }

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
  setBullets(
  experience.bullets?.length > 0
    ? experience.bullets.map((bullet: any) => bullet.bullet_text)
    : [""]
);
}

function handleCancelEdit() {
  setEditingExperienceId(null);

  setFormData({
    type: "",
    organization: "",
    title: "",
    location: "",
    start_date: "",
    end_date: "",
    description: "",
  });

  setBullets([""]);
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

      <div className="space-y-2">
        {bullets.map((bullet, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder={`Resume bullet ${index + 1}`}
              value={bullet}
              onChange={(e) => {
                const updatedBullets = [...bullets];
                updatedBullets[index] = e.target.value;
                setBullets(updatedBullets);
              }}
              className="block w-full rounded border p-2"
            />

            <button
              type="button"
              onClick={() => {
                const updatedBullets = bullets.filter(
                  (_, bulletIndex) => bulletIndex !== index
                );

                setBullets(
                  updatedBullets.length > 0 ? updatedBullets : [""]
                );
              }}
              className="rounded border px-3"
            >
              Remove
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setBullets([...bullets, ""])}
        className="rounded border px-3 py-1"
      >
        Add Bullet
      </button>

      <div className="flex gap-2">
        <button
          type="submit"
          className="rounded bg-black px-4 py-2 text-white"
        >
          {editingExperienceId === null ? "Add Experience" : "Save Changes"}
        </button>

        {editingExperienceId !== null && (
          <button
            type="button"
            onClick={handleCancelEdit}
            className="rounded border px-4 py-2"
          >
            Cancel
          </button>
        )}
      </div>

      {formMessage && (
        <p className="text-sm">
          {formMessage}
        </p>
      )}

    </form>

    <div className="mt-8">
      <h2 className="text-2xl font-semibold">Experiences</h2>

      {loading ? (
        <p className="mt-4">Loading experiences...</p>
      ) : error ? (
        <p className="mt-4">{error}</p>
      ) : (
        experiences.map((experience: any) => (
          <div
            key={experience.id}
            className="mt-4 rounded border p-4"
          >
            <h3 className="text-xl font-bold">
              {experience.title}
            </h3>

            <p>{experience.organization}</p>
            <p>{experience.description}</p>

            {experience.bullets?.length > 0 && (
              <ul className="mt-2 list-disc pl-5">
                {experience.bullets.map((bullet: any) => (
                  <li key={bullet.id}>{bullet.bullet_text}</li>
                ))}
              </ul>
            )}

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
        ))
      )}
    </div>
  </main>
);
}