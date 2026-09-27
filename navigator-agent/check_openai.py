import os
from pathlib import Path

from dotenv import load_dotenv
from openai import APIConnectionError, APIStatusError, OpenAI


def main():
    load_dotenv(Path(__file__).with_name(".env"))
    if not os.environ.get("OPENAI_API_KEY", "").strip():
        raise SystemExit("Set OPENAI_API_KEY in .env or your terminal before running this check.")

    try:
        with OpenAI(timeout=30.0, max_retries=0) as client:
            response = client.responses.create(
                model="gpt-5-nano",
                input="Reply with exactly: Connection successful.",
                reasoning={"effort": "minimal"},
                max_output_tokens=128,
                store=False,
            )
    except APIConnectionError:
        raise SystemExit("Could not connect to OpenAI. Check your network and try again.") from None
    except APIStatusError as error:
        raise SystemExit(
            f"OpenAI returned HTTP {error.status_code}. "
            "Check your API key, model access, billing, and rate limits."
        ) from None

    if response.status != "completed" or not response.output_text.strip():
        raise SystemExit("The request returned without a complete text response. Try again.")
    print(response.output_text)


if __name__ == "__main__":
    main()
