import re

from app.schemas.resume import (
    ResumeSectionItem,
    TailoredResumeDocument,
)


# -------------------------------------------------------------------
# Validation configuration
# -------------------------------------------------------------------

# If a rewritten bullet has meaningful content but shares almost
# nothing with its trusted Vault entry, treat it as insufficiently
# grounded and fall back to the closest original bullet.
MIN_SOURCE_TOKEN_OVERLAP = 0.15


CONTENT_STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "been",
    "being",
    "by",
    "for",
    "from",
    "had",
    "has",
    "have",
    "in",
    "into",
    "is",
    "it",
    "of",
    "on",
    "or",
    "that",
    "the",
    "their",
    "this",
    "to",
    "using",
    "used",
    "was",
    "were",
    "while",
    "with",
}


# Common technical terms that should never appear in a rewritten
# bullet unless the corresponding Vault entry actually supports them.
#
# Capitalized/acronym terms are also detected generically below,
# so this primarily catches lowercase/common spellings.
TECH_FACT_TERMS = {
    "aws",
    "azure",
    "gcp",
    "google cloud",
    "cloud",
    "kubernetes",
    "docker",
    "terraform",
    "ansible",
    "jenkins",
    "github actions",
    "gitlab",
    "ci/cd",
    "spark",
    "pyspark",
    "snowflake",
    "databricks",
    "dataiku",
    "alteryx",
    "airflow",
    "kafka",
    "redis",
    "mongodb",
    "mysql",
    "postgresql",
    "postgres",
    "sqlite",
    "sql",
    "java",
    "python",
    "javascript",
    "typescript",
    "c++",
    "c/c++",
    "golang",
    "react",
    "angular",
    "node.js",
    "nodejs",
    "fastapi",
    "flask",
    "django",
    "spring",
    "gradle",
    "junit",
    "pandas",
    "numpy",
    "scikit-learn",
    "sklearn",
    "matplotlib",
    "tableau",
    "power bi",
    "power apps",
    "power automate",
    "machine learning",
    "deep learning",
    "distributed systems",
    "systems design",
    "data structures",
    "algorithms",
}


# -------------------------------------------------------------------
# General normalization
# -------------------------------------------------------------------


def normalize_text(
    value: str,
) -> str:
    return " ".join(
        value
        .strip()
        .lower()
        .split()
    )


def normalize_skill_name(
    value: str,
) -> str:
    return normalize_text(
        value
    )


def normalize_content_token(
    token: str,
) -> str:
    token = (
        token
        .strip()
        .lower()
    )

    for suffix in (
        "ing",
        "ed",
        "es",
        "s",
    ):
        if (
            token.endswith(suffix)
            and len(token) - len(suffix)
            >= 4
        ):
            token = token[
                : -len(suffix)
            ]

            break

    return token


def content_tokens(
    text: str,
) -> set[str]:
    raw_tokens = re.findall(
        r"[A-Za-z0-9+#./&-]+",
        text,
    )

    tokens = set()

    for token in raw_tokens:
        normalized = (
            normalize_content_token(
                token
            )
        )

        if not normalized:
            continue

        if normalized in (
            CONTENT_STOP_WORDS
        ):
            continue

        tokens.add(
            normalized
        )

    return tokens


# -------------------------------------------------------------------
# Vault lookups
# -------------------------------------------------------------------


def build_vault_item_lookup(
    vault_sections: list[dict],
) -> dict[
    tuple[str, int],
    dict,
]:
    """
    Build a trusted lookup using:
        (canonical source section type, Vault ID)
    """

    lookup = {}

    for section in vault_sections:
        section_type = section.get(
            "section_type"
        )

        if not section_type:
            continue

        for item in section.get(
            "items",
            [],
        ):
            item_id = item.get(
                "id"
            )

            if item_id is None:
                continue

            lookup[
                (
                    section_type,
                    item_id,
                )
            ] = item

    return lookup


def get_source_item(
    item: ResumeSectionItem,
    vault_lookup: dict,
) -> dict | None:
    if item.id is None:
        return None

    if not item.source_section_type:
        return None

    return vault_lookup.get(
        (
            item.source_section_type,
            item.id,
        )
    )


def build_source_text(
    source_item: dict,
) -> str:
    """
    Build the full trusted text representation of one Vault entry.
    """

    parts: list[str] = []

    scalar_fields = (
        "title",
        "name",
        "organization",
        "location",
        "description",
        "school",
        "degree",
        "field_of_study",
        "minor",
        "gpa",
    )

    for field in scalar_fields:
        value = source_item.get(
            field
        )

        if value:
            parts.append(
                str(value)
            )

    for list_field in (
        "bullets",
        "technologies",
        "coursework",
        "honors",
        "skills",
    ):
        for value in source_item.get(
            list_field,
            [],
        ):
            if value:
                parts.append(
                    str(value)
                )

    return " ".join(
        parts
    )


