import re
import unicodedata
from urllib.parse import urlsplit, urlunsplit

from sqlalchemy.orm import Session

from app.models.education import Education
from app.models.experience import Experience, ExperienceBullet
from app.models.profile import ProfileLink, UserProfile
from app.models.skill import Skill
from app.schemas.resume_import import ResumeImportProposal


# -------------------------------------------------------------------
# Normalization helpers
# -------------------------------------------------------------------


def clean_optional(value: str | None) -> str | None:
    if value is None:
        return None

    cleaned = value.strip()

    return cleaned or None


def normalize_text(value: str | None) -> str:
    if not value:
        return ""

    value = value.strip().lower()

    value = re.sub(
        r"\s+",
        " ",
        value,
    )

    return value

def normalize_bullet_text(value: str | None) -> str:
    if not value:
        return ""

    normalized = unicodedata.normalize(
        "NFKC",
        value,
    )

    normalized = (
        normalized
        .replace("’", "'")
        .replace("‘", "'")
        .replace("“", '"')
        .replace("”", '"')
        .replace("–", "-")
        .replace("—", "-")
    )

    normalized = normalized.lower().strip()

    # Treat "supporting$123B" and
    # "supporting $123B" as equivalent.
    normalized = re.sub(
        r"(?<=\w)\s*\$",
        " $",
        normalized,
    )

    normalized = re.sub(
        r"\s+",
        " ",
        normalized,
    )

    return normalized

def normalize_organization(value: str | None) -> str:
    normalized = normalize_text(value)

    if not normalized:
        return ""

    normalized = re.sub(
        r"[.,]",
        "",
        normalized,
    )

    corporate_suffixes = (
        " incorporated",
        " corporation",
        " company",
        " limited",
        " inc",
        " llc",
        " corp",
        " ltd",
        " co",
    )

    suffix_removed = True

    while suffix_removed:
        suffix_removed = False

        for suffix in corporate_suffixes:
            if normalized.endswith(suffix):
                normalized = normalized[
                    : -len(suffix)
                ].strip()

                suffix_removed = True
                break

    return normalized


def normalize_type(value: str | None) -> str:
    normalized = normalize_text(value)

    type_aliases = {
        "employment": "work",
        "professional": "work",
        "professional experience": "work",
        "work experience": "work",
        "internship": "work",
        "projects": "project",
        "research experience": "research",
        "volunteer": "involvement",
        "volunteering": "involvement",
        "leadership": "involvement",
        "extracurricular": "involvement",
        "involvement": "involvement",
        "student organization": "involvement",
        "clinical experience": "clinical",
    }

    return type_aliases.get(
        normalized,
        normalized,
    )


def title_tokens(value: str | None) -> set[str]:
    normalized = normalize_text(value)

    return set(
        re.findall(
            r"[a-z0-9+#]+",
            normalized,
        )
    )


def titles_are_similar(
    first: str | None,
    second: str | None,
) -> bool:
    first_normalized = normalize_text(first)
    second_normalized = normalize_text(second)

    if not first_normalized or not second_normalized:
        return False

    if first_normalized == second_normalized:
        return True

    first_tokens = title_tokens(first)
    second_tokens = title_tokens(second)

    if not first_tokens or not second_tokens:
        return False

    # Example:
    # "IT Data Analyst Intern"
    # "Data Analyst Intern"
    if (
        first_tokens.issubset(second_tokens)
        or second_tokens.issubset(first_tokens)
    ):
        return True

    overlap = len(
        first_tokens & second_tokens
    )

    union = len(
        first_tokens | second_tokens
    )

    if union == 0:
        return False

    similarity = overlap / union

    return similarity >= 0.75


def start_dates_are_compatible(
    first,
    second,
) -> bool:
    if first is None or second is None:
        # Missing dates should not automatically prevent a
        # strong organization/title match.
        return True

    return (
        first.year == second.year
        and first.month == second.month
    )


def normalize_url(value: str | None) -> str:
    if not value:
        return ""

    value = value.strip()

    if not value:
        return ""

    try:
        parts = urlsplit(value)

        normalized = urlunsplit(
            (
                parts.scheme.lower(),
                parts.netloc.lower(),
                parts.path.rstrip("/"),
                parts.query,
                "",
            )
        )

        return normalized
    except ValueError:
        return value.rstrip("/")


