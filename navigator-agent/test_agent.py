import unittest
from types import SimpleNamespace
from unittest.mock import Mock, patch

from agent import investigate


def response(output=(), text="", status="completed"):
    return SimpleNamespace(output=list(output), output_text=text, status=status)


class AgentTests(unittest.TestCase):
    def test_multiple_calls_and_reasoning_are_preserved(self):
        reasoning = SimpleNamespace(type="reasoning", encrypted_content="opaque")
        calls = [SimpleNamespace(type="function_call", name="list_files", arguments="{}",
                                 call_id=f"call_{i}") for i in range(2)]
        client = Mock()
        client.responses.create.side_effect = [response([reasoning, *calls]), response(text="Answer")]
        outputs = [{"type": "function_call_output", "call_id": call.call_id,
                    "output": '{"result": []}'} for call in calls]
        with patch("agent.dispatch_tool", side_effect=outputs) as dispatch:
            self.assertEqual(investigate(client, "Question"), "Answer")
            self.assertEqual(dispatch.call_count, 2)
        requests = client.responses.create.call_args_list
        self.assertEqual(requests[0].kwargs["input"], [{"role": "user", "content": "Question"}])
        self.assertEqual(requests[1].kwargs["input"][1:], [reasoning, *calls, *outputs])

    def test_tool_errors_are_returned_to_model(self):
        call = SimpleNamespace(type="function_call", name="unknown", arguments="{}", call_id="bad")
        client = Mock()
        client.responses.create.side_effect = [response([call]), response(text="Recovered")]
        self.assertEqual(investigate(client, "Question"), "Recovered")
        result = client.responses.create.call_args.kwargs["input"][-1]
        self.assertEqual(result["call_id"], "bad")
        self.assertIn("Unsupported tool", result["output"])

    def test_round_limit(self):
        client = Mock()
        client.responses.create.return_value = response([
            SimpleNamespace(type="function_call", name="unknown", arguments="{}", call_id="repeat")])
        with self.assertRaisesRegex(RuntimeError, "Stopped after 2"):
            investigate(client, "Question", max_rounds=2)
        self.assertEqual(client.responses.create.call_count, 2)

    def test_incomplete_or_empty_response(self):
        for result in [response(status="incomplete"), response()]:
            with self.subTest(result=result):
                client = Mock()
                client.responses.create.return_value = result
                with self.assertRaises(RuntimeError):
                    investigate(client, "Question")

    def test_invalid_input_makes_no_requests(self):
        for question, rounds in [(" ", 10), ("Question", 0)]:
            client = Mock()
            with self.assertRaises(ValueError):
                investigate(client, question, rounds)
            client.responses.create.assert_not_called()


if __name__ == "__main__":
    unittest.main()
