# Privacy and operational security

All report processing stays on the local machine. Nothing is transmitted; no hosted endpoint, telemetry, URL fetch, upload, account authentication or hidden code execution exists. GitHub artifacts must already have been downloaded by an explicitly authorized workflow or person.

Only test names/outcomes/durations, supported static findings, selected attribution and artifact size/hash references survive import. Raw logs, failure bodies, stdout, stderr, JUnit properties, JSON environment objects and arbitrary metadata do not. Avoid putting secrets in test names or static messages. Known credential/key/token/URL patterns are redacted; this cannot detect arbitrary encodings, unknown tokens or every secret in natural language. Review evidence before publishing.

No credentials are needed by the normalizer. If a surrounding workflow downloads reports, it must use least privilege and avoid supplying production credentials to untrusted pull-request jobs. The library does not claim to authenticate source reports or verify that tests actually ran. Valid schema and honest local normalization are separate from provenance and producer trust.

Use a stable, isolated staging directory controlled by the caller. All symlink components are rejected. Portable JavaScript filesystem APIs cannot eliminate every concurrent hostile parent-directory replacement race; do not share the input directory with an active adversary. Outputs are sent to stdout; caller-controlled file redirection determines storage and retention.
