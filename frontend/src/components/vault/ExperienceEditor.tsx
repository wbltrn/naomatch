"use client";

import { useState } from "react";

import {
  createVaultExperience,
  deleteVaultExperience,
  ExperiencePayload,
  updateVaultExperience,
  VaultExperience,
} from "@/lib/api";

type ExperienceEditorProps = {
  experience?: VaultExperience;
  sectionType?: string;
  onSaved: () => void;
  onCancel?: () => void;
};

export default function ExperienceEditor({
  experience,
  sectionType = "work",
  onSaved,
  onCancel,
}: ExperienceEditorProps) {
  const [editing, setEditing] = useState(!experience);

  const [formData, setFormData] = useState<ExperiencePayload>({
    type: sectionType,
    organization: experience?.organization ?? "",
    title: experience?.title ?? "",
    location: experience?.location ?? "",
    start_date: experience?.start_date ?? null,
    end_date: experience?.end_date ?? null,
    description: experience?.description ?? "",
    bullets:
      experience?.bullets.map((bullet) => ({
        bullet_text: bullet.bullet_text,
      })) ?? [],
  });

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!formData.type.trim() || !formData.title.trim()) {
      setMessage("Type and title are required.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload: ExperiencePayload = {
        type: formData.type.trim(),
        organization: formData.organization?.trim() || null,
        title: formData.title.trim(),
        location: formData.location?.trim() || null,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null,
        description: formData.description?.trim() || null,
        bullets: formData.bullets
          .filter((bullet) => bullet.bullet_text.trim())
          .map((bullet) => ({
            bullet_text: bullet.bullet_text.trim(),
          })),
      };

      if (experience) {
        await updateVaultExperience(experience.id, payload);
      } else {
        await createVaultExperience(payload);
      }

      setEditing(false);
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save experience.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!experience) {
      return;
    }

    const confirmed = window.confirm("Delete this experience?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteVaultExperience(experience.id);

      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete experience.",
      );
    }
  }

  if (!editing && experience) {
    return (
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="rounded border px-3 py-1 text-sm"
        >
          Edit
        </button>

        <button
          type="button"
          onClick={handleDelete}
          className="rounded border px-3 py-1 text-sm"
        >
          Delete
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3 rounded-lg border border-gray-200 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <select
          value={formData.type}
          onChange={(event) =>
            setFormData({
              ...formData,
              type: event.target.value,
            })
          }
          className="rounded border p-2"
        >
          <option value="work">Work</option>

          <option value="project">Projects</option>

          <option value="leadership">Leadership & Activities</option>

          <option value="research">Research</option>

          <option value="volunteer">Volunteer</option>

          <option value="certification">Certifications</option>

          <option value="award">Awards & Honors</option>
        </select>

        <input
          type="text"
          placeholder="Title"
          value={formData.title}
          onChange={(event) =>
            setFormData({
              ...formData,
              title: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="text"
          placeholder="Organization"
          value={formData.organization ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              organization: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="text"
          placeholder="Location"
          value={formData.location ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              location: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <div>
          <label className="mb-1 block text-sm">Start Date</label>

          <input
            type="date"
            value={formData.start_date ?? ""}
            onChange={(event) =>
              setFormData({
                ...formData,
                start_date: event.target.value || null,
              })
            }
            className="w-full rounded border p-2"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm">End Date</label>

          <input
            type="date"
            value={formData.end_date ?? ""}
            onChange={(event) =>
              setFormData({
                ...formData,
                end_date: event.target.value || null,
              })
            }
            className="w-full rounded border p-2"
          />
        </div>
      </div>

      <textarea
        placeholder="Description"
        value={formData.description ?? ""}
        onChange={(event) =>
          setFormData({
            ...formData,
            description: event.target.value,
          })
        }
        className="min-h-24 w-full rounded border p-2"
      />

      <div className="space-y-2">
        <p className="text-sm font-medium">Bullets</p>

        {formData.bullets.map((bullet, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              value={bullet.bullet_text}
              onChange={(event) => {
                const updatedBullets = [...formData.bullets];

                updatedBullets[index] = {
                  bullet_text: event.target.value,
                };

                setFormData({
                  ...formData,
                  bullets: updatedBullets,
                });
              }}
              className="w-full rounded border p-2"
            />

            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  bullets: formData.bullets.filter(
                    (_, bulletIndex) => bulletIndex !== index,
                  ),
                })
              }
              className="rounded border px-3"
            >
              Remove
            </button>
          </div>
        ))}

        <button
          type="button"
          onClick={() =>
            setFormData({
              ...formData,
              bullets: [
                ...formData.bullets,
                {
                  bullet_text: "",
                },
              ],
            })
          }
          className="rounded border px-3 py-1 text-sm"
        >
          Add Bullet
        </button>
      </div>

      {message && <p className="text-sm text-red-600">{message}</p>}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="rounded bg-black px-4 py-2 text-sm text-white disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>

        <button
          type="button"
          onClick={() => {
            setEditing(false);

            if (!experience) {
              onCancel?.();
            }
          }}
          className="rounded border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
