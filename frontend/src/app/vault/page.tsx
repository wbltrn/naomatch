"use client";

import { useEffect, useMemo, useState } from "react";

import {
  getProfile,
  getVault,
  ProfileData,
  VaultData,
  VaultExperience,
} from "@/lib/api";

import EducationEditor from "@/components/vault/EducationEditor";
import ExperienceEditor from "@/components/vault/ExperienceEditor";
import ProfileEditor from "@/components/vault/ProfileEditor";
import SkillsEditor from "@/components/vault/SkillsEditor";

const EXPERIENCE_SECTION_ORDER = [
  "work",
  "project",
  "leadership",
  "research",
  "volunteer",
  "certification",
  "award",
];

function formatDate(date: string | null | undefined) {
  if (!date) {
    return null;
  }

  const [year, month] = date.split("-");

  const parsedDate = new Date(Number(year), Number(month) - 1);

  return parsedDate.toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });
}

function normalizeSectionType(sectionType: string) {
  return sectionType.trim().toLowerCase();
}

function formatSectionTitle(sectionType: string) {
  const labels: Record<string, string> = {
    work: "Work",
    project: "Projects",
    leadership: "Leadership & Activities",
    research: "Research",
    volunteer: "Volunteer",
    certification: "Certifications",
    award: "Awards & Honors",
  };

  const normalized = normalizeSectionType(sectionType);

  return (
    labels[normalized] ??
    normalized
      .replaceAll("_", " ")
      .replace(/\b\w/g, (character) => character.toUpperCase())
  );
}

function ExperienceCard({
  experience,
  sectionType,
  onSaved,
}: {
  experience: VaultExperience;
  sectionType: string;
  onSaved: () => void;
}) {
  const startDate = formatDate(experience.start_date);

  const endDate = experience.end_date
    ? formatDate(experience.end_date)
    : "Present";

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {experience.title}
          </h3>

          {experience.organization && (
            <p className="text-sm font-medium text-gray-700">
              {experience.organization}
            </p>
          )}

          {experience.location && (
            <p className="text-sm text-gray-500">{experience.location}</p>
          )}
        </div>

        {(startDate || endDate) && (
          <p className="whitespace-nowrap text-sm text-gray-500">
            {startDate ?? "Unknown"}
            {" — "}
            {endDate}
          </p>
        )}
      </div>

      {experience.description && (
        <p className="mt-4 text-sm leading-6 text-gray-700">
          {experience.description}
        </p>
      )}

      {experience.bullets.length > 0 && (
        <ul className="mt-4 space-y-2 pl-5 text-sm leading-6 text-gray-700">
          {experience.bullets.map((bullet) => (
            <li key={bullet.id} className="list-disc">
              {bullet.bullet_text}
            </li>
          ))}
        </ul>
      )}

      <ExperienceEditor
        experience={experience}
        sectionType={sectionType}
        onSaved={onSaved}
      />
    </article>
  );
}