def merge_text_list(
    existing_text: str | None,
    incoming_values: list[str],
) -> tuple[str | None, bool]:
    existing_values = []

    if existing_text:
        existing_values = [
            value.strip()
            for value in existing_text.splitlines()
            if value.strip()
        ]

    seen = {
        normalize_text(value)
        for value in existing_values
    }

    merged_values = list(existing_values)
    changed = False

    for value in incoming_values:
        cleaned = value.strip()

        if not cleaned:
            continue

        normalized = normalize_text(cleaned)

        if normalized in seen:
            continue

        seen.add(normalized)
        merged_values.append(cleaned)
        changed = True

    if not merged_values:
        return None, changed

    return "\n".join(merged_values), changed


# -------------------------------------------------------------------
# Education matching / merging
# -------------------------------------------------------------------


def education_matches(
    existing: Education,
    incoming,
) -> bool:
    if (
        normalize_text(existing.school)
        != normalize_text(incoming.school)
    ):
        return False

    existing_degree = normalize_text(
        existing.degree
    )
    incoming_degree = normalize_text(
        incoming.degree
    )

    existing_field = normalize_text(
        existing.field_of_study
    )
    incoming_field = normalize_text(
        incoming.field_of_study
    )

    degree_conflict = (
        existing_degree
        and incoming_degree
        and existing_degree != incoming_degree
    )

    field_conflict = (
        existing_field
        and incoming_field
        and existing_field != incoming_field
    )

    if degree_conflict or field_conflict:
        return False

    # Same school with compatible degree/field.
    return True


def merge_education(
    existing: Education,
    incoming,
) -> bool:
    changed = False

    scalar_fields = (
        "degree",
        "field_of_study",
        "minor",
        "location",
        "gpa",
    )

    for field_name in scalar_fields:
        existing_value = getattr(
            existing,
            field_name,
        )

        incoming_value = clean_optional(
            getattr(
                incoming,
                field_name,
            )
        )

        if not existing_value and incoming_value:
            setattr(
                existing,
                field_name,
                incoming_value,
            )

            changed = True

    if (
        existing.start_date is None
        and incoming.start_date is not None
    ):
        existing.start_date = incoming.start_date
        changed = True

    if (
        existing.graduation_date is None
        and incoming.graduation_date is not None
    ):
        existing.graduation_date = (
            incoming.graduation_date
        )

        changed = True

    coursework, coursework_changed = (
        merge_text_list(
            existing.coursework,
            incoming.coursework,
        )
    )

    if coursework_changed:
        existing.coursework = coursework
        changed = True

    honors, honors_changed = merge_text_list(
        existing.honors,
        incoming.honors,
    )

    if honors_changed:
        existing.honors = honors
        changed = True

    return changed


# -------------------------------------------------------------------
# Experience matching / merging
# -------------------------------------------------------------------


def experience_matches(
    existing: Experience,
    incoming,
) -> bool:
    if (
        normalize_type(existing.type)
        != normalize_type(incoming.type)
    ):
        return False

    existing_org = normalize_organization(
        existing.organization
    )

    incoming_org = normalize_organization(
        incoming.organization
    )

    titles_match = titles_are_similar(
        existing.title,
        incoming.title,
    )

    dates_match = start_dates_are_compatible(
        existing.start_date,
        incoming.start_date,
    )

    if not titles_match or not dates_match:
        return False

    # Experiences tied to organizations should have
    # the same normalized organization.
    if existing_org or incoming_org:
        return (
            bool(existing_org)
            and bool(incoming_org)
            and existing_org == incoming_org
        )

    # Projects may have no organization, so title + date
    # can be enough.
    return True


