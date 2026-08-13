from sqlalchemy.orm import Session

from app.models.education import Education
from app.models.experience import Experience, ExperienceBullet
from app.models.profile import ProfileLink, UserProfile
from app.models.skill import Skill
from app.schemas.resume_import import ResumeImportProposal



def confirm_resume_import(
    db: Session,
    proposal: ResumeImportProposal,
) -> dict:
    education_created = 0

    for education_data in proposal.education:
        education = Education(
            school=education_data.school,
            degree=education_data.degree,
            field_of_study=education_data.field_of_study,
            minor=education_data.minor,
            location=education_data.location,
            start_date=education_data.start_date,
            graduation_date=education_data.graduation_date,
            gpa=education_data.gpa,
            coursework=(
                "\n".join(education_data.coursework)
                if education_data.coursework
                else None
            ),
            honors=(
                "\n".join(education_data.honors)
                if education_data.honors
                else None
            ),
        )

        db.add(education)
        education_created += 1

    experiences_created = 0
    bullets_created = 0

    for experience_data in proposal.experiences:
        experience = Experience(
            type=experience_data.type,
            organization=experience_data.organization,
            title=experience_data.title,
            location=experience_data.location,
            start_date=experience_data.start_date,
            end_date=experience_data.end_date,
            description=experience_data.description,
        )

        db.add(experience)
        db.flush()

        for bullet_text in experience_data.bullets:
            bullet = ExperienceBullet(
                experience_id=experience.id,
                bullet_text=bullet_text,
            )

            db.add(bullet)
            bullets_created += 1

        experiences_created += 1

        skills_created = 0

    for skill_data in proposal.skills:
        skill = Skill(
            name=skill_data.name,
            category=skill_data.category,
        )

        db.add(skill)
        skills_created += 1
    
    profile = db.query(UserProfile).first()

    if profile is None:
        profile = UserProfile(
            name=proposal.profile.name or "",
            phone=proposal.profile.phone,
            email=proposal.profile.email,
        )

        db.add(profile)
        db.flush()

    else:
        if proposal.profile.name is not None:
            profile.name = proposal.profile.name

        profile.phone = proposal.profile.phone
        profile.email = proposal.profile.email

        db.query(ProfileLink).filter(
            ProfileLink.profile_id == profile.id
        ).delete()

    for link_data in proposal.profile.links:
        link = ProfileLink(
            profile_id=profile.id,
            label=link_data.label,
            url=link_data.url,
        )

        db.add(link)

    db.commit()

    return {
        "status": "confirmed",
        "education_created": education_created,
        "experiences_created": experiences_created,
        "bullets_created": bullets_created,
        "skills_created": skills_created,
        "profile_updated": True,
    }