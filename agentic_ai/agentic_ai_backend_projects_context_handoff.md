# Agentic-AI Backend Learning Projects — context handoff

## Scope and current status

- The curriculum is planned; no project implementation was described.
- It contains **12 concrete projects across four learning tracks**.
- Every project has a real-world objective, but supporting applications and infrastructure remain mocked, generated or minimal.
- Difficulty is divided into easy, medium and hard within each track.
- The 12 projects will be independently runnable folders inside **one learning monorepo**. This avoids duplicating dependency installation, LLM configuration and shared tool infrastructure.

| Track | Easy | Medium | Hard |
|---|---|---|---|
| Developer Workspace Agents | Codebase Navigator Agent | Issue-to-Patch Agent | Safe Refactoring Agent |
| Application Operations Agents | Application Log Analyst | Service Dependency Investigator | Incident Recovery Operator |
| Resource Automation Agents | Resource Inventory Agent | Local Environment Builder | Safe VM Lifecycle Agent |
| Unified Goal-Driven Agents | Technical Support Ticket Agent | Data Pipeline Recovery Agent | Local Development Environment Recovery Agent |

## Track 1 — Developer Workspace Agents

This track moves from read-only repository investigation to code modification and then safe cross-file refactoring.

### 1. Codebase Navigator Agent — Easy

**Concrete goal:** Answer questions about an unfamiliar Express.js repository and provide file-based evidence.

**Main new concept:** Structured tool calling.

**Example user goal:**

> Find where request validation happens and explain how invalid requests are rejected.

**Agent capabilities:**

- List files.
- Search source code.
- Read selected files.
- Return an evidence-based answer.

**Supporting input:**

- One small prepared Express repository.
- Several generated investigation questions.
- No database or frontend.

**Success conditions:**

- The correct files and functions are identified.
- The answer cites evidence from the repository.

### 2. Issue-to-Patch Agent — Medium

**Concrete goal:** Read a bug ticket, inspect the code, modify files and make failing tests pass.

**Main new concept:** Stateful multi-step execution.

**Example user goal:**

> Fix the bug that allows an order with a negative quantity.

**Agent capabilities:**

- Read a prepared issue.
- Inspect the repository.
- Run tests.
- Modify files.
- Rerun tests.
- Report the patch.

**Supporting input:**

- A small Express application.
- Prepared bug tickets.
- Intentionally failing tests.

**Success conditions:**

- The relevant test passes.
- Unrelated tests remain passing.
- Only necessary files are changed.

### 3. Safe Refactoring Agent — Hard

**Concrete goal:** Perform a cross-file refactor, detect regressions and recover from a bad change.

**Main new concept:** Checkpoints and rollback.

**Example user goal:**

> Rename `customerId` to `accountId` throughout the application without breaking its API.

**Required behavior:**

- Create a plan.
- Locate affected files.
- Save a checkpoint.
- Modify code.
- Run tests.
- Detect regressions.
- Repair or roll back unsuccessful changes.

**Supporting input:**

- A small generated multi-package repository.
- Local tests.
- No GitHub, CI server or deployment.

**Success conditions:**

- Refactoring requirements are satisfied.
- All tests pass.
- The agent can restore the previous state when its change fails.

## Track 2 — Application Operations Agents

This track moves from evidence-based log analysis to multi-source service diagnosis and then verified recovery.

### 4. Application Log Analyst — Easy

**Concrete goal:** Diagnose an incident from generated logs and provide evidence.

**Main new concept:** Observation-based reasoning.

**Example user goal:**

> Determine why checkout requests started failing at 10:35.

**Agent capabilities:**

- List available log files.
- Search by time, request ID and error.
- Count recurring errors.
- Inspect surrounding log lines.
- Produce a diagnosis.

**Supporting input:**

- An automatic log generator.
- Prepared normal and failure scenarios.
- No full application.

**Prepared failure scenarios:**

- Database timeout.
- Invalid environment variable.
- Rate-limit failure.
- Missing file.
- Malformed request.

**Success conditions:**

- The correct failure is identified.
- The answer includes relevant timestamps and log evidence.
- The agent distinguishes symptoms from root cause.

### 5. Service Dependency Investigator — Medium

**Concrete goal:** Determine which simulated dependency caused an application failure.

**Main new concept:** Multi-tool correlation.

**Example user goal:**

> The API is returning HTTP 500. Determine whether the API, database or message broker is responsible.

**Agent inputs:**

- Simulated health endpoints.
- Generated application logs.
- Dependency status.
- Basic generated metrics.
- Configuration snapshots.

**Supporting system:**

```text
API simulator
Database simulator
Queue simulator
Metrics generator
Log generator
```

These components are simple scripts or mocked endpoints, not full services.

**Success conditions:**

- The actual failed dependency is identified.
- Conflicting or irrelevant signals are rejected.
- The diagnosis includes supporting observations.

### 6. Incident Recovery Operator — Hard

**Concrete goal:** Diagnose, repair and verify a failed local service.

**Main new concept:** Closed-loop recovery.

**Example user goal:**

> Restore the order service and prove that it is healthy.

**Agent capabilities:**

- Inspect logs and service state.
- Form a diagnosis.
- Select an allowed recovery action.
- Restart or reconfigure a simulated service.
- Perform health checks.
- Verify a sample request.
- Generate an incident report.

**Supporting environment:**

- A tiny Docker Compose stack or local simulator.
- A fault-injection command.
- Predefined safe recovery operations.

**Success conditions:**

```text
Health check passes
Sample request succeeds
Failure condition is removed
Recovery evidence is recorded
```

A successful restart command alone does not complete the project. The recovered service must be verified.

## Track 3 — Resource Automation Agents

This track moves from read-only resource discovery to controlled local provisioning and then guarded asynchronous resource management.

