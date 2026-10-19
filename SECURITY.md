# Security policy

The 0.1.x line is the initial supported candidate. Local analyses are bounded and offline unless an operation is explicitly documented otherwise. Do not provide production secrets or execute untrusted generated code.

Use GitHub private vulnerability reporting when enabled for this repository. If it is unavailable, contact an organization owner through an already verified private channel; do not file credentials, exploit details, or customer data in a public issue. A verified reporting channel must be enabled before public release. Reports will be triaged, reproduced using synthetic data, fixed and reviewed before coordinated disclosure. No response SLA is promised during prerelease development.

Reports are untrusted. DTD/entity declarations are rejected, no remote XML resolution exists, and archive inputs are never extracted or decompressed. Reads use the evidence package's bounded regular-file checks under an explicit stable root with symlink/path rejection. Parsing errors use fixed messages. See docs/PRIVACY.md for redaction limits and the stable-root assumption, and docs/FORMATS.md for size/complexity limits. Missing and partial execution cannot pass. No raw application logs or arbitrary environment variables are included.
