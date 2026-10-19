# Zof CI Evidence

Normalize explicitly selected local CI reports into portable Evidence 1.0.0. Works offline without a Zof account. Imports JUnit XML, generic test JSON and the documented static-analysis JSON format. Invalid or incomplete reports produce honest error, missing or partial evidence.

This is an unpublished 0.1.0 release candidate. Proposed npm names and repository URLs await approval. Public installation is blocked until the shared evidence dependency is published.

## Build and run

Requires Node.js 22 or later. During prerelease development, install a reviewed `@zof-ai/evidence-spec` 0.1.0 tarball alongside this project's dependencies before building. The committed lock describes the intended registry artifact, which is not yet public. A release coordinator can seed an isolated npm cache from approved candidate tarballs and run `npm ci --offline --ignore-scripts`. After approved dependency publication, `npm ci --ignore-scripts` works normally.

```sh
npm run build
node dist/cli.js normalize junit.xml --root examples --format junit
node dist/cli.js normalize tests.json --root examples --format json
node dist/cli.js normalize static.json --root examples --format static-json
npm test
```

The JUnit example exits 0; partial JSON exits 2; the static finding exits 1. These are intentional. CLI stdout is redacted JSON evidence; diagnostics never quote input content. Exit 0 means completed/pass, 1 means a known failure, and 2 means incomplete, missing, invalid or rejected input.

## Library

```js
import { normalizeArtifacts } from '@zof-ai/ci-evidence';
const evidence = await normalizeArtifacts({
  root: './downloaded-reports',
  files: [{ path: 'junit.xml', format: 'junit' }],
  source: { repository: 'example/project', commit: null },
  metadata: { ci: 'github', runId: '12345' }
});
```

`normalizeReport(textOrBuffer, {format, source?, metadata?, id?, createdAt?})` imports one in-memory report. `normalizeArtifacts` imports selected files and combines results. Both return Evidence 1.0.0. Use `serializeEvidence` from `@zof-ai/evidence-spec` before writing evidence after modifications.

GitHub Actions users can pass already-downloaded report paths from their workflow or use `normalizeArtifacts` from a JavaScript action. This package never downloads artifacts, contacts GitHub, reads credentials, executes tests or uploads source. Callers are responsible for collecting reports from trusted jobs and checking provenance.

Read [formats and limits](docs/FORMATS.md), [security](SECURITY.md), [privacy](docs/PRIVACY.md), and [release requirements](docs/RELEASE.md).
