# Ask Zaen database toolkit

`zaen-db` is a read-only Rust operations tool for the media SQLite database. It
does not replace the SvelteKit API or the JavaScript migration runner. The
toolkit opens the database read-only, enables `foreign_keys` and `query_only`
for every connection, and only writes a destination file for the `backup`
command.

## Build and test

From `tools/zaen-db`:

```text
cargo fmt --check
cargo test
cargo clippy --all-targets --all-features -- -D warnings
cargo build --release
```

## Commands

Audit a development copy without enforcing the production row count:

```text
cargo run -- audit --database path/to/kids_media.db --format human
```

Run the strict production gate. If `--expected-rows` is omitted, strict mode
expects the approved 71,963 media rows:

```text
cargo run -- audit --database path/to/kids_media.db --strict --format json --output output/media-db-audit.json
```

Create a timestamped, consistent backup and verify it before returning:

```text
cargo run -- backup --database path/to/kids_media.db --destination-dir path/to/backups --strict --format json
```

Verify an existing backup without modifying it:

```text
cargo run -- verify-backup --database path/to/backups/kids_media-backup-<timestamp>.db --strict
```

Inspect canonical browse, episode, and FTS query plans:

```text
cargo run -- query-plan --database path/to/kids_media.db --format json
```

Exit codes are `0` for a passing report, `2` for a validation failure,
`3` for unsupported usage/schema conditions, and `4` for I/O or SQLite
execution failures.

The planned VPS deployment uses a Linux release binary in
`/var/www/calm-kids/tools/zaen-db`, but deployment is intentionally separate
from building and testing this local package.
