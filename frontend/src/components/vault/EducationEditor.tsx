"use client";

import { useState } from "react";

import {
  createEducation,
  deleteEducation,
  EducationPayload,
  updateEducation,
  VaultEducation,
} from "@/lib/api";

type EducationEditorProps = {
  education?: VaultEducation;
  onSaved: () => void;
  onCancel?: () => void;
};

const emptyEducation: EducationPayload = {
  school: "",
  degree: "",
  field_of_study: "",
  minor: "",
  location: "",
  start_date: null,
  graduation_date: null,
  gpa: "",
  coursework: "",
  honors: "",
};

export default function EducationEditor({
  education,
  onSaved,
  onCancel,
}: EducationEditorProps) {
  const [editing, setEditing] = useState(!education);

  const [formData, setFormData] = useState<EducationPayload>(
    education
      ? {
          school: education.school,
          degree: education.degree,
          field_of_study: education.field_of_study,
          minor: education.minor,
          location: education.location,
          start_date: education.start_date,
          graduation_date: education.graduation_date,
          gpa: education.gpa,
          coursework: education.coursework,
          honors: education.honors,
        }
      : emptyEducation,
  );

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!formData.school.trim()) {
      setMessage("School is required.");
      return;
    }

    try {
      setSaving(true);
      setMessage(null);

      const payload: EducationPayload = {
        school: formData.school.trim(),
        degree: formData.degree?.trim() || null,
        field_of_study: formData.field_of_study?.trim() || null,
        minor: formData.minor?.trim() || null,
        location: formData.location?.trim() || null,
        start_date: formData.start_date || null,
        graduation_date: formData.graduation_date || null,
        gpa: formData.gpa?.trim() || null,
        coursework: formData.coursework?.trim() || null,
        honors: formData.honors?.trim() || null,
      };

      if (education) {
        await updateEducation(education.id, payload);
      } else {
        await createEducation(payload);
      }

      setEditing(false);
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save education.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!education) {
      return;
    }

    const confirmed = window.confirm("Delete this education entry?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteEducation(education.id);
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete education.",
      );
    }
  }

  if (!editing && education) {
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
        <input
          type="text"
          placeholder="School"
          value={formData.school}
          onChange={(event) =>
            setFormData({
              ...formData,
              school: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="text"
          placeholder="Degree"
          value={formData.degree ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              degree: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="text"
          placeholder="Field of Study"
          value={formData.field_of_study ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              field_of_study: event.target.value,
            })
          }
          className="rounded border p-2"
        />

        <input
          type="text"
          placeholder="Minor"
          value={formData.minor ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              minor: event.target.value,
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

        <input
          type="text"
          placeholder="GPA"
          value={formData.gpa ?? ""}
          onChange={(event) =>
            setFormData({
              ...formData,
              gpa: event.target.value,
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
          <label className="mb-1 block text-sm">Graduation Date</label>

          <input
            type="date"
            value={formData.graduation_date ?? ""}
            onChange={(event) =>
              setFormData({
                ...formData,
                graduation_date: event.target.value || null,
              })
            }
            className="w-full rounded border p-2"
          />
        </div>
      </div>

      <textarea
        placeholder="Coursework, one item per line"
        value={formData.coursework ?? ""}
        onChange={(event) =>
          setFormData({
            ...formData,
            coursework: event.target.value,
          })
        }
        className="min-h-28 w-full rounded border p-2"
      />

      <textarea
        placeholder="Honors, one item per line"
        value={formData.honors ?? ""}
        onChange={(event) =>
          setFormData({
            ...formData,
            honors: event.target.value,
          })
        }
        className="min-h-24 w-full rounded border p-2"
      />

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

            if (!education) {
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
