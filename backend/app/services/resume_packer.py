from dataclasses import dataclass

from app.schemas.resume import (
    ResumeAlternate,
    ResumeSection,
    ResumeSectionItem,
    TailoredResumeDocument,
)


# -------------------------------------------------------------------
# Adaptive resume packing configuration
# -------------------------------------------------------------------

SPACIOUS_THRESHOLD = 15.0
BALANCED_THRESHOLD = 24.0

MAX_CONTENT_SCORE = 32.0


# Approximate vertical cost of different pieces of resume content.
#
# These are not literal inches or lines. They are relative density
# units that let Naomatch compare how much content a tailored resume
# contains before rendering it.
SECTION_BASE_COST = 1.0
ENTRY_BASE_COST = 1.6
BULLET_BASE_COST = 1.0
SKILL_CATEGORY_COST = 0.7
COURSEWORK_ITEM_COST = 0.25
HONOR_ITEM_COST = 0.3


SECTION_PRIORITY = {
    "education": 100,
    "experience": 95,
    "research": 85,
    "projects": 80,
    "project": 80,
    "leadership": 65,
    "volunteer": 55,
    "certifications": 50,
    "awards": 45,
    "skills": 90,
    "technical_skills": 90,
}


@dataclass
class PackedResume:
    resume: TailoredResumeDocument
    layout_profile: str
    content_score: float
    trimmed: bool


# -------------------------------------------------------------------
# Density estimation
# -------------------------------------------------------------------


def estimate_bullet_cost(
    bullet: str,
) -> float:
    """
    Estimate how much vertical space a bullet will consume.

    Longer bullets receive a slightly larger cost because they are
    more likely to wrap across multiple lines in the PDF.
    """

    word_count = len(
        bullet.split()
    )

    if word_count <= 18:
        return BULLET_BASE_COST

    if word_count <= 32:
        return BULLET_BASE_COST + 0.35

    if word_count <= 48:
        return BULLET_BASE_COST + 0.7

    return BULLET_BASE_COST + 1.0


def estimate_item_cost(
    item: ResumeSectionItem,
    section_type: str,
) -> float:
    cost = ENTRY_BASE_COST

    if section_type in {
        "skills",
        "technical_skills",
    }:
        return SKILL_CATEGORY_COST

    for bullet in item.bullets:
        cost += estimate_bullet_cost(
            bullet
        )

    cost += (
        len(item.coursework)
        * COURSEWORK_ITEM_COST
    )

    cost += (
        len(item.honors)
        * HONOR_ITEM_COST
    )

    return cost


def estimate_section_cost(
    section: ResumeSection,
) -> float:
    cost = SECTION_BASE_COST

    for item in section.items:
        cost += estimate_item_cost(
            item,
            section.section_type,
        )

    return cost


def estimate_resume_content(
    resume: TailoredResumeDocument,
) -> float:
    return round(
        sum(
            estimate_section_cost(
                section
            )
            for section in resume.sections
        ),
        2,
    )


# -------------------------------------------------------------------
# Layout selection
# -------------------------------------------------------------------


def choose_layout_profile(
    content_score: float,
) -> str:
    """
    Pick the initial visual density for the resume.

    spacious:
        High-quality content exists, but there is less of it.
        Give the resume more breathing room.

    balanced:
        Normal one-page resume density.

    compact:
        Large amount of relevant evidence needs to fit on one page.
    """

    if (
        content_score
        <= SPACIOUS_THRESHOLD
    ):
        return "spacious"

    if (
        content_score
        <= BALANCED_THRESHOLD
    ):
        return "balanced"

    return "compact"


# -------------------------------------------------------------------
# Content trimming helpers
# -------------------------------------------------------------------


def get_section_priority(
    section_type: str,
) -> int:
    return SECTION_PRIORITY.get(
        section_type,
        40,
    )