def merge_experience(
    db: Session,
    existing: Experience,
    incoming,
) -> tuple[bool, int, int]:
    changed = False
    bullets_created = 0
    bullets_skipped = 0

    if (
        not existing.organization
        and incoming.organization
    ):
        existing.organization = (
            incoming.organization.strip()
        )

        changed = True

    if (
        not existing.location
        and incoming.location
    ):
        existing.location = (
            incoming.location.strip()
        )

        changed = True

    if (
        existing.start_date is None
        and incoming.start_date is not None
    ):
        existing.start_date = incoming.start_date
        changed = True

    if (
        existing.end_date is None
        and incoming.end_date is not None
    ):
        existing.end_date = incoming.end_date
        changed = True

    if (
        not existing.description
        and incoming.description
    ):
        existing.description = (
            incoming.description.strip()
        )

        changed = True

    existing_bullets = {
        normalize_bullet_text(
            bullet.bullet_text
        )
        for bullet in existing.bullets
    }

    for bullet_text in incoming.bullets:
        cleaned_bullet = bullet_text.strip()

        if not cleaned_bullet:
            continue

        normalized_bullet = normalize_bullet_text(
            cleaned_bullet
        )

        if normalized_bullet in existing_bullets:
            bullets_skipped += 1
            continue

        bullet = ExperienceBullet(
            experience_id=existing.id,
            bullet_text=cleaned_bullet,
        )

        db.add(bullet)

        existing_bullets.add(
            normalized_bullet
        )

        bullets_created += 1
        changed = True

    return (
        changed,
        bullets_created,
        bullets_skipped,
    )


# -------------------------------------------------------------------
# Main confirmation function
# -------------------------------------------------------------------