# -------------------------------------------------------------------
# Explicit Vault skills
# -------------------------------------------------------------------


def get_explicit_vault_skills(
    vault_sections: list[dict],
) -> dict[str, str]:
    """
    Return:
        normalized skill -> canonical Vault spelling
    """

    allowed_skills: dict[
        str,
        str,
    ] = {}

    for section in vault_sections:
        if (
            section.get(
                "section_type"
            )
            != "skills"
        ):
            continue

        for item in section.get(
            "items",
            [],
        ):
            for skill in item.get(
                "skills",
                [],
            ):
                normalized = (
                    normalize_skill_name(
                        skill
                    )
                )

                if normalized:
                    allowed_skills[
                        normalized
                    ] = skill

    return allowed_skills


# -------------------------------------------------------------------
# Numeric / quantitative evidence
# -------------------------------------------------------------------


def extract_numeric_facts(
    text: str,
) -> set[str]:
    """
    Examples detected:
        70%
        $900K
        20M+
        2.7x
        800K+
        123B
        10
    """

    matches = re.findall(
        r"""
        \$?
        \d+(?:\.\d+)?
        (?:k|m|b|t)?
        \+?
        %?
        x?
        """,
        text,
        flags=(
            re.IGNORECASE
            | re.VERBOSE
        ),
    )

    return {
        normalize_text(
            match
        )
        for match in matches
        if match.strip()
    }


# -------------------------------------------------------------------
# Technical / named factual evidence
# -------------------------------------------------------------------


def extract_known_tech_facts(
    text: str,
) -> set[str]:
    normalized_text = (
        normalize_text(
            text
        )
    )

    found = set()

    for term in TECH_FACT_TERMS:
        pattern = (
            r"(?<![A-Za-z0-9])"
            + re.escape(term)
            + r"(?![A-Za-z0-9])"
        )

        if re.search(
            pattern,
            normalized_text,
            flags=re.IGNORECASE,
        ):
            found.add(
                term
            )

    return found


def is_sentence_initial(
    text: str,
    start_index: int,
) -> bool:
    prefix = text[
        :start_index
    ].rstrip()

    if not prefix:
        return True

    return prefix.endswith(
        (
            ".",
            "!",
            "?",
            ":",
            ";",
        )
    )


def extract_named_facts(
    text: str,
) -> set[str]:
    """
    Detect suspicious factual names that should be grounded in the
    Vault entry.

    Examples:
        AWS
        CI/CD
        ETL
        DriveSafe
        Kubernetes
        Snowflake
        Dataiku

    Sentence-initial ordinary capitalized words are ignored.
    """

    found = set()

    token_pattern = re.compile(
        r"[A-Za-z][A-Za-z0-9+#./&-]*"
    )

    for match in (
        token_pattern.finditer(text)
    ):
        token = match.group(0)

        if len(token) <= 1:
            continue

        has_internal_uppercase = any(
            character.isupper()
            for character
            in token[1:]
        )

        is_acronym = (
            token.isupper()
            and len(token) >= 2
        )

        has_technical_symbol = any(
            symbol in token
            for symbol in (
                "+",
                "/",
                "#",
            )
        )

        is_mid_sentence_titlecase = (
            token[0].isupper()
            and not is_sentence_initial(
                text,
                match.start(),
            )
        )

        if (
            is_acronym
            or has_internal_uppercase
            or has_technical_symbol
            or is_mid_sentence_titlecase
        ):
            found.add(
                normalize_text(
                    token
                )
            )

    return found


def extract_high_risk_facts(
    text: str,
) -> set[str]:
    facts = set()

    facts.update(
        extract_numeric_facts(
            text
        )
    )

    facts.update(
        extract_known_tech_facts(
            text
        )
    )

    facts.update(
        extract_named_facts(
            text
        )
    )

    return facts


# -------------------------------------------------------------------
# Bullet grounding
# -------------------------------------------------------------------


def source_fact_tokens(
    source_item: dict,
) -> set[str]:
    return extract_high_risk_facts(
        build_source_text(
            source_item
        )
    )


def bullet_fact_tokens(
    bullet: str,
) -> set[str]:
    return extract_high_risk_facts(
        bullet
    )