### 7. Resource Inventory Agent — Easy

**Concrete goal:** Find and explain the state of simulated infrastructure resources.

**Main new concept:** Resource discovery and normalization.

**Example user goal:**

> Find all stopped development VMs created by the analytics team.

**Supporting system:**

A local fake-cloud API contains generated:

- VMs.
- Disks.
- Networks.
- Tags.
- Resource states.

The agent performs only read operations.

**Success conditions:**

- Correct resources are selected.
- Filters are applied correctly.
- Ambiguous resource names are reported instead of guessed.

### 8. Local Environment Builder — Medium

**Concrete goal:** Convert a user request into an approved local Docker environment.

**Main new concept:** Policy-controlled side effects.

**Example user goal:**

> Create a local PostgreSQL development environment with persistent storage.

**Agent capabilities:**

- Interpret the requested environment.
- Choose from approved templates.
- Validate ports and resource limits.
- Generate Docker Compose configuration.
- Start the environment.
- Perform a health check.

The user cannot request arbitrary images or commands. The backend provides a limited catalog:

- PostgreSQL.
- Redis.
- RabbitMQ.
- A small HTTP test service.

**Success conditions:**

- The requested service starts.
- The container becomes healthy.
- Connection information is returned.
- Repeated requests do not create duplicate environments.

### 9. Safe VM Lifecycle Agent — Hard

**Concrete goal:** Manage simulated VMs through asynchronous, guarded operations.

**Main new concept:** Durable resource lifecycle state.

**Example user goals:**

> Create a small development VM.

> Stop the test VM created today.

> Delete the unused test VM after showing me its exact identity.

No real cloud account is required. A local fake-cloud server simulates:

- VM creation.
- Delayed asynchronous operations.
- Provisioning failures.
- VM states.
- Duplicate requests.
- Stop, resize and delete operations.

**Required behavior:**

- Resolve the exact resource.
- Track operation IDs.
- Poll operation status.
- Enforce timeouts.
- Handle idempotency.
- Obtain approval before deletion.
- Verify the state after an operation.

**Success condition:**

- The backend, not the LLM, confirms the final resource state.

## Track 4 — Unified Goal-Driven Agents

This track combines previously introduced tool groups, first for read-only investigation, then adaptive recovery and finally controlled end-to-end orchestration.

### 10. Technical Support Ticket Agent — Easy

**Concrete goal:** Investigate a technical support ticket using several read-only tool groups.

**Main new concept:** Tool routing.

**Example ticket:**

> My development API no longer starts after I changed its configuration.

**Available tool groups:**

- Repository inspection.
- Configuration inspection.
- Log analysis.
- Process status.
- Container status.

Everything is read-only. The agent diagnoses the issue and recommends an action but does not change anything.

**Supporting input:**

- Generated tickets.
- Prepared configuration files.
- Logs and resource-state fixtures.

**Success conditions:**

- The agent chooses relevant tools.
- It avoids unnecessary tools.
- It identifies the correct cause.
- It provides evidence.

### 11. Data Pipeline Recovery Agent — Medium

**Concrete goal:** Repair a simulated data pipeline and adapt after failed attempts.

**Main new concept:** Planning and replanning.

**Example user goal:**

> Find why yesterday's customer import failed, correct the problem and rerun it.

**Minimal pipeline simulator:**

```text
CSV input → validation → transformation → output
```

**Prepared failure scenarios:**

- Missing column.
- Incorrect delimiter.
- Invalid configuration.
- Duplicate records.
- Transformation failure.

**Agent capabilities:**

- Inspect pipeline state.
- Read logs.
- Inspect samples.
- Update approved configuration.
- Rerun a stage.
- Verify output.

If its initial diagnosis is disproved, the agent must revise its plan instead of repeating the same action.

**Success conditions:**

- Valid output is produced.
- Record counts reconcile.
- The agent records attempted actions and evidence.

### 12. Local Development Environment Recovery Agent — Hard capstone

**Concrete goal:** Restore a broken application using code, operations and resource tools.

**Main new concept:** Controlled end-to-end orchestration.

**Example user goal:**

> The local order API is broken. Restore it without changing its expected behavior.

**Combined tool groups:**

- Repository search.
- File reading and editing.
- Test execution.
- Log analysis.
- Container inspection.
- Configuration inspection.
- Restart operations.
- Health verification.

**Possible generated incidents:**

- Code regression.
- Incorrect environment variable.
- Port conflict.
- Unhealthy container.
- Broken dependency configuration.
- Failed database migration.
- Multiple simultaneous symptoms.

**Required execution sequence:**

1. Define measurable success criteria.
2. Investigate the environment.
3. Form and update a plan.
4. Validate every proposed action.
5. Request approval for risky operations.
6. Execute bounded changes.
7. Verify tests, health and application behavior.
8. Stop when successful, blocked or out of budget.
9. Produce an audit-style final report.

This is the final agentic backend system. It demonstrates the complete controlled loop without requiring production infrastructure.

## Recommended implementation order

The tracks are conceptual groupings, but the build order crosses tracks so complexity rises gradually:

1. Codebase Navigator Agent.
2. Application Log Analyst.
3. Resource Inventory Agent.
4. Technical Support Ticket Agent.
5. Issue-to-Patch Agent.
6. Service Dependency Investigator.
7. Local Environment Builder.
8. Data Pipeline Recovery Agent.
9. Safe Refactoring Agent.
10. Incident Recovery Operator.
11. Safe VM Lifecycle Agent.
12. Local Development Environment Recovery Agent.

## Next steps

- Start with **Project 1: Codebase Navigator Agent**, following the recommended implementation order.
- Convert Project 1 into an implementation-ready specification covering its small Express fixture, generated investigation questions, read-only tools and evidence-based success checks.
