"use client";

import { useState } from "react";

import {
  createSkill,
  deleteSkill,
  SkillPayload,
  updateSkill,
  VaultSkill,
} from "@/lib/api";

type SkillsEditorProps = {
  skills: VaultSkill[];
  onSaved: () => void;
};

export default function SkillsEditor({ skills, onSaved }: SkillsEditorProps) {
  const [adding, setAdding] = useState(false);

  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState<SkillPayload>({
    category: "",
    name: "",
  });

  const [message, setMessage] = useState<string | null>(null);

  function startAdd() {
    setEditingId(null);
    setFormData({
      category: "",
      name: "",
    });
    setAdding(true);
    setMessage(null);
  }

  function startEdit(skill: VaultSkill) {
    setAdding(false);
    setEditingId(skill.id);

    setFormData({
      category: skill.category ?? "",
      name: skill.name,
    });

    setMessage(null);
  }

  function cancel() {
    setAdding(false);
    setEditingId(null);
    setMessage(null);
  }

  async function handleSave() {
    if (!formData.name.trim()) {
      setMessage("Skill name is required.");
      return;
    }

    const payload: SkillPayload = {
      name: formData.name.trim(),
      category: formData.category?.trim() || null,
    };

    try {
      if (editingId !== null) {
        await updateSkill(editingId, payload);
      } else {
        await createSkill(payload);
      }

      cancel();
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to save skill.",
      );
    }
  }

  async function handleDelete(skillId: number) {
    const confirmed = window.confirm("Delete this skill?");

    if (!confirmed) {
      return;
    }

    try {
      await deleteSkill(skillId);
      onSaved();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to delete skill.",
      );
    }
  }

  return (
    <div className="space-y-4">
      <button
        type="button"
        onClick={startAdd}
        className="rounded border px-3 py-1 text-sm"
      >
        Add Skill
      </button>

      {(adding || editingId !== null) && (
        <div className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 md:flex-row">
          <input
            type="text"
            placeholder="Category"
            value={formData.category ?? ""}
            onChange={(event) =>
              setFormData({
                ...formData,
                category: event.target.value,
              })
            }
            className="rounded border p-2"
          />

          <input
            type="text"
            placeholder="Skill"
            value={formData.name}
            onChange={(event) =>
              setFormData({
                ...formData,
                name: event.target.value,
              })
            }
            className="flex-1 rounded border p-2"
          />

          <button
            type="button"
            onClick={handleSave}
            className="rounded bg-black px-4 py-2 text-sm text-white"
          >
            Save
          </button>

          <button
            type="button"
            onClick={cancel}
            className="rounded border px-4 py-2 text-sm"
          >
            Cancel
          </button>
        </div>
      )}

      {message && <p className="text-sm text-red-600">{message}</p>}

      <div className="space-y-2">
        {skills.map((skill) => (
          <div
            key={skill.id}
            className="flex items-center justify-between rounded border border-gray-200 px-3 py-2"
          >
            <div>
              <p className="font-medium text-gray-900">{skill.name}</p>

              <p className="text-xs text-gray-500">
                {skill.category || "Other"}
              </p>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startEdit(skill)}
                className="rounded border px-3 py-1 text-sm"
              >
                Edit
              </button>

              <button
                type="button"
                onClick={() => handleDelete(skill.id)}
                className="rounded border px-3 py-1 text-sm"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
