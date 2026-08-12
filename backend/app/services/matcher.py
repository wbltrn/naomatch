import re

from app.models.experience import Experience
from app.models.job import JobPosting
from app.services.semantic_matcher import analyze_semantic_match

ENGINEERING_SKILLS = {
    "software": {
        "Python": ["python"],
        "Java": ["java"],
        "TypeScript": ["typescript"],
        "React": ["react"],
        "FastAPI": ["fastapi", "fast api"],
        "PostgreSQL": ["postgresql", "postgres"],
        "AWS": ["aws", "amazon web services"],
        "Docker": ["docker"],
        "REST API": ["rest api", "restful api"],
    },

    "mechanical": {
        "SolidWorks": ["solidworks"],
        "AutoCAD": ["autocad"],
        "CAD": ["cad", "computer aided design"],
        "FEA": ["fea", "finite element analysis"],
        "CFD": ["cfd", "computational fluid dynamics"],
        "Thermodynamics": ["thermodynamics"],
        "Heat Transfer": ["heat transfer"],
        "Fluid Mechanics": ["fluid mechanics", "fluid dynamics"],
        "Manufacturing": ["manufacturing"],
        "GD&T": ["gd&t", "geometric dimensioning and tolerancing"],
    },

    "biomedical": {
        "Biomechanics": ["biomechanics"],
        "Medical Devices": ["medical device", "medical devices"],
        "Biomaterials": ["biomaterials"],
        "Bioinstrumentation": ["bioinstrumentation"],
        "Biomedical Imaging": ["biomedical imaging", "medical imaging"],
        "Signal Processing": ["signal processing"],
    },

    "chemical": {
        "Process Design": ["process design"],
        "Process Simulation": ["process simulation"],
        "Aspen Plus": ["aspen plus"],
        "Mass Transfer": ["mass transfer"],
        "Heat Transfer": ["heat transfer"],
        "Reaction Engineering": ["reaction engineering"],
        "Process Controls": ["process control", "process controls"],
        "P&ID": ["p&id", "piping and instrumentation diagram"],
    },

    "aerospace": {
        "Aerodynamics": ["aerodynamics"],
        "Propulsion": ["propulsion"],
        "Flight Dynamics": ["flight dynamics"],
        "Orbital Mechanics": ["orbital mechanics"],
        "Structures": ["aerospace structures"],
        "CFD": ["cfd", "computational fluid dynamics"],
        "ANSYS": ["ansys"],
        "MATLAB": ["matlab"],
    },

    "computer": {
        "C": [" c "],
        "C++": ["c++"],
        "Embedded Systems": ["embedded systems", "embedded"],
        "Microcontrollers": ["microcontroller", "microcontrollers"],
        "FPGA": ["fpga"],
        "Verilog": ["verilog"],
        "VHDL": ["vhdl"],
        "Computer Architecture": ["computer architecture"],
        "Linux": ["linux"],
    },

    "civil": {
        "AutoCAD": ["autocad"],
        "Civil 3D": ["civil 3d"],
        "Structural Analysis": ["structural analysis"],
        "Geotechnical Engineering": ["geotechnical"],
        "Transportation Engineering": ["transportation engineering"],
        "Hydrology": ["hydrology"],
        "GIS": ["gis", "geographic information systems"],
        "Revit": ["revit"],
    },

    "systems": {
        "Systems Engineering": ["systems engineering"],
        "Requirements Engineering": ["requirements engineering"],
        "Systems Architecture": ["systems architecture"],
        "Model-Based Systems Engineering": ["mbse", "model based systems engineering"],
        "SysML": ["sysml"],
        "Risk Analysis": ["risk analysis"],
        "Verification and Validation": ["verification and validation", "v&v"],
        "Optimization": ["optimization"],
    },
}

CROSS_DISCIPLINARY_SKILLS = {
    "MATLAB": ["matlab"],
    "Python": ["python"],
    "Data Acquisition": ["data acquisition", "daq"],
    "Testing": ["testing", "test engineering"],
    "Simulation": ["simulation", "modeling and simulation"],
    "Controls": ["controls", "control systems"],
    "Sensors": ["sensor", "sensors"],
    "Project Management": ["project management"],
    "Root Cause Analysis": ["root cause analysis"],
    "Technical Documentation": ["technical documentation"],
}

