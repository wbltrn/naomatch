"use client";

import { useState } from "react";

import { ProfileData, updateProfile } from "@/lib/api";

type ProfileEditorProps = {
  profile: ProfileData;
  onSaved: (profile: ProfileData) => void;
};

export default function ProfileEditor({
  profile,
  onSaved,
}: ProfileEditorProps) {
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<ProfileData>(profile);

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  function startEditing() {
    setFormData({
      ...profile,
      links: profile.links.map((link) => ({
        ...link,
      })),
    });

    setMessage(null);
    setEditing(true);
  }

  function cancelEditing() {
    setFormData(profile);
    setEditing(false);
    setMessage(null);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setMessage("Name is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const savedProfile = await updateProfile({
        ...formData,
        name: formData.name.trim(),
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
        links: formData.links
          .filter((link) => link.url.trim())
          .map((link) => ({
            label:
              link.label.trim() ||
              link.url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
            url: link.url.trim(),
          })),
      });

      onSaved(savedProfile);
      setEditing(false);
      setMessage("Profile saved.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save profile.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div>
        <button
          type="button"
          onClick={startEditing}
          className="rounded border px-3 py-1 text-sm"
        >
          Edit Profile
        </button>

        {message && <p className="mt-2 text-sm text-gray-600">{message}</p>}
      </div>
    );
  }

  return (
    <div className="mt-5 space-y-4 rounded-lg border border-gray-200 p-4">
      <div className="grid gap-3 md:grid-cols-2">
        <input
          type="text"
          placeholder="Name"
          value={formData.name}
          onChange={(event) =>
            setFormData({
              ...formData,
              name: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="text"
          placeholder="Phone"
          value={formData.phone ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              phone: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="email"
          placeholder="Email"
          value={formData.email ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              email: event.target.value,
            })
          }
          className="rounded border p-2 md:col-span-2"
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Links</p>

        {formData.links.map((link, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="url"
              placeholder="https://..."
              value={link.url}
              onChange={(event) => {
                const updatedLinks = [...formData.links];

                const url = event.target.value;

                updatedLinks[index] = {
                  label: url.replace(/^https?:\/\//, "").replace(/\/$/, ""),
                  url,
                };

                setFormData({
                  ...formData,
                  links: updatedLinks,
                });
              }}
              className="w-full rounded border p-2"
            />

            <button
              type="button"
              onClick={() =>
                setFormData({
                  ...formData,
                  links: formData.links.filter(
                    (_, linkIndex) => linkIndex !== index,
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
              links: [
                ...formData.links,
                {
                  label: "",
                  url: "",
                },
              ],
            })
          }
          className="rounded border px-3 py-1 text-sm"
        >
          Add Link
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
          {saving ? "Saving..." : "Save Profile"}
        </button>

        <button
          type="button"
          onClick={cancelEditing}
          disabled={saving}
          className="rounded border px-4 py-2 text-sm"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
