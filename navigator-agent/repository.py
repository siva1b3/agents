import os
from pathlib import Path


REPOSITORY_ROOT = Path("/agents/codebase-navigator").resolve()
EXCLUDED_NAMES = {".git", "node_modules"}
EVALUATOR_GUIDE = Path("docs/evaluator-guide.md")


def check_repository():
    if not REPOSITORY_ROOT.is_dir():
        raise ValueError(f"Repository directory does not exist: {REPOSITORY_ROOT}")


def is_excluded(path):
    return (
        any(
            part in EXCLUDED_NAMES or part == ".env" or part.startswith(".env.")
            for part in path.parts
        )
        or path == EVALUATOR_GUIDE
    )


def resolve_repository_path(relative_path):
    """Return an existing, allowed path inside the investigation repository."""
    check_repository()
    requested = Path(relative_path)
    if requested.is_absolute():
        raise ValueError("Use a repository-relative path, not an absolute path.")
    if is_excluded(requested):
        raise ValueError(f"Path is excluded: {relative_path}")

    resolved = (REPOSITORY_ROOT / requested).resolve()
    if not resolved.is_relative_to(REPOSITORY_ROOT):
        raise ValueError("Path must stay inside the investigation repository.")
    if is_excluded(resolved.relative_to(REPOSITORY_ROOT)):
        raise ValueError(f"Path is excluded: {relative_path}")
    if not resolved.exists():
        raise ValueError(f"Path does not exist: {relative_path}")
    return resolved


def list_files():
    """List allowed files and directories recursively, omitting symlinks."""
    root = resolve_repository_path(".")
    paths = []

    def report_walk_error(error):
        raise error

    for directory, directories, files in os.walk(root, onerror=report_walk_error):
        current = Path(directory)
        allowed_directories = []
        for name in directories:
            path = current / name
            relative = path.relative_to(root)
            if path.is_symlink() or is_excluded(relative):
                continue
            resolve_repository_path(relative)
            allowed_directories.append(name)
            paths.append(relative.as_posix() + "/")
        directories[:] = allowed_directories

        for name in files:
            path = current / name
            relative = path.relative_to(root)
            if path.is_symlink() or is_excluded(relative):
                continue
            resolved = resolve_repository_path(relative)
            if resolved.is_file():
                paths.append(relative.as_posix())

    return sorted(paths)


def _read_text(relative_path):
    """Read an allowed UTF-8 file; reject common binary content."""
    path = resolve_repository_path(relative_path)
    if not path.is_file():
        raise ValueError(f"Path is not a file: {relative_path}")
    try:
        text = path.read_text(encoding="utf-8")
    except OSError as error:
        raise ValueError(f"Cannot read {relative_path}: {error.strerror}") from error
    if "\x00" in text:
        raise UnicodeError("File contains null bytes.")
    return text


def read_file(relative_path, start_line=1, end_line=None):
    """Return numbered text, optionally restricted to an inclusive line range."""
    if type(start_line) is not int or start_line < 1:
        raise ValueError("start_line must be a positive integer.")
    if end_line is not None and (
        type(end_line) is not int or end_line < start_line
    ):
        raise ValueError("end_line must be an integer greater than or equal to start_line.")
    try:
        lines = _read_text(relative_path).splitlines()
    except UnicodeError as error:
        raise ValueError(f"File is not supported UTF-8 text: {relative_path}") from error
    if not lines:
        return "File is empty."
    if start_line > len(lines):
        raise ValueError(f"start_line exceeds the file's {len(lines)} lines.")
    selected = lines[start_line - 1:end_line]
    return "\n".join(
        f"{number}: {line}"
        for number, line in enumerate(selected, start=start_line)
    )


def search_code(query, max_results=50):
    """Find case-sensitive literal matches, returning one result per source line."""
    if not isinstance(query, str) or not query or "\n" in query or "\r" in query:
        raise ValueError("query must be a non-empty, single-line string.")
    if type(max_results) is not int or max_results < 1:
        raise ValueError("max_results must be a positive integer.")

    matches = []
    for relative_path in list_files():
        if relative_path.endswith("/"):
            continue
        try:
            lines = _read_text(relative_path).splitlines()
        except UnicodeError:
            continue
        for number, line in enumerate(lines, start=1):
            if query in line:
                if len(matches) == max_results:
                    return "\n".join(matches) + (
                        f"\nResults limited to {max_results} matching lines; more matches exist."
                    )
                matches.append(f"{relative_path}:{number}: {line}")
    return "\n".join(matches) if matches else "No matches found."
