import re

from app.models.experience import Experience
from app.models.job import JobPosting

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

def calculate_bullet_match(
    bullet,
    job: JobPosting,
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

    keyword_score = (
        len(matched_keywords) / len(job_keywords) * 100
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

    skill_score = min(
        100.0,
        (
            exact_skill_coverage
            + (related_skill_coverage * 0.5)
        )
        * 100,
    )

    match_score = round(
        (keyword_score * 0.4)
        + (skill_score * 0.6),
        2,
    )

    return {
        "bullet_id": bullet.id,
        "bullet_text": bullet.bullet_text,
        "match_score": match_score,
        "matched_keywords": matched_keywords,
        "matched_skills": matched_skills,
        "related_skill_matches": related_skill_matches,
    }

def calculate_experience_match(
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

    bullet_matches = [
        calculate_bullet_match(bullet, job)
        for bullet in experience.bullets
    ]

    bullet_matches = sorted(
        bullet_matches,
        key=lambda bullet_match: bullet_match["match_score"],
        reverse=True,
    )

    keyword_score = (
        len(matched_keywords) / len(job_keywords) * 100
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

    skill_score = min(
        100.0,
        (
            exact_skill_coverage
            + (related_skill_coverage * 0.5)
        )
        * 100,
    )

    match_score = round(
        (keyword_score * 0.4)
        + (skill_score * 0.6),
        2,
    )

    return {
        "experience_id": experience.id,
        "title": experience.title,
        "organization": experience.organization,
        "match_score": match_score,
        "matched_keywords": matched_keywords,
        "matched_skills": matched_skills,
        "related_skill_matches": related_skill_matches,
        "bullet_matches": bullet_matches,
    }