def bullet_source_overlap(
    bullet: str,
    source_item: dict,
) -> float:
    """
    Lightweight semantic-grounding check.

    This does NOT attempt full semantic entailment. It only catches
    rewrites that have almost no meaningful lexical connection to
    the trusted source entry.
    """

    candidate_tokens = (
        content_tokens(
            bullet
        )
    )

    if not candidate_tokens:
        return 1.0

    source_tokens = (
        content_tokens(
            build_source_text(
                source_item
            )
        )
    )

    if not source_tokens:
        return 0.0

    overlap = (
        candidate_tokens
        & source_tokens
    )

    return (
        len(overlap)
        / len(candidate_tokens)
    )


def bullet_is_factually_supported(
    bullet: str,
    source_item: dict,
) -> bool:
    """
    A rewrite is accepted only if:

    1. Every high-risk factual token is supported by the source entry.
    2. The rewrite retains reasonable lexical grounding in the source.
    """

    candidate_facts = (
        bullet_fact_tokens(
            bullet
        )
    )

    allowed_facts = (
        source_fact_tokens(
            source_item
        )
    )

    if not candidate_facts.issubset(
        allowed_facts
    ):
        return False

    overlap = (
        bullet_source_overlap(
            bullet,
            source_item,
        )
    )

    if (
        len(content_tokens(bullet))
        >= 6
        and overlap
        < MIN_SOURCE_TOKEN_OVERLAP
    ):
        return False

    return True


# -------------------------------------------------------------------
# Bullet fallback / duplicate handling
# -------------------------------------------------------------------


def bullet_similarity(
    candidate: str,
    source_bullet: str,
) -> float:
    candidate_tokens = (
        content_tokens(
            candidate
        )
    )

    source_tokens = (
        content_tokens(
            source_bullet
        )
    )

    if not candidate_tokens:
        return 0.0

    if not source_tokens:
        return 0.0

    overlap = (
        candidate_tokens
        & source_tokens
    )

    union = (
        candidate_tokens
        | source_tokens
    )

    if not union:
        return 0.0

    return (
        len(overlap)
        / len(union)
    )


def closest_source_bullet(
    generated_bullet: str,
    source_item: dict,
) -> str | None:
    source_bullets = (
        source_item.get(
            "bullets",
            [],
        )
    )

    if not source_bullets:
        return None

    return max(
        source_bullets,
        key=lambda source_bullet: (
            bullet_similarity(
                generated_bullet,
                source_bullet,
            )
        ),
    )


def deduplicate_bullets(
    bullets: list[str],
) -> list[str]:
    """
    Remove exact normalized duplicates while preserving order.

    Semantic redundancy remains the responsibility of
    resume_packer.py.
    """

    result = []
    seen = set()

    for bullet in bullets:
        normalized = (
            normalize_text(
                bullet
            )
        )

        if not normalized:
            continue

        if normalized in seen:
            continue

        seen.add(
            normalized
        )

        result.append(
            bullet
        )

    return result


def validate_item_bullets(
    item: ResumeSectionItem,
    source_item: dict,
) -> None:
    validated_bullets = []

    for bullet in item.bullets:
        if bullet_is_factually_supported(
            bullet,
            source_item,
        ):
            validated_bullets.append(
                bullet
            )

            continue

        fallback = (
            closest_source_bullet(
                bullet,
                source_item,
            )
        )

        if fallback:
            validated_bullets.append(
                fallback
            )

    item.bullets = (
        deduplicate_bullets(
            validated_bullets
        )
    )


# -------------------------------------------------------------------
# Identity validation
# -------------------------------------------------------------------


def restore_entry_identity(
    item: ResumeSectionItem,
    source_item: dict,
) -> None:
    """
    Gemini may choose presentation placement, but it may not rewrite
    the factual identity of the underlying Vault entry.
    """

    fields = (
        "title",
        "organization",
        "location",
        "start_date",
        "end_date",
        "description",
    )

    for field in fields:
        if hasattr(
            item,
            field,
        ):
            setattr(
                item,
                field,
                source_item.get(
                    field
                ),
            )

    # Projects may expose name/date convenience fields in the schema.
    # Rendering should derive the date from trusted start/end dates.
    if hasattr(
        item,
        "name",
    ):
        source_name = (
            source_item.get(
                "name"
            )
        )

        item.name = source_name

    if hasattr(
        item,
        "date",
    ):
        item.date = None


# -------------------------------------------------------------------
# Education validation
# -------------------------------------------------------------------


