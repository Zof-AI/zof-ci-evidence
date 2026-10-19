# Supported inputs and semantics

## JUnit XML

A single `testsuite` or `testsuites` root is required. Nested suites are supported. Test identities use `classname::name`, falling back to the nearest named suite plus `::name`, or the bare name when both are absent. Components are redacted and bounded. Consumers must reject duplicate resulting names rather than conflate ambiguous cases. Each testcase needs a name, optional finite nonnegative `time` in seconds, and at most one `failure`, `error` or `skipped` child. Time is converted to milliseconds. Standard properties and output elements are accepted but their attributes/bodies are not copied. Failure/error/skipped bodies and attributes are also discarded. Duplicate roots, malformed XML, nonstandard child elements, DTDs, declared entities and undefined entity references are rejected. Built-in XML character references are decoded by saxes.

Declared tests/failures/errors/skipped/disabled counters are compared with actual cases. Mismatches produce partial execution. Declared failures/errors preserve a known fail result even when details are absent. No cases means missing; all-skipped cases means partial. JUnit dialects outside this documented subset may be rejected; provide generic JSON as an interchange format.

## Generic test JSON

```json
{"status":"completed","expectedTests":1,"tests":[{"name":"adds values","status":"passed","durationMs":2}]}
```

`status` is required and must be completed, partial or error. `tests` is required, with name/status and optional durationMs. Test status is passed, failed, skipped or error. Optional expectedTests is an integer from 0 to 10000; counter mismatches produce partial execution. Unexpected fields are not copied. Partial/missing/error execution never passes, even if available test cases passed. All-skipped execution is partial. A known failed/error case yields a fail result.

## Static analysis JSON

```json
{"status":"completed","checkedRules":1,"findings":[{"id":"unsafe-eval","severity":"high","message":"Unsafe evaluation detected","path":"src/parser.ts","line":5}]}
```

Required status has the same values as test JSON; checkedRules is a 0–10000 integer. Zero checked rules means missing verification. Findings use Evidence 1.0.0 fields. High/critical findings make the result fail; lower severity findings are advisory. No SARIF, arbitrary analyzer-specific JSON or unsupported XML dialect is claimed. Convert such reports explicitly to this format.

## Attribution and merging

Source repository and commit are caller-provided strings or null. Unknown values are not invented. Metadata copies only producer, runId, workflow, os, architecture, runtime and ci. URLs and recognized credential patterns are redacted. No process environment is read. Set id and createdAt for deterministic valid output. Rejected aggregate options use a newly generated safe error document without reflecting the invalid options.

Combining a valid report with a missing/invalid report yields partial execution; a known failure remains fail. If all reports are unavailable the status is missing. If no usable report exists and any import was rejected the status is error. Warnings contain fixed text/codes, not parser exception strings. Artifacts contain safe relative references, size and raw-file SHA-256, never report bodies. References are not authenticity claims.

## Limits

2 MiB per report; 4 MiB total selected file bytes; 32 selected files; 10000 cases or findings per report; depth 32 and bounded JSON nodes. The final output must also satisfy the 4 MiB evidence schema limit. Limits fail closed and cannot be disabled. XML input is UTF-8 only. All compressed and archive inputs are rejected by known magic and filename extension; no decompression occurs, so decompression ratios are never accepted. Corrupt archives and misleading filenames do not enable extraction.