def removable_bullet_candidates(
    resume: TailoredResumeDocument,
) -> list[
    tuple[
        int,
        int,
        int,
        int,
    ]
]:
    """
    Return removable bullets ordered from lowest priority to highest.

    Tuple format:
        (
            section_priority,
            section_index,
            item_index,
            bullet_index,
        )

    The AI tailoring stage is expected to order stronger evidence
    before weaker evidence, so bullets later in an entry are treated
    as more removable than bullets near the top.

    We always preserve at least one bullet per selected entry.
    """

    candidates = []

    for section_index, section in enumerate(
        resume.sections
    ):
        if section.section_type in {
            "education",
            "skills",
            "technical_skills",
        }:
            continue

        section_priority = (
            get_section_priority(
                section.section_type
            )
        )

        for item_index, item in enumerate(
            section.items
        ):
            if len(item.bullets) <= 1:
                continue

            for bullet_index in range(
                len(item.bullets) - 1,
                0,
                -1,
            ):
                candidates.append(
                    (
                        section_priority,
                        section_index,
                        item_index,
                        bullet_index,
                    )
                )

    return sorted(
        candidates,
        key=lambda candidate: (
            candidate[0],
            -candidate[3],
        ),
    )


def remove_lowest_priority_bullet(
    resume: TailoredResumeDocument,
) -> bool:
    candidates = (
        removable_bullet_candidates(
            resume
        )
    )

    if not candidates:
        return False

    (
        _,
        section_index,
        item_index,
        bullet_index,
    ) = candidates[0]

    item = resume.sections[
        section_index
    ].items[item_index]

    item.bullets.pop(
        bullet_index
    )

    return True


def removable_entry_candidates(
    resume: TailoredResumeDocument,
) -> list[
    tuple[
        int,
        int,
        int,
    ]
]:
    """
    Identify entries that can be removed if bullet trimming alone
    cannot fit the resume.

    Education and Skills are protected.

    We also preserve at least one entry in every selected section.
    """

    candidates = []

    for section_index, section in enumerate(
        resume.sections
    ):
        if section.section_type in {
            "education",
            "skills",
            "technical_skills",
        }:
            continue

        if len(section.items) <= 1:
            continue

        priority = get_section_priority(
            section.section_type
        )

        # Later entries are assumed to be lower priority because the
        # tailoring model should return strongest entries first.
        for item_index in range(
            len(section.items) - 1,
            0,
            -1,
        ):
            candidates.append(
                (
                    priority,
                    section_index,
                    item_index,
                )
            )

    return sorted(
        candidates,
        key=lambda candidate: (
            candidate[0],
            -candidate[2],
        ),
    )


def remove_lowest_priority_entry(
    resume: TailoredResumeDocument,
) -> bool:
    candidates = (
        removable_entry_candidates(
            resume
        )
    )

    if not candidates:
        return False

    (
        _,
        section_index,
        item_index,
    ) = candidates[0]

    resume.sections[
        section_index
    ].items.pop(
        item_index
    )

    return True


# -------------------------------------------------------------------
# Resume packing
# -------------------------------------------------------------------


def pack_tailored_resume(
    tailored_resume: TailoredResumeDocument,
) -> PackedResume:
    """
    Prepare a tailored resume for one-page rendering.

    The tailoring model decides WHAT content is most relevant.

    The packer decides HOW MUCH of that selected content should be
    rendered and which spacing profile should be used.

    The original TailoredResumeDocument is never modified.
    """

    packed_resume = (
        tailored_resume.model_copy(
            deep=True
        )
    )

    content_score = (
        estimate_resume_content(
            packed_resume
        )
    )

    trimmed = False

    # ---------------------------------------------------------------
    # First pass:
    # Remove lower-priority bullets while the resume is clearly
    # beyond the target content budget.
    # ---------------------------------------------------------------

    while (
        content_score
        > MAX_CONTENT_SCORE
    ):
        removed = (
            remove_lowest_priority_bullet(
                packed_resume
            )
        )

        if not removed:
            break

        trimmed = True

        content_score = (
            estimate_resume_content(
                packed_resume
            )
        )

    # ---------------------------------------------------------------
    # Second pass:
    # If the document is still significantly over budget after
    # trimming bullets, remove the lowest-priority extra entries.
    # ---------------------------------------------------------------

    while (
        content_score
        > MAX_CONTENT_SCORE
    ):
        removed = (
            remove_lowest_priority_entry(
                packed_resume
            )
        )

        if not removed:
            break

        trimmed = True

        content_score = (
            estimate_resume_content(
                packed_resume
            )
        )

    layout_profile = (
        choose_layout_profile(
            content_score
        )
    )

    return PackedResume(
        resume=packed_resume,
        layout_profile=layout_profile,
        content_score=round(
            content_score,
            2,
        ),
        trimmed=trimmed,
    )

