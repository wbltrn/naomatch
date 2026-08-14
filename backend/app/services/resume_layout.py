from dataclasses import dataclass


@dataclass(frozen=True)
class ResumeLayout:
    name: str

    section_before: int
    section_after_rule: int

    subheading_before: int
    subheading_after: int

    project_after: int

    bullet_after: int
    bullet_list_after: int

    skills_item_sep: int
    skills_top_sep: int
    skills_after: int


SPACIOUS_LAYOUT = ResumeLayout(
    name="spacious",
    section_before=-1,
    section_after_rule=-2,
    subheading_before=0,
    subheading_after=-2,
    project_after=-1,
    bullet_after=2,
    bullet_list_after=0,
    skills_item_sep=2,
    skills_top_sep=1,
    skills_after=-1,
)


BALANCED_LAYOUT = ResumeLayout(
    name="balanced",
    section_before=-4,
    section_after_rule=-4,
    subheading_before=-2,
    subheading_after=-5,
    project_after=-3,
    bullet_after=1,
    bullet_list_after=-2,
    skills_item_sep=1,
    skills_top_sep=0,
    skills_after=-2,
)


COMPACT_LAYOUT = ResumeLayout(
    name="compact",
    section_before=-8,
    section_after_rule=-6,
    subheading_before=-4,
    subheading_after=-8,
    project_after=-5,
    bullet_after=-1,
    bullet_list_after=-4,
    skills_item_sep=0,
    skills_top_sep=0,
    skills_after=-4,
)


LAYOUTS = {
    "spacious": SPACIOUS_LAYOUT,
    "balanced": BALANCED_LAYOUT,
    "compact": COMPACT_LAYOUT,
}


def get_layout(
    layout_name: str,
) -> ResumeLayout:
    return LAYOUTS.get(
        layout_name,
        BALANCED_LAYOUT,
    )