def filter_against_source_list(
    generated_values: list[str],
    source_values: list[str],
) -> list[str]:
    canonical = {
        normalize_text(value): value
        for value in source_values
    }

    result = []
    seen = set()

    for value in generated_values:
        normalized = (
            normalize_text(
                value
            )
        )

        if (
            normalized
            not in canonical
        ):
            continue

        if normalized in seen:
            continue

        seen.add(
            normalized
        )

        result.append(
            canonical[
                normalized
            ]
        )

    return result


def validate_education_item(
    item: ResumeSectionItem,
    source_item: dict,
) -> None:
    trusted_fields = (
        "school",
        "degree",
        "field_of_study",
        "minor",
        "location",
        "start_date",
        "graduation_date",
        "gpa",
    )

    for field in trusted_fields:
        if hasattr(
            item,
            field,
        ):
            setattr(
                item,
                field,
                source_item.get(
                    field
                ),
            )

    item.coursework = (
        filter_against_source_list(
            item.coursework,
            source_item.get(
                "coursework",
                [],
            ),
        )
    )

    item.honors = (
        filter_against_source_list(
            item.honors,
            source_item.get(
                "honors",
                [],
            ),
        )
    )


# -------------------------------------------------------------------
# Technologies validation
# -------------------------------------------------------------------


def get_source_supported_technologies(
    source_item: dict,
    explicit_vault_skills:
        dict[str, str],
) -> dict[str, str]:
    """
    Technologies are allowed when either:

    1. They are explicitly stored on the Vault item.
    2. They are explicit Vault skills AND are actually mentioned in
       the source item text.
    """

    supported = {}

    for technology in source_item.get(
        "technologies",
        [],
    ):
        normalized = (
            normalize_skill_name(
                technology
            )
        )

        if normalized:
            supported[
                normalized
            ] = technology

    source_text = (
        normalize_text(
            build_source_text(
                source_item
            )
        )
    )

    for (
        normalized_skill,
        canonical_skill,
    ) in explicit_vault_skills.items():
        pattern = (
            r"(?<![A-Za-z0-9])"
            + re.escape(
                normalized_skill
            )
            + r"(?![A-Za-z0-9])"
        )

        if re.search(
            pattern,
            source_text,
            flags=re.IGNORECASE,
        ):
            supported[
                normalized_skill
            ] = canonical_skill

    return supported


def validate_item_technologies(
    item: ResumeSectionItem,
    source_item: dict,
    explicit_vault_skills:
        dict[str, str],
) -> None:
    supported = (
        get_source_supported_technologies(
            source_item,
            explicit_vault_skills,
        )
    )

    validated = []
    seen = set()

    for technology in (
        item.technologies
    ):
        normalized = (
            normalize_skill_name(
                technology
            )
        )

        if (
            normalized
            not in supported
        ):
            continue

        if normalized in seen:
            continue

        seen.add(
            normalized
        )

        validated.append(
            supported[
                normalized
            ]
        )

    item.technologies = (
        validated
    )


# -------------------------------------------------------------------
# Technical Skills validation
# -------------------------------------------------------------------


def validate_skills(
    tailored_resume:
        TailoredResumeDocument,
    explicit_vault_skills:
        dict[str, str],
) -> None:
    # skills_to_emphasize
    validated_emphasis = []
    seen_emphasis = set()

    for skill in (
        tailored_resume
        .skills_to_emphasize
    ):
        normalized = (
            normalize_skill_name(
                skill
            )
        )

        if (
            normalized
            not in explicit_vault_skills
        ):
            continue

        if (
            normalized
            in seen_emphasis
        ):
            continue

        seen_emphasis.add(
            normalized
        )

        validated_emphasis.append(
            explicit_vault_skills[
                normalized
            ]
        )

    tailored_resume.skills_to_emphasize = (
        validated_emphasis
    )

    # Rendered Technical Skills section
    for section in (
        tailored_resume.sections
    ):
        if section.section_type not in {
            "skills",
            "technical_skills",
        }:
            continue

        validated_items = []

        for item in section.items:
            validated_skills = []
            seen = set()

            for skill in item.skills:
                normalized = (
                    normalize_skill_name(
                        skill
                    )
                )

                if (
                    normalized
                    not in explicit_vault_skills
                ):
                    continue

                if normalized in seen:
                    continue

                seen.add(
                    normalized
                )

                validated_skills.append(
                    explicit_vault_skills[
                        normalized
                    ]
                )

            if not validated_skills:
                continue

            item.skills = (
                validated_skills
            )

            validated_items.append(
                item
            )

        section.items = (
            validated_items
        )


# -------------------------------------------------------------------
# Primary / alternate entry validation
# -------------------------------------------------------------------


