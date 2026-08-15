from app.services.resume_renderer import render_resume_latex


resume_data = {
    "contact": {
        "name": "Test Candidate",
        "phone": "(555) 123-4567",
        "email": "test@example.com",
        "links": [
            {
                "label": "linkedin.com/in/testcandidate",
                "url": "https://linkedin.com/in/testcandidate",
            },
            {
                "label": "github.com/testcandidate",
                "url": "https://github.com/testcandidate",
            },
        ],
    },
    "layout": {
        "section_before": 2,
        "section_after_rule": 1,
        "subheading_before": 0,
        "subheading_after": -2,
        "project_after": -2,
        "bullet_after": 0,
        "bullet_list_after": -2,
        "skills_item_sep": 0,
        "skills_top_sep": 0,
        "skills_after": -2,
    },
    "section_order": [
        "education",
        "experience",
        "research",
        "technical_skills",
    ],
    "sections": [
        {
            "section_type": "education",
            "title": "Education",
            "items": [
                {
                    "school": "University of Virginia",
                    "location": "Charlottesville, VA",
                    "degree": "Bachelor of Science in Computer Science",
                    "minor": "Minor in Data Science",
                    "gpa": "3.6/4.0",
                    "graduation_date": "May 2027",
                    "coursework": [
                        "Database Systems",
                        "Machine Learning",
                        "Data Structures and Algorithms",
                    ],
                }
            ],
        },
        {
            "section_type": "experience",
            "title": "Experience",
            "items": [
                {
                    "title": "Software Engineer Intern",
                    "organization": "Example Company",
                    "location": "New York, NY",
                    "start_date": "May 2026",
                    "end_date": "August 2026",
                    "bullets": [
                        "Built Python services for internal automation.",
                        "Worked with SQL databases and production data systems.",
                    ],
                }
            ],
        },
        {
            "section_type": "research",
            "title": "Research",
            "items": [
                {
                    "title": "Undergraduate Research Assistant",
                    "organization": "UVA Robotics Lab",
                    "location": "Charlottesville, VA",
                    "start_date": "September 2025",
                    "end_date": "Present",
                    "bullets": [
                        "Developed computer vision experiments using Python.",
                        "Analyzed robotics sensor data for autonomous systems.",
                    ],
                }
            ],
        },
        {
            "section_type": "technical_skills",
            "title": "Technical Skills",
            "items": [
                {
                    "category": "Languages",
                    "skills": ["Python", "Java", "SQL"],
                },
                {
                    "category": "Frameworks & Tools",
                    "skills": ["Git", "Docker", "FastAPI"],
                },
                {
                    "category": "Databases & Data Technologies",
                    "skills": ["PostgreSQL", "Snowflake"],
                },
            ],
        },
    ],
}


rendered_latex = render_resume_latex(resume_data)

with open(
    "test_tailored_resume.tex",
    "w",
    encoding="utf-8",
) as file:
    file.write(rendered_latex)

print("Rendered test_tailored_resume.tex")