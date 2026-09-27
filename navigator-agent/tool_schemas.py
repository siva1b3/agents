"""Responses API tool descriptions; these definitions do not execute tools."""


TOOLS = [
    {
        "type": "function",
        "name": "list_files",
        "description": (
            "List eligible files and directories recursively in the investigation "
            "repository. Returns sorted repository-relative paths; directories end "
            "in /. Excluded locations and symlinks are omitted."
        ),
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {},
            "required": [],
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "read_file",
        "description": (
            "Read an eligible UTF-8 text file with original line numbers for "
            "evidence and citations. Line ranges are inclusive."
        ),
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "relative_path": {
                    "type": "string",
                    "description": "Repository-relative file path, for example src/app.js.",
                },
                "start_line": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "First line to read, counting from 1. Use 1 to start at the beginning.",
                },
                "end_line": {
                    "type": ["integer", "null"],
                    "minimum": 1,
                    "description": (
                        "Last line to read; must be at least start_line. Use null "
                        "to read through the end. Values past the end are clipped."
                    ),
                },
            },
            "required": ["relative_path", "start_line", "end_line"],
            "additionalProperties": False,
        },
    },
    {
        "type": "function",
        "name": "search_code",
        "description": (
            "Search eligible repository text files for case-sensitive literal text, "
            "not a regular expression. Returns one result per matching line with "
            "its repository-relative path, line number, and source text. Reports "
            "no matches or truncated results explicitly. Skips binary and non-UTF-8 files."
        ),
        "strict": True,
        "parameters": {
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "minLength": 1,
                    "description": "Non-empty, single-line literal text to find, for example validateRequest.",
                },
                "max_results": {
                    "type": "integer",
                    "minimum": 1,
                    "description": "Maximum matching lines to return. Use 50 for the usual limit.",
                },
            },
            "required": ["query", "max_results"],
            "additionalProperties": False,
        },
    },
]
