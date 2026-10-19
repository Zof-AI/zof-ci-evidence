# Zof CI Evidence

Normalize explicitly selected local CI reports into portable Evidence 1.0.0. Works offline without a Zof account. Imports JUnit XML, generic test JSON and the documented static-analysis JSON format. Invalid or incomplete reports produce honest error, missing or partial evidence.

Version 0.1.0 is prepared under the Apache-2.0 license. Use the GitHub source installation below; npm registry publication is not claimed.

<!-- ZOF_RELEASE_INSTALL_START -->
## Install from GitHub source

Requires Node.js 22 or 24, npm, and Git. Filesystem operations require Linux or macOS with Python 3.10 or newer; Windows file operations fail closed. Clone this repository and explicitly prepare its reviewed release dependencies:

```sh
git clone https://github.com/Zof-AI/zof-ci-evidence.git
cd zof-ci-evidence
node scripts/bootstrap.mjs --allow-network
npm ci --ignore-scripts --prefer-offline
npm run build
npm test
```

The bootstrap downloads only the exact `v0.1.0` dependency assets from [GitHub Releases](https://github.com/Zof-AI/zof-ci-evidence/releases), as listed in `scripts/release-dependencies.json`, verifies SHA256 and byte size, and adds them to the npm cache. It does not extract archives, run package scripts, collect application data, or send credentials. Downloads require the explicit flag and follow only HTTPS GitHub asset redirects. Installation then fetches ordinary third-party dependencies from npm. Use a writable npm cache; set `npm_config_cache` consistently for both commands if needed. An unavailable asset, changed hash, or oversized response stops installation.

GitHub source and release artifacts are the initial distribution channel. These instructions do not claim that `@zof-ai` packages are published on npm or that the VS Code extension is listed in Marketplace.
<!-- ZOF_RELEASE_INSTALL_END -->

## Build and run

After the GitHub source installation above, run the examples below. The bootstrap supplies the pinned evidence-spec dependency.

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