export default function VaultPage() {
  const [vault, setVault] = useState<VaultData | null>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);

  const [loading, setLoading] = useState(true);

  const [error, setError] = useState<string | null>(null);

  const [showEducationForm, setShowEducationForm] = useState(false);

  const [showExperienceForm, setShowExperienceForm] = useState(false);

  async function loadVaultData() {
    try {
      setLoading(true);
      setError(null);

      const [vaultData, profileData] = await Promise.all([
        getVault(),
        getProfile(),
      ]);

      setVault(vaultData);
      setProfile(profileData);
    } catch (error) {
      console.error(error);

      setError(
        error instanceof Error ? error.message : "Unable to load vault.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadVaultData();
  }, []);

  const groupedExperienceSections = useMemo(() => {
    if (!vault) {
      return [];
    }

    const grouped = vault.experience_sections.reduce<
      Record<string, VaultExperience[]>
    >((groups, section) => {
      const normalizedType = normalizeSectionType(section.section_type);

      if (!groups[normalizedType]) {
        groups[normalizedType] = [];
      }

      groups[normalizedType].push(...section.items);

      return groups;
    }, {});

    return Object.entries(grouped)
      .sort(([firstType], [secondType]) => {
        const firstIndex = EXPERIENCE_SECTION_ORDER.indexOf(firstType);

        const secondIndex = EXPERIENCE_SECTION_ORDER.indexOf(secondType);

        const normalizedFirstIndex =
          firstIndex === -1 ? Number.MAX_SAFE_INTEGER : firstIndex;

        const normalizedSecondIndex =
          secondIndex === -1 ? Number.MAX_SAFE_INTEGER : secondIndex;

        return normalizedFirstIndex - normalizedSecondIndex;
      })
      .map(([sectionType, experiences]) => ({
        sectionType,
        experiences,
      }));
  }, [vault]);

  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <p className="text-gray-600">Loading vault...</p>
      </main>
    );
  }

  if (error || !vault) {
    return (
      <main className="min-h-screen bg-gray-50 p-8">
        <h1 className="text-2xl font-bold text-gray-900">Vault</h1>

        <p className="mt-4 text-red-600">{error ?? "Unable to load vault."}</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <header className="mb-10">
          <a
            href="/"
            className="text-sm font-medium text-gray-500 hover:text-gray-900"
          >
            ← Back to Naomatch
          </a>

          <div className="mt-4">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900">
              Experience Vault
            </h1>

            <p className="mt-2 max-w-2xl text-gray-600">
              Your trusted career background used by Naomatch when matching jobs
              and generating tailored resumes.
            </p>
          </div>
        </header>

        {/* Profile */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Profile</h2>

            {profile && (
              <ProfileEditor
                profile={profile}
                onSaved={(savedProfile) => setProfile(savedProfile)}
              />
            )}
          </div>

          {profile ? (
            <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-semibold text-gray-900">
                {profile.name}
              </h3>

              <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-sm text-gray-600">
                {profile.email && <span>{profile.email}</span>}

                {profile.phone && <span>{profile.phone}</span>}
              </div>

              {profile.links.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-3">
                  {profile.links.map((link, index) => (
                    <a
                      key={`${link.url}-${index}`}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-gray-200 px-3 py-1 text-sm text-gray-700 hover:bg-gray-50"
                    >
                      {link.label}
                    </a>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
              No profile information added yet.
            </p>
          )}
        </section>

        {/* Education */}
        <section className="mb-10">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">Education</h2>

            <button
              type="button"
              onClick={() => setShowEducationForm(true)}
              className="rounded border px-3 py-1 text-sm"
            >
              Add Education
            </button>
          </div>

          {showEducationForm && (
            <EducationEditor
              onSaved={() => {
                setShowEducationForm(false);
                loadVaultData();
              }}
              onCancel={() => setShowEducationForm(false)}
            />
          )}

          {vault.education.length === 0 ? (
            <p className="text-sm text-gray-500">
              No education entries added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {vault.education.map((education) => (
                <article
                  key={education.id}
                  className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm"
                >
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {education.school}
                      </h3>

                      <p className="text-sm text-gray-700">
                        {[education.degree, education.field_of_study]
                          .filter(Boolean)
                          .join(" — ")}
                      </p>

                      {education.minor && (
                        <p className="text-sm text-gray-600">
                          Minor: {education.minor}
                        </p>
                      )}

                      {education.location && (
                        <p className="text-sm text-gray-500">
                          {education.location}
                        </p>
                      )}
                    </div>

                    <div className="text-sm text-gray-500 md:text-right">
                      {education.graduation_date && (
                        <p>Expected {formatDate(education.graduation_date)}</p>
                      )}

                      {education.gpa && (
                        <p className="mt-1">GPA: {education.gpa}</p>
                      )}
                    </div>
                  </div>

                  {education.coursework && (
                    <div className="mt-5">
                      <p className="text-sm font-semibold text-gray-700">
                        Coursework
                      </p>

                      <div className="mt-2 flex flex-wrap gap-2">
                        {education.coursework
                          .split("\n")
                          .filter(Boolean)
                          .map((course) => (
                            <span
                              key={course}
                              className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
                            >
                              {course}
                            </span>
                          ))}
                      </div>
                    </div>
                  )}

                  {education.honors && (
                    <div className="mt-5">
                      <p className="text-sm font-semibold text-gray-700">
                        Honors
                      </p>

                      <ul className="mt-2 list-disc pl-5 text-sm text-gray-700">
                        {education.honors
                          .split("\n")
                          .filter(Boolean)
                          .map((honor) => (
                            <li key={honor}>{honor}</li>
                          ))}
                      </ul>
                    </div>
                  )}

                  <EducationEditor
                    education={education}
                    onSaved={loadVaultData}
                  />
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Experiences */}
        <section className="mb-10">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-2xl font-semibold text-gray-900">
              Experiences
            </h2>

            <button
              type="button"
              onClick={() => setShowExperienceForm(true)}
              className="rounded border px-3 py-1 text-sm"
            >
              Add Experience
            </button>
          </div>

          {showExperienceForm && (
            <ExperienceEditor
              onSaved={() => {
                setShowExperienceForm(false);
                loadVaultData();
              }}
              onCancel={() => setShowExperienceForm(false)}
            />
          )}

          {groupedExperienceSections.length === 0 ? (
            <p className="text-sm text-gray-500">No experiences added yet.</p>
          ) : (
            <div className="space-y-10">
              {groupedExperienceSections.map(({ sectionType, experiences }) => (
                <div key={sectionType}>
                  <h3 className="mb-4 text-lg font-semibold text-gray-700">
                    {formatSectionTitle(sectionType)}
                  </h3>

                  <div className="space-y-4">
                    {experiences.map((experience) => (
                      <ExperienceCard
                        key={experience.id}
                        experience={experience}
                        sectionType={sectionType}
                        onSaved={loadVaultData}
                      />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Skills */}
        <section>
          <h2 className="mb-4 text-2xl font-semibold text-gray-900">Skills</h2>

          <SkillsEditor skills={vault.skills} onSaved={loadVaultData} />
        </section>
      </div>
    </main>
  );
}
