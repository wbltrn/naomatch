from pathlib import Path

from jinja2 import Environment, FileSystemLoader, StrictUndefined


TEMPLATE_DIR = Path(__file__).resolve().parent.parent / "resume_templates"


def latex_escape(value: str | None) -> str:
    if value is None:
        return ""

    replacements = {
        "\\": r"\textbackslash{}",
        "&": r"\&",
        "%": r"\%",
        "$": r"\$",
        "#": r"\#",
        "_": r"\_",
        "{": r"\{",
        "}": r"\}",
        "~": r"\textasciitilde{}",
        "^": r"\textasciicircum{}",
    }

    return "".join(
        replacements.get(character, character)
        for character in str(value)
    )


def create_template_environment() -> Environment:
    environment = Environment(
        loader=FileSystemLoader(TEMPLATE_DIR),
        undefined=StrictUndefined,
        autoescape=False,
        trim_blocks=True,
        lstrip_blocks=True,
        comment_start_string="<#",
        comment_end_string="#>",
    )
    environment.filters["latex"] = latex_escape

    return environment


def render_resume_latex(
    resume_data: dict,
    template_name: str = "technical_resume.tex.j2",
) -> str:
    environment = create_template_environment()
    template = environment.get_template(template_name)

    return template.render(**resume_data)