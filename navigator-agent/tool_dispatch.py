"""Execute a requested repository tool and prepare its Responses API output."""

import json

from repository import list_files, read_file, search_code
from tool_schemas import TOOLS


TOOL_FUNCTIONS = {
    "list_files": list_files,
    "read_file": read_file,
    "search_code": search_code,
}
TOOL_PARAMETERS = {tool["name"]: tool["parameters"] for tool in TOOLS}


def dispatch_tool(name, arguments, call_id):
    """Accept a tool name, JSON argument string, and matching call identifier."""
    try:
        if name not in TOOL_FUNCTIONS:
            raise ValueError(f"Unsupported tool: {name}")
        try:
            parsed = json.loads(arguments)
        except (json.JSONDecodeError, TypeError):
            raise ValueError("Arguments must be a valid JSON object string.") from None
        if not isinstance(parsed, dict):
            raise ValueError("Arguments must decode to a JSON object.")

        parameters = TOOL_PARAMETERS[name]
        missing = set(parameters["required"]) - parsed.keys()
        extra = parsed.keys() - parameters["properties"].keys()
        if missing:
            raise ValueError(f"Missing arguments: {', '.join(sorted(missing))}")
        if extra:
            raise ValueError(f"Unexpected arguments: {', '.join(sorted(extra))}")

        result = TOOL_FUNCTIONS[name](**parsed)
        output = {"result": result}
    except (ValueError, TypeError, OSError) as error:
        output = {"error": str(error)}

    return {
        "type": "function_call_output",
        "call_id": call_id,
        "output": json.dumps(output),
    }