def validate_standard_item(
    item: ResumeSectionItem,
    vault_lookup: dict,
    explicit_vault_skills:
        dict[str, str],
) -> bool:
    """
    Return False when an item cannot be traced back to the Vault.
    """

    source_item = (
        get_source_item(
            item,
            vault_lookup,
        )
    )

    if source_item is None:
        return False

    restore_entry_identity(
        item,
        source_item,
    )

    validate_item_technologies(
        item,
        source_item,
        explicit_vault_skills,
    )

    validate_item_bullets(
        item,
        source_item,
    )

    return True


def validate_primary_sections(
    tailored_resume:
        TailoredResumeDocument,
    vault_lookup: dict,
    explicit_vault_skills:
        dict[str, str],
) -> None:
    validated_sections = []

    for section in (
        tailored_resume.sections
    ):
        if section.section_type in {
            "skills",
            "technical_skills",
        }:
            validated_sections.append(
                section
            )

            continue

        validated_items = []

        for item in section.items:
            if (
                item.source_section_type
                == "education"
                or section.section_type
                == "education"
            ):
                source_item = (
                    get_source_item(
                        item,
                        vault_lookup,
                    )
                )

                if source_item is None:
                    continue

                validate_education_item(
                    item,
                    source_item,
                )

                validated_items.append(
                    item
                )

                continue

            valid = (
                validate_standard_item(
                    item,
                    vault_lookup,
                    explicit_vault_skills,
                )
            )

            if valid:
                validated_items.append(
                    item
                )

        section.items = (
            validated_items
        )

        if section.items:
            validated_sections.append(
                section
            )

    tailored_resume.sections = (
        validated_sections
    )


def validate_alternates(
    tailored_resume:
        TailoredResumeDocument,
    vault_lookup: dict,
    explicit_vault_skills:
        dict[str, str],
) -> None:
    validated_alternates = []
    seen_items = set()

    for alternate in (
        tailored_resume.alternate_items
    ):
        item = alternate.item

        valid = (
            validate_standard_item(
                item,
                vault_lookup,
                explicit_vault_skills,
            )
        )

        if not valid:
            continue

        identity = (
            item.source_section_type,
            item.id,
        )

        if identity in seen_items:
            continue

        seen_items.add(
            identity
        )

        validated_alternates.append(
            alternate
        )

    tailored_resume.alternate_items = (
        validated_alternates
    )


# -------------------------------------------------------------------
# Section-order cleanup
# -------------------------------------------------------------------


def synchronize_section_order(
    tailored_resume:
        TailoredResumeDocument,
) -> None:
    existing_types = {
        section.section_type
        for section
        in tailored_resume.sections
    }

    ordered = []

    for section_type in (
        tailored_resume.section_order
    ):
        if (
            section_type
            not in existing_types
        ):
            continue

        if section_type in ordered:
            continue

        ordered.append(
            section_type
        )

    # Preserve any valid section Gemini returned but accidentally
    # omitted from section_order.
    for section in (
        tailored_resume.sections
    ):
        if (
            section.section_type
            not in ordered
        ):
            ordered.append(
                section.section_type
            )

    tailored_resume.section_order = (
        ordered
    )


# -------------------------------------------------------------------
# Public validator
# -------------------------------------------------------------------


def validate_tailored_resume(
    tailored_resume:
        TailoredResumeDocument,
    vault_sections: list[dict],
) -> TailoredResumeDocument:
    """
    Final deterministic trust boundary between Gemini and the
    resume-generation pipeline.

    Gemini decides:
        - relevance
        - section placement
        - wording
        - ordering

    The validator decides:
        - whether every selected item exists
        - whether identity/dates are accurate
        - whether education data is real
        - whether skills are explicitly allowed
        - whether project technologies are supported
        - whether high-risk bullet facts are supported
        - whether a rewrite remains reasonably grounded
        - whether exact duplicates should survive
    """

    validated_resume = (
        tailored_resume.model_copy(
            deep=True
        )
    )

    vault_lookup = (
        build_vault_item_lookup(
            vault_sections
        )
    )

    explicit_vault_skills = (
        get_explicit_vault_skills(
            vault_sections
        )
    )

    validate_primary_sections(
        validated_resume,
        vault_lookup,
        explicit_vault_skills,
    )

    validate_skills(
        validated_resume,
        explicit_vault_skills,
    )

    validate_alternates(
        validated_resume,
        vault_lookup,
        explicit_vault_skills,
    )

    synchronize_section_order(
        validated_resume
    )

    return validated_resume