def confirm_resume_import(
    db: Session,
    proposal: ResumeImportProposal,
) -> dict:
    education_created = 0
    education_merged = 0
    education_skipped = 0

    experiences_created = 0
    experiences_merged = 0
    experiences_skipped = 0

    bullets_created = 0
    bullets_skipped = 0

    skills_created = 0
    skills_merged = 0
    skills_skipped = 0

    links_created = 0
    links_skipped = 0

    profile_updated = False

    try:
        # -----------------------------------------------------------
        # Education
        # -----------------------------------------------------------

        existing_education_entries = (
            db.query(Education).all()
        )

        for education_data in proposal.education:
            matching_education = next(
                (
                    education
                    for education
                    in existing_education_entries
                    if education_matches(
                        education,
                        education_data,
                    )
                ),
                None,
            )

            if matching_education is not None:
                changed = merge_education(
                    matching_education,
                    education_data,
                )

                if changed:
                    education_merged += 1
                else:
                    education_skipped += 1

                continue

            education = Education(
                school=education_data.school.strip(),
                degree=clean_optional(
                    education_data.degree
                ),
                field_of_study=clean_optional(
                    education_data.field_of_study
                ),
                minor=clean_optional(
                    education_data.minor
                ),
                location=clean_optional(
                    education_data.location
                ),
                start_date=education_data.start_date,
                graduation_date=(
                    education_data.graduation_date
                ),
                gpa=clean_optional(
                    education_data.gpa
                ),
                coursework=(
                    "\n".join(
                        course.strip()
                        for course
                        in education_data.coursework
                        if course.strip()
                    )
                    or None
                ),
                honors=(
                    "\n".join(
                        honor.strip()
                        for honor
                        in education_data.honors
                        if honor.strip()
                    )
                    or None
                ),
            )

            db.add(education)
            db.flush()

            existing_education_entries.append(
                education
            )

            education_created += 1

        # -----------------------------------------------------------
        # Experiences
        # -----------------------------------------------------------

        existing_experience_entries = (
            db.query(Experience).all()
        )

        for experience_data in proposal.experiences:
            matching_experience = next(
                (
                    experience
                    for experience
                    in existing_experience_entries
                    if experience_matches(
                        experience,
                        experience_data,
                    )
                ),
                None,
            )

            if matching_experience is not None:
                (
                    changed,
                    new_bullets,
                    skipped_bullets,
                ) = merge_experience(
                    db,
                    matching_experience,
                    experience_data,
                )

                bullets_created += new_bullets
                bullets_skipped += skipped_bullets

                if changed:
                    experiences_merged += 1
                else:
                    experiences_skipped += 1

                continue

            experience = Experience(
                type=experience_data.type.strip(),
                organization=clean_optional(
                    experience_data.organization
                ),
                title=experience_data.title.strip(),
                location=clean_optional(
                    experience_data.location
                ),
                start_date=experience_data.start_date,
                end_date=experience_data.end_date,
                description=clean_optional(
                    experience_data.description
                ),
            )

            db.add(experience)
            db.flush()

            existing_experience_entries.append(
                experience
            )

            for bullet_text in experience_data.bullets:
                cleaned_bullet = bullet_text.strip()

                if not cleaned_bullet:
                    continue

                bullet = ExperienceBullet(
                    experience_id=experience.id,
                    bullet_text=cleaned_bullet,
                )

                db.add(bullet)
                bullets_created += 1

            experiences_created += 1

        # -----------------------------------------------------------
        # Skills
        # -----------------------------------------------------------

        existing_skills = db.query(Skill).all()

        skills_by_name = {
            normalize_text(skill.name): skill
            for skill in existing_skills
        }

        for skill_data in proposal.skills:
            cleaned_name = skill_data.name.strip()

            if not cleaned_name:
                continue

            normalized_name = normalize_text(
                cleaned_name
            )

            existing_skill = skills_by_name.get(
                normalized_name
            )

            if existing_skill is not None:
                incoming_category = clean_optional(
                    skill_data.category
                )

                if (
                    not existing_skill.category
                    and incoming_category
                ):
                    existing_skill.category = (
                        incoming_category
                    )

                    skills_merged += 1
                else:
                    skills_skipped += 1

                continue

            skill = Skill(
                name=cleaned_name,
                category=clean_optional(
                    skill_data.category
                ),
            )

            db.add(skill)
            db.flush()

            skills_by_name[
                normalized_name
            ] = skill

            skills_created += 1

        # -----------------------------------------------------------
        # Profile
        # -----------------------------------------------------------

        profile = db.query(UserProfile).first()

        incoming_name = clean_optional(
            proposal.profile.name
        )

        incoming_phone = clean_optional(
            proposal.profile.phone
        )

        incoming_email = clean_optional(
            proposal.profile.email
        )

        if profile is None:
            # Name is required by the database.
            # If the parser could not identify one,
            # do not create a blank profile.
            if incoming_name:
                profile = UserProfile(
                    name=incoming_name,
                    phone=incoming_phone,
                    email=incoming_email,
                )

                db.add(profile)
                db.flush()

                profile_updated = True

        else:
            if (
                incoming_name
                and profile.name != incoming_name
            ):
                profile.name = incoming_name
                profile_updated = True

            if (
                incoming_phone
                and profile.phone != incoming_phone
            ):
                profile.phone = incoming_phone
                profile_updated = True

            if (
                incoming_email
                and profile.email != incoming_email
            ):
                profile.email = incoming_email
                profile_updated = True

        # -----------------------------------------------------------
        # Profile links
        # -----------------------------------------------------------

        if profile is not None:
            existing_links = {
                normalize_url(link.url): link
                for link in profile.links
                if link.url
            }

            for link_data in proposal.profile.links:
                cleaned_url = clean_optional(
                    link_data.url
                )

                if not cleaned_url:
                    continue

                normalized_link = normalize_url(
                    cleaned_url
                )

                if normalized_link in existing_links:
                    existing_link = existing_links[
                        normalized_link
                    ]

                    incoming_label = clean_optional(
                        link_data.label
                    )

                    if (
                        incoming_label
                        and not existing_link.label
                    ):
                        existing_link.label = (
                            incoming_label
                        )

                        profile_updated = True

                    links_skipped += 1
                    continue

                link = ProfileLink(
                    profile_id=profile.id,
                    label=(
                        clean_optional(
                            link_data.label
                        )
                        or normalized_link
                    ),
                    url=cleaned_url,
                )

                db.add(link)
                db.flush()

                existing_links[
                    normalized_link
                ] = link

                links_created += 1
                profile_updated = True

        # -----------------------------------------------------------
        # Commit everything as one transaction
        # -----------------------------------------------------------

        db.commit()

    except Exception:
        db.rollback()
        raise

    return {
        "status": "confirmed",
        "education_created": education_created,
        "education_merged": education_merged,
        "education_skipped": education_skipped,
        "experiences_created": experiences_created,
        "experiences_merged": experiences_merged,
        "experiences_skipped": experiences_skipped,
        "bullets_created": bullets_created,
        "bullets_skipped": bullets_skipped,
        "skills_created": skills_created,
        "skills_merged": skills_merged,
        "skills_skipped": skills_skipped,
        "links_created": links_created,
        "links_skipped": links_skipped,
        "profile_updated": profile_updated,
    }