def trim_resume_once(
    resume: TailoredResumeDocument,
) -> bool:
    """
    Remove one lowest-priority piece of content.

    Bullet-level trimming is always attempted before removing
    an entire entry.

    Returns True when something was removed.
    Returns False when no additional safe trimming is possible.
    """

    removed_bullet = (
        remove_lowest_priority_bullet(
            resume
        )
    )

    if removed_bullet:
        return True

    return remove_lowest_priority_entry(
        resume
    )

# -------------------------------------------------------------------
# Alternate evidence promotion
# -------------------------------------------------------------------


def find_resume_section(
    resume: TailoredResumeDocument,
    section_type: str,
) -> ResumeSection | None:
    """
    Find an existing presentation section by its section type.
    """

    for section in resume.sections:
        if (
            section.section_type
            == section_type
        ):
            return section

    return None


def resume_contains_item(
    resume: TailoredResumeDocument,
    item: ResumeSectionItem,
) -> bool:
    """
    Prevent the same Vault entry from being inserted twice.

    Vault-backed entries are primarily identified by their database ID.
    """

    if item.id is None:
        return False

    for section in resume.sections:
        for existing_item in section.items:
            if (
                existing_item.id
                == item.id
                and existing_item.source_section_type
                == item.source_section_type
            ):
                return True

    return False


def add_section_to_order(
    resume: TailoredResumeDocument,
    section_type: str,
) -> None:
    """
    Add a newly created section to section_order while keeping
    Technical Skills at the bottom whenever possible.
    """

    if (
        section_type
        in resume.section_order
    ):
        return

    skills_types = {
        "skills",
        "technical_skills",
    }

    for index, existing_type in enumerate(
        resume.section_order
    ):
        if existing_type in skills_types:
            resume.section_order.insert(
                index,
                section_type,
            )
            return

    resume.section_order.append(
        section_type
    )


def promote_alternate(
    resume: TailoredResumeDocument,
    alternate: ResumeAlternate,
) -> bool:
    """
    Promote one AI-ranked alternate into the resume.

    The function mutates the supplied resume and returns True when
    the alternate was successfully inserted.

    It returns False if that Vault item is already represented.
    """

    if resume_contains_item(
        resume,
        alternate.item,
    ):
        return False

    target_section = (
        find_resume_section(
            resume,
            alternate.section_type,
        )
    )

    promoted_item = (
        alternate.item.model_copy(
            deep=True
        )
    )

    if target_section is not None:
        target_section.items.append(
            promoted_item
        )

        return True

    new_section = ResumeSection(
        section_type=(
            alternate.section_type
        ),
        title=(
            alternate.section_title
        ),
        items=[
            promoted_item
        ],
    )

    resume.sections.append(
        new_section
    )

    add_section_to_order(
        resume,
        alternate.section_type,
    )

    return True


def build_resume_with_alternate(
    resume: TailoredResumeDocument,
    alternate: ResumeAlternate,
) -> TailoredResumeDocument | None:
    """
    Build a safe candidate resume containing one additional alternate.

    The original resume is never modified.

    Returning a copy is important because the PDF optimizer can render
    this candidate, measure it, and reject it without needing to undo
    mutations to the currently accepted resume.
    """

    candidate_resume = (
        resume.model_copy(
            deep=True
        )
    )

    promoted = promote_alternate(
        candidate_resume,
        alternate,
    )

    if not promoted:
        return None

    return candidate_resume