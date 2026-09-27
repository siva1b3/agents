import json
import unittest
from unittest.mock import patch

from tool_dispatch import dispatch_tool


class ToolDispatchTests(unittest.TestCase):
    def test_routes_each_tool_and_preserves_call_id(self):
        examples = [
            ("list_files", {}, ["src/", "src/app.js"]),
            ("read_file", {"relative_path": "src/app.js", "start_line": 1,
                           "end_line": None}, "1: source"),
            ("search_code", {"query": "validateRequest", "max_results": 50},
             "src/app.js:1: validateRequest()"),
        ]
        for name, arguments, result in examples:
            with self.subTest(name=name), patch.dict("tool_dispatch.TOOL_FUNCTIONS") as functions:
                from unittest.mock import Mock
                function = Mock(return_value=result)
                functions[name] = function
                response = dispatch_tool(name, json.dumps(arguments), "call_123")
                function.assert_called_once_with(**arguments)
                self.assertEqual(response["type"], "function_call_output")
                self.assertEqual(response["call_id"], "call_123")
                self.assertEqual(json.loads(response["output"]), {"result": result})

    def test_invalid_requests_return_errors(self):
        examples = [
            ("unknown", "{}", "Unsupported tool"),
            ("list_files", "{", "valid JSON"),
            ("list_files", "[]", "JSON object"),
            ("read_file", "{}", "Missing arguments"),
            ("list_files", '{"extra": 1}', "Unexpected arguments"),
            ("search_code", '{"query": "x", "max_results": false}', "positive integer"),
            ("read_file", '{"relative_path": "../outside", "start_line": 1, "end_line": null}',
             "must stay inside"),
        ]
        for name, arguments, message in examples:
            with self.subTest(name=name, arguments=arguments):
                response = dispatch_tool(name, arguments, "call_error")
                self.assertEqual(response["call_id"], "call_error")
                self.assertIn(message, json.loads(response["output"])["error"])

    def test_real_tool_execution(self):
        response = dispatch_tool("list_files", "{}", "call_real")
        self.assertIn("src/app.js", json.loads(response["output"])["result"])


if __name__ == "__main__":
    unittest.main()
