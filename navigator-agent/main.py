import argparse
import os
from pathlib import Path

from dotenv import load_dotenv
from openai import APIConnectionError, APIStatusError, OpenAI

from agent import investigate
from repository import check_repository


def main():
    parser = argparse.ArgumentParser(
        description="Accept a question to investigate in the Express repository."
    )
    parser.add_argument(
        "--max-rounds", type=int, default=15,
        help="Maximum model requests per investigation (default: 15).",
    )
    parser.add_argument(
        "question",
        help="The investigation question (wrap it in quotes if it contains spaces).",
    )
    args = parser.parse_args()
    if args.max_rounds < 1:
        parser.error("--max-rounds must be a positive integer.")
    if not args.question.strip():
        parser.error("The investigation question must not be empty.")
    load_dotenv(Path(__file__).with_name(".env"))
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        parser.error("Set OPENAI_API_KEY in .env or your terminal.")
    try:
        check_repository()
        with OpenAI(timeout=30.0, max_retries=0) as client:
            answer = investigate(client, args.question, args.max_rounds)
    except APIConnectionError:
        parser.error("Could not connect to OpenAI. Check your network and try again.")
    except APIStatusError as error:
        parser.error(f"OpenAI returned HTTP {error.status_code}. Check API access, billing, and rate limits.")
    except (ValueError, RuntimeError) as error:
        parser.error(str(error))
    print(answer)


if __name__ == "__main__":
    main()
