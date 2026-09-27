"""Run a small prepared-question evaluation; consumes API credits."""
import json
import argparse
import re
from pathlib import Path
from unittest.mock import patch

from dotenv import load_dotenv
from openai import OpenAI

import agent
from repository import REPOSITORY_ROOT


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('numbers', nargs='*', default=['1', '3', '5', '49'])
    args = parser.parse_args()
    directory = Path(__file__).parent
    load_dotenv(directory / '.env')
    questions = dict(re.findall(r'^(\d+)\. (.+)$', (REPOSITORY_ROOT / 'questions.md').read_text(), re.M))
    results_path = directory / 'evaluation-results.json'
    results = json.loads(results_path.read_text()) if results_path.exists() else []
    if any(number not in questions for number in args.numbers):
        parser.error('Choose question numbers from questions.md.')
    original = agent.dispatch_tool
    for number in args.numbers:
        trace = []
        def record(name, arguments, call_id):
            output = original(name, arguments, call_id)
            trace.append({'name': name, 'arguments': json.loads(arguments),
                          'output': json.loads(output['output'])})
            return output
        result = {'question_number': number, 'question': questions[number],
                  'model': 'gpt-5-nano', 'reasoning_effort': 'medium', 'max_rounds': 15,
                  'max_output_tokens': 8192}
        print(f'Running question {number}...', flush=True)
        try:
            with patch('agent.dispatch_tool', side_effect=record):
                with OpenAI(timeout=30.0, max_retries=0) as client:
                    result['answer'] = agent.investigate(client, questions[number])
        except Exception as error:
            result['failure'] = str(error) if isinstance(error, RuntimeError) else type(error).__name__
        result['trace'] = trace
        results = [item for item in results if item['question_number'] != number]
        results.append(result)
        results.sort(key=lambda item: int(item['question_number']))
        results_path.write_text(json.dumps(results, indent=2) + '\n')
        print(f"Question {number}: {'failed' if 'failure' in result else 'answered'}, {len(trace)} tool calls", flush=True)


if __name__ == '__main__':
    main()
