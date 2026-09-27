# Prepared-question evaluation — 2026-09-27

Scope: questions 1, 3, 5, and 49 from the Express fixture's questions.md,
not the full set of 52. Answers were reviewed against the source and the
four scoring categories in docs/evaluator-guide.md. The guide was read only
by the evaluator, never supplied to the navigator. Saved tool traces contain
no evaluator-guide content.

## Results

Scores are manual judgments, not model-generated grades. Each category is 0–2.

| Question | Correctness | Evidence | Traceability | Boundaries | Total |
| --- | --- | --- | --- | --- | --- |
| 1: validation and rejection | 2 | 1 | 2 | 2 | 7/8 |
| 3: application creation and listening | 2 | 2 | 2 | 2 | 8/8 |
| 5: public versus authenticated endpoints | 2 | 1 | 2 | 2 | 7/8 |
| 49: order database tables/migrations | 2 | 1 | 2 | 1 | 6/8 |

Total: 28/32. All four final investigations returned answers. This is a small
sample, not a reliability estimate or a claim that every prepared question passes.

- Q1 correctly follows validateRequest, safeParse, ApplicationError(400), the
  error handler response, and app registration. It reads request-schemas.js but
  does not cite a concrete schema in its answer, missing an expected evidence anchor.
- Q3 correctly identifies createApplication / express() in src/app.js:44 and
  application.listen in src/server.js:9-11, including the configured port.
- Q5 correctly classifies the declared health, authentication, user, product,
  order, and administration routes. Product GETs precede authentication; mutations
  follow it. Permission checks are distinguished from authentication. Some citation
  ranges omit repeated paths, and mount citations are incomplete. This checks
  declared feature routes, not a complete HTTP-method/CORS preflight inventory.
- Q49 correctly cites the orders Map, orders repository, and createMemoryRepositories
  composition. No database integration is invented. The final run omits scope
  documentation despite instructions to inspect it. A prior medium-reasoning run
  did cite README.md:7-9, demonstrating inconsistent adherence rather than a
  consistently satisfied requirement.

Citation audit: all 36 recognized explicit path:line or path:start-end citations
in the final saved answers refer to lines returned by read_file. Source review
confirmed the central behavior claims. This count includes repeated citations;
it does not validate detached ranges or prove that every claim has sufficient evidence.

## Failures observed and changes

- Low reasoning produced inconsistent citations, including placeholder line labels,
  and weak evidence for absence claims. Strengthened instructions for schema,
  composition, scope evidence, and full-path citations; switched reasoning to medium.
- One validation run exhausted 10 rounds while gathering evidence. Increased the
  default to 15 in both the loop and CLI. Its subsequent run completed.
- A medium-reasoning authentication run returned an incomplete response at the
  4,096 output-token setting. Increased max_output_tokens to 8,192 and reran Q5
  successfully. The API output allowance includes reasoning. No incomplete answer
  was presented as successful.
- Prompt changes improved results but did not eliminate missing evidence anchors
  or citation-format deviations. These remain limitations, not automatically
  enforced guarantees. Broader evaluation should precede additional features.

Final saved Q1, Q3, and Q49 runs used gpt-5-nano, medium reasoning, 15 rounds,
and a 4,096 output-token ceiling. Q5's final retry used the same settings with
an 8,192 ceiling. Current code uses 8,192 for all questions. A rerun may differ.
All 19 local unit tests passed after the changes.

## Reproduce

From /agents/navigator-agent:

```bash
.venv/bin/python -m unittest -v
.venv/bin/python evaluate.py
# Rerun selected questions only:
.venv/bin/python evaluate.py 1 49
```

The evaluation commands use API credits and load the local .env. They save
answers and tool traces to evaluation-results.json, replacing selected questions'
previous results. evaluation-baseline.json preserves the first four-question run.
No keys or raw API errors are written to these artifacts.
