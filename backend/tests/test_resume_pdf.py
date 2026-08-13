from app.services.resume_pdf import compile_latex_to_pdf


latex_content = r"""
\documentclass{article}

\begin{document}

Hello from Naomatch.

\end{document}
"""


pdf_path = compile_latex_to_pdf(
    latex_content
)

print(pdf_path)
print(pdf_path.exists())
print(pdf_path.stat().st_size)