RELATED_SKILLS = {
    "Supabase": {
        "PostgreSQL",
        "SQL",
    },
    "FastAPI": {
        "REST API",
        "API",
        "Python",
    },
    "Pandas": {
        "Python",
        "Data Analysis",
    },
    "Snowflake": {
        "SQL",
        "Data Engineering",
        "Cloud Data Platform",
    },
    "SolidWorks": {
        "CAD",
        "Mechanical Design",
    },
    "ANSYS": {
        "FEA",
        "Simulation",
    },
    "CFD": {
        "Fluid Mechanics",
        "Simulation",
    },
    "MATLAB": {
        "Numerical Computing",
        "Modeling and Simulation",
    },
    "Data Acquisition": {
        "Sensors",
        "Testing",
    },
    "Embedded Systems": {
        "Microcontrollers",
        "Firmware",
    },
    "FPGA": {
        "Digital Design",
        "Computer Architecture",
    },
    "Civil 3D": {
        "CAD",
        "Civil Engineering",
    },
    "Revit": {
        "CAD",
        "Building Information Modeling",
    },
    "Aspen Plus": {
        "Process Simulation",
        "Chemical Engineering",
    },
    "SysML": {
        "Model-Based Systems Engineering",
        "Systems Engineering",
    },
    "Biomechanics": {
        "Mechanical Engineering",
        "Biomedical Engineering",
    },
}

def find_related_skill_matches(
    job_skills: set[str],
    experience_skills: set[str],
) -> list[dict[str, str]]:
    related_matches = []

    for experience_skill in experience_skills:
        related_skills = RELATED_SKILLS.get(
            experience_skill,
            set(),
        )

        for job_skill in job_skills:
            if job_skill in related_skills:
                related_matches.append(
                    {
                        "experience_skill": experience_skill,
                        "job_skill": job_skill,
                    }
                )

    return related_matches

def build_skill_alias_lookup():
    alias_lookup = {}

    for discipline_skills in ENGINEERING_SKILLS.values():
        for canonical_skill, aliases in discipline_skills.items():
            for alias in aliases:
                alias_lookup[alias.lower()] = canonical_skill

    for canonical_skill, aliases in CROSS_DISCIPLINARY_SKILLS.items():
        for alias in aliases:
            alias_lookup[alias.lower()] = canonical_skill

    return alias_lookup


SKILL_ALIAS_LOOKUP = build_skill_alias_lookup()

def extract_skills(text: str) -> set[str]:
    normalized_text = text.lower()

    detected_skills = set()
    matched_spans = []

    sorted_aliases = sorted(
        SKILL_ALIAS_LOOKUP.items(),
        key=lambda item: len(item[0]),
        reverse=True,
    )

    for alias, canonical_skill in sorted_aliases:
        for match in re.finditer(
            rf"(?<!\w){re.escape(alias)}(?!\w)",
            normalized_text,
        ):
            start, end = match.span()

            overlaps_existing_match = any(
                start < existing_end and end > existing_start
                for existing_start, existing_end in matched_spans
            )

            if overlaps_existing_match:
                continue

            detected_skills.add(canonical_skill)
            matched_spans.append((start, end))

    return detected_skills



def normalize_text(text: str) -> set[str]:
    words = re.findall(r"[a-zA-Z0-9+#.]+", text.lower())

    stop_words = {
        "the",
        "and",
        "or",
        "a",
        "an",
        "to",
        "of",
        "in",
        "for",
        "with",
        "on",
        "is",
        "are",
        "be",
        "as",
        "at",
        "by",
    }

    return {
        word
        for word in words
        if word not in stop_words and len(word) > 1
    }

def calculate_match_score(
    matched_keywords: list[str],
    job_keywords: set[str],
    matched_skills: list[str],
    related_skill_matches: list[dict[str, str]],
    job_skills: set[str],
) -> float:
    keyword_coverage = (
        len(matched_keywords) / len(job_keywords)
        if job_keywords
        else 0.0
    )

    exact_skill_coverage = (
        len(matched_skills) / len(job_skills)
        if job_skills
        else 0.0
    )

    related_skill_coverage = (
        len(related_skill_matches) / len(job_skills)
        if job_skills
        else 0.0
    )

    skill_coverage = min(
        1.0,
        exact_skill_coverage
        + (related_skill_coverage * 0.5),
    )

    evidence_count = (
        len(matched_keywords)
        + len(matched_skills)
        + len(related_skill_matches)
    )

    confidence_factor = min(
        1.0,
        evidence_count / 4,
    )

    raw_score = (
        (keyword_coverage * 0.35)
        + (skill_coverage * 0.65)
    )

    final_score = raw_score * confidence_factor

    return round(final_score * 100, 2)

def calculate_bullet_semantic_boost(
    bullet_text: str,
    semantic_match,
) -> tuple[float, float, float]:
    bullet_keywords = normalize_text(bullet_text)

    responsibility_keywords = normalize_text(
        " ".join(
            semantic_match.matched_responsibilities
        )
    )

    strength_keywords = normalize_text(
        " ".join(
            semantic_match.strengths
        )
    )

    responsibility_overlap = bullet_keywords.intersection(
        responsibility_keywords
    )

    strength_overlap = bullet_keywords.intersection(
        strength_keywords
    )

    responsibility_boost = 0.0
    if responsibility_keywords:
        responsibility_boost = min(
            15.0,
            round(
                len(responsibility_overlap)
                / len(responsibility_keywords)
                * 100,
                2,
            ),
        )

    strength_boost = 0.0
    if strength_keywords:
        strength_boost = min(
            10.0,
            round(
                len(strength_overlap)
                / len(strength_keywords)
                * 100,
                2,
            ),
        )

    semantic_boost = round(
        responsibility_boost + strength_boost,
        2,
    )

    return (
        semantic_boost,
        responsibility_boost,
        strength_boost,
    )

def calculate_bullet_match(
    bullet,
    job: JobPosting,
    semantic_match,
):
    job_keywords = normalize_text(job.description)
    job_skills = extract_skills(job.description)

    bullet_keywords = normalize_text(bullet.bullet_text)
    bullet_skills = extract_skills(bullet.bullet_text)

    matched_keywords = sorted(
        job_keywords.intersection(bullet_keywords)
    )

    matched_skills = sorted(
        job_skills.intersection(bullet_skills)
    )

    related_skill_matches = find_related_skill_matches(
        job_skills,
        bullet_skills,
    )

    match_score = calculate_match_score(
        matched_keywords=matched_keywords,
        job_keywords=job_keywords,
        matched_skills=matched_skills,
        related_skill_matches=related_skill_matches,
        job_skills=job_skills,
    )

    (
        semantic_boost,
        responsibility_boost,
        strength_boost,
    ) = calculate_bullet_semantic_boost(
        bullet.bullet_text,
        semantic_match,
    )

    match_score = min(
        100.0,
        round(match_score + semantic_boost, 2),
    )

    return {
        "bullet_id": bullet.id,
        "bullet_text": bullet.bullet_text,
        "match_score": match_score,
        "semantic_boost": semantic_boost,
        "responsibility_boost": responsibility_boost,
        "strength_boost": strength_boost,
        "matched_keywords": matched_keywords,
        "matched_skills": matched_skills,
        "related_skill_matches": related_skill_matches,
    }

def calculate_experience_match(
    db,
    experience: Experience,
    job: JobPosting,
):
    job_keywords = normalize_text(job.description)
    job_skills = extract_skills(job.description)

    experience_text = " ".join(
        filter(
            None,
            [
                experience.title,
                experience.organization,
                experience.description,
                " ".join(
                    bullet.bullet_text
                    for bullet in experience.bullets
                ),
            ],
        )
    )

    experience_keywords = normalize_text(experience_text)
    experience_skills = extract_skills(experience_text)

    matched_keywords = sorted(
        job_keywords.intersection(experience_keywords)
    )

    matched_skills = sorted(
        job_skills.intersection(experience_skills)
    )

    related_skill_matches = find_related_skill_matches(
        job_skills,
        experience_skills,
    )

    semantic_match = analyze_semantic_match(
        db=db,
        job_title=job.title,
        job_description=job.description,
        experience_title=experience.title,
        experience_organization=experience.organization,
        experience_description=experience.description,
        experience_bullets=[
            bullet.bullet_text
            for bullet in experience.bullets
        ],
    )

    bullet_matches = [
        calculate_bullet_match(
            bullet,
            job,
            semantic_match,
        )
        for bullet in experience.bullets
    ]

    bullet_matches = sorted(
        bullet_matches,
        key=lambda bullet_match: bullet_match["match_score"],
        reverse=True,
    )

    match_score = calculate_match_score(
        matched_keywords=matched_keywords,
        job_keywords=job_keywords,
        matched_skills=matched_skills,
        related_skill_matches=related_skill_matches,
        job_skills=job_skills,
    )

    final_score = round(
        (match_score * 0.35)
        + (semantic_match.semantic_score * 0.65),
        2,
    )

    return {
        "experience_id": experience.id,
        "title": experience.title,
        "organization": experience.organization,
        "deterministic_score": match_score,
        "final_score": final_score,
        "semantic_match": semantic_match,
        "matched_keywords": matched_keywords,
        "matched_skills": matched_skills,
        "related_skill_matches": related_skill_matches,
        "bullet_matches": bullet_matches,
    }
