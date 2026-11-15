use std::{
    fs,
    path::{Path, PathBuf},
    process,
    time::{Duration, SystemTime, UNIX_EPOCH},
};

use anyhow::{anyhow, Context, Result};
use clap::{Parser, Subcommand, ValueEnum};
use rusqlite::{backup::Backup, Connection, OpenFlags};
use serde::Serialize;

const TOOL_VERSION: &str = "1.0.0";
const EXPECTED_SCHEMA_VERSION: i64 = 2;
const DEFAULT_EXPECTED_ROWS: i64 = 71_963;
const REQUIRED_TABLES: &[&str] = &[
    "kids_media",
    "kids_media_fts",
    "media_quality_issues",
    "browsable_media",
    "high_stim_boundary",
];
const REQUIRED_INDEXES: &[&str] = &[
    "idx_browse_stimulation_order",
    "idx_browse_type_order",
    "idx_browse_age_order",
    "idx_browse_language_order",
    "idx_episode_parent_order",
];

#[derive(Clone, Copy, Debug, Serialize, ValueEnum)]
#[serde(rename_all = "lowercase")]
enum OutputFormat {
    Human,
    Json,
}

#[derive(Debug, Parser)]
#[command(name = "zaen-db", version = TOOL_VERSION, about = "Read-only Ask Zaen media database operations")]
struct Cli {
    #[command(subcommand)]
    command: Command,
}

#[derive(Debug, Subcommand)]
enum Command {
    /// Audit schema, data quality, referential integrity, FTS, and query plans.
    Audit {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        expected_rows: Option<i64>,
        #[arg(long)]
        strict: bool,
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Create a timestamped consistent SQLite backup and verify it.
    Backup {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        destination_dir: PathBuf,
        #[arg(long)]
        expected_rows: Option<i64>,
        #[arg(long)]
        strict: bool,
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Verify an existing database backup without changing it.
    VerifyBackup {
        #[arg(long)]
        database: PathBuf,
        #[arg(long)]
        expected_rows: Option<i64>,
        #[arg(long)]
        strict: bool,
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        #[arg(long)]
        output: Option<PathBuf>,
    },
    /// Print the canonical browse, episode, and FTS query plans.
    QueryPlan {
        #[arg(long)]
        database: PathBuf,
        #[arg(long, value_enum, default_value_t = OutputFormat::Human)]
        format: OutputFormat,
        #[arg(long)]
        output: Option<PathBuf>,
    },
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct CheckStatus {
    name: String,
    present: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QueryPlanReport {
    name: String,
    uses_expected_index: bool,
    uses_fts: bool,
    temporary_b_tree: bool,
    full_table_scan: bool,
    details: Vec<String>,
    passed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct AuditReport {
    tool_version: String,
    database_path: String,
    schema_version: Option<i64>,
    expected_schema_version: i64,
    expected_row_count: Option<i64>,
    row_count: Option<i64>,
    fts_row_count: Option<i64>,
    high_stimulation_count: Option<i64>,
    orphan_episode_count: Option<i64>,
    foreign_keys_enabled: bool,
    query_only_enabled: bool,
    integrity: String,
    foreign_key_errors: usize,
    tables: Vec<CheckStatus>,
    indexes: Vec<CheckStatus>,
    query_plans: Vec<QueryPlanReport>,
    errors: Vec<String>,
    passed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct BackupReport {
    tool_version: String,
    source_path: String,
    destination_path: String,
    verification: AuditReport,
    passed: bool,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
struct QueryPlanCommandReport {
    tool_version: String,
    database_path: String,
    query_plans: Vec<QueryPlanReport>,
    errors: Vec<String>,
    passed: bool,
}

struct PlanDefinition {
    name: &'static str,
    expected_index: Option<&'static str>,
    sql: &'static str,
    require_fts: bool,
}

const PLAN_DEFINITIONS: &[PlanDefinition] = &[
    PlanDefinition {
        name: "browse_stimulation_order",
        expected_index: Some("idx_browse_stimulation_order"),
        sql: "SELECT m.id FROM kids_media AS m WHERE m.media_type != 'episode' AND COALESCE(m.stimulation_label, '') != 'high' ORDER BY COALESCE(m.stimulation_score, 2147483647), m.id LIMIT 48",
        require_fts: false,
    },
    PlanDefinition {
        name: "browse_media_type_order",
        expected_index: Some("idx_browse_type_order"),
        sql: "SELECT m.id FROM kids_media AS m WHERE m.media_type = 'show' AND m.media_type != 'episode' ORDER BY COALESCE(m.stimulation_score, 2147483647), m.id LIMIT 48",
        require_fts: false,
    },
    PlanDefinition {
        name: "browse_age_order",
        expected_index: Some("idx_browse_age_order"),
        sql: "SELECT m.id FROM kids_media AS m WHERE m.media_type != 'episode' AND m.target_age_group = '3-5' ORDER BY COALESCE(m.stimulation_score, 2147483647), m.id LIMIT 48",
        require_fts: false,
    },
    PlanDefinition {
        name: "browse_language_order",
        expected_index: Some("idx_browse_language_order"),
        sql: "SELECT m.id FROM kids_media AS m WHERE m.media_type != 'episode' AND LOWER(m.language) = 'english' ORDER BY COALESCE(m.stimulation_score, 2147483647), m.id LIMIT 48",
        require_fts: false,
    },
    PlanDefinition {
        name: "episode_parent_order",
        expected_index: Some("idx_episode_parent_order"),
        sql: "SELECT e.id FROM kids_media AS e WHERE e.media_type = 'episode' AND e.parent_show_id = 1 ORDER BY COALESCE(CAST(json_extract(e.metadata_json, '$.season') AS INTEGER), 1), COALESCE(CAST(json_extract(e.metadata_json, '$.number') AS INTEGER), 0), e.id LIMIT 100",
        require_fts: false,
    },
    PlanDefinition {
        name: "fts_ranked_prefix_search",
        expected_index: None,
        sql: "SELECT m.id FROM kids_media AS m JOIN (SELECT rowid, bm25(kids_media_fts) AS relevance FROM kids_media_fts WHERE kids_media_fts MATCH 'calm*') AS f ON f.rowid = m.id WHERE m.media_type != 'episode' AND COALESCE(m.stimulation_label, '') != 'high' ORDER BY f.relevance ASC, m.id ASC LIMIT 48",
        require_fts: true,
    },
];

fn main() {
    let exit_code = match run() {
        Ok(code) => code,
        Err(error) => {
            eprintln!("zaen-db: {error:#}");
            4
        }
    };
    process::exit(exit_code);
}

fn run() -> Result<i32> {
    let cli = Cli::parse();
    match cli.command {
        Command::Audit {
            database,
            expected_rows,
            strict,
            format,
            output,
        } => {
            let expected = expected_rows.or(strict.then_some(DEFAULT_EXPECTED_ROWS));
            let report = audit_database(&database, expected)?;
            emit(&report, format, output)?;
            Ok(report_exit_code(&report))
        }
        Command::VerifyBackup {
            database,
            expected_rows,
            strict,
            format,
            output,
        } => {
            let expected = expected_rows.or(strict.then_some(DEFAULT_EXPECTED_ROWS));
            let report = audit_database(&database, expected)?;
            emit(&report, format, output)?;
            Ok(report_exit_code(&report))
        }
        Command::Backup {
            database,
            destination_dir,
            expected_rows,
            strict,
            format,
            output,
        } => {
            let expected = expected_rows.or(strict.then_some(DEFAULT_EXPECTED_ROWS));
            let report = backup_database(&database, &destination_dir, expected)?;
            emit(&report, format, output)?;
            Ok(if report.passed { 0 } else { 2 })
        }
        Command::QueryPlan {
            database,
            format,
            output,
        } => {
            let report = query_plan_report(&database)?;
            emit(&report, format, output)?;
            Ok(if report.passed { 0 } else { 2 })
        }
    }
}

fn open_read_only(path: &Path) -> Result<Connection> {
    if !path.is_file() {
        return Err(anyhow!(
            "database does not exist or is not a file: {}",
            path.display()
        ));
    }

    let flags = OpenFlags::SQLITE_OPEN_READ_ONLY | OpenFlags::SQLITE_OPEN_URI;
    let connection = Connection::open_with_flags(path, flags)
        .with_context(|| format!("opening database read-only: {}", path.display()))?;
    connection
        .busy_timeout(Duration::from_secs(60))
        .context("setting SQLite busy timeout")?;
    connection
        .pragma_update(None, "foreign_keys", true)
        .context("enabling SQLite foreign keys")?;
    connection
        .pragma_update(None, "query_only", true)
        .context("enabling SQLite query-only mode")?;

    let foreign_keys: i64 = connection
        .pragma_query_value(None, "foreign_keys", |row| row.get(0))
        .context("reading SQLite foreign_keys setting")?;
    let query_only: i64 = connection
        .pragma_query_value(None, "query_only", |row| row.get(0))
        .context("reading SQLite query_only setting")?;
    if foreign_keys != 1 || query_only != 1 {
        return Err(anyhow!(
            "SQLite connection settings were not applied (foreign_keys={foreign_keys}, query_only={query_only})"
        ));
    }
    Ok(connection)
}

fn audit_database(path: &Path, expected_rows: Option<i64>) -> Result<AuditReport> {
    let connection = open_read_only(path)?;
    let mut errors = Vec::new();

    let schema_version = pragma_i64(&connection, "user_version")?;
    if schema_version != EXPECTED_SCHEMA_VERSION {
        errors.push(format!(
            "unsupported schema version: expected {EXPECTED_SCHEMA_VERSION}, found {schema_version}"
        ));
    }

    let tables = REQUIRED_TABLES
        .iter()
        .map(|name| {
            let present = object_exists(&connection, name).unwrap_or(false);
            if !present {
                errors.push(format!("missing required table or view: {name}"));
            }
            CheckStatus {
                name: (*name).to_owned(),
                present,
            }
        })
        .collect::<Vec<_>>();

    let indexes = REQUIRED_INDEXES
        .iter()
        .map(|name| {
            let present = index_exists(&connection, name).unwrap_or(false);
            if !present {
                errors.push(format!("missing required index: {name}"));
            }
            CheckStatus {
                name: (*name).to_owned(),
                present,
            }
        })
        .collect::<Vec<_>>();

    let row_count = count_if_present(&connection, "kids_media", &mut errors);
    let fts_row_count = count_if_present(&connection, "kids_media_fts", &mut errors);
    let high_stimulation_count = query_count(
        &connection,
        "SELECT COUNT(*) FROM kids_media WHERE stimulation_label = 'high'",
        "high-stimulation row count",
        &mut errors,
    );
    let orphan_episode_count = query_count(
        &connection,
        "SELECT COUNT(*) FROM kids_media AS e WHERE e.media_type = 'episode' AND NOT EXISTS (SELECT 1 FROM kids_media AS p WHERE p.id = e.parent_show_id AND p.media_type = 'show')",
        "orphan episode count",
        &mut errors,
    );

    if let (Some(expected), Some(actual)) = (expected_rows, row_count) {
        if expected != actual {
            errors.push(format!(
                "row count mismatch: expected {expected}, found {actual}"
            ));
        }
    }
    if let (Some(rows), Some(fts_rows)) = (row_count, fts_row_count) {
        if rows != fts_rows {
            errors.push(format!(
                "FTS row count mismatch: media={rows}, fts={fts_rows}"
            ));
        }
    }
    if high_stimulation_count.is_some_and(|count| count != 0) {
        errors.push("high-stimulation rows are present".to_owned());
    }
    if orphan_episode_count.is_some_and(|count| count != 0) {
        errors.push("orphan episodes are present".to_owned());
    }

    let integrity = integrity_check(&connection, &mut errors);
    let foreign_key_errors = foreign_key_error_count(&connection, &mut errors);
    let query_plans = collect_query_plans(&connection, &mut errors);
    if query_plans.iter().any(|plan| !plan.passed) {
        errors.push("one or more canonical query plans failed verification".to_owned());
    }

    Ok(AuditReport {
        tool_version: TOOL_VERSION.to_owned(),
        database_path: path.display().to_string(),
        schema_version: Some(schema_version),
        expected_schema_version: EXPECTED_SCHEMA_VERSION,
        expected_row_count: expected_rows,
        row_count,
        fts_row_count,
        high_stimulation_count,
        orphan_episode_count,
        foreign_keys_enabled: true,
        query_only_enabled: true,
        integrity,
        foreign_key_errors,
        tables,
        indexes,
        query_plans,
        errors,
        passed: false,
    })
    .map(|mut report| {
        report.passed = report.errors.is_empty()
            && report.integrity == "ok"
            && report.foreign_key_errors == 0
            && report.query_plans.iter().all(|plan| plan.passed);
        report
    })
}

fn backup_database(
    source_path: &Path,
    destination_dir: &Path,
    expected_rows: Option<i64>,
) -> Result<BackupReport> {
    let source = open_read_only(source_path)?;
    fs::create_dir_all(destination_dir)
        .with_context(|| format!("creating backup directory: {}", destination_dir.display()))?;

    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .context("reading system clock")?
        .as_secs();
    let mut destination_path = destination_dir.join(format!("kids_media-backup-{timestamp}.db"));
    let mut suffix = 1_u32;
    while destination_path.exists() {
        destination_path =
            destination_dir.join(format!("kids_media-backup-{timestamp}-{suffix}.db"));
        suffix += 1;
    }

    let mut destination = Connection::open(&destination_path)
        .with_context(|| format!("creating backup: {}", destination_path.display()))?;
    {
        let backup =
            Backup::new(&source, &mut destination).context("initializing SQLite backup")?;
        backup
            .run_to_completion(64, Duration::from_millis(100), None)
            .context("running SQLite online backup")?;
    }
    drop(destination);

    let verification = audit_database(&destination_path, expected_rows)?;
    Ok(BackupReport {
        tool_version: TOOL_VERSION.to_owned(),
        source_path: source_path.display().to_string(),
        destination_path: destination_path.display().to_string(),
        passed: verification.passed,
        verification,
    })
}

fn query_plan_report(path: &Path) -> Result<QueryPlanCommandReport> {
    let connection = open_read_only(path)?;
    let mut errors = Vec::new();
    let query_plans = collect_query_plans(&connection, &mut errors);
    let passed = errors.is_empty() && query_plans.iter().all(|plan| plan.passed);
    Ok(QueryPlanCommandReport {
        tool_version: TOOL_VERSION.to_owned(),
        database_path: path.display().to_string(),
        query_plans,
        errors,
        passed,
    })
}

fn report_exit_code(report: &AuditReport) -> i32 {
    if report.passed {
        0
    } else if report
        .errors
        .iter()
        .any(|error| error.starts_with("unsupported schema version"))
    {
        3
    } else {
        2
    }
}

fn collect_query_plans(connection: &Connection, errors: &mut Vec<String>) -> Vec<QueryPlanReport> {
    PLAN_DEFINITIONS
        .iter()
        .map(
            |definition| match explain_query(connection, definition.sql) {
                Ok(details) => {
                    let uses_expected_index = definition
                        .expected_index
                        .is_none_or(|index| details.iter().any(|detail| detail.contains(index)));
                    let uses_fts = details.iter().any(|detail| {
                        detail.to_ascii_lowercase().contains("fts")
                            || detail.to_ascii_lowercase().contains("virtual table")
                    });
                    let temporary_b_tree = details
                        .iter()
                        .any(|detail| detail.to_ascii_uppercase().contains("TEMP B-TREE"));
                    let full_table_scan = details.iter().any(|detail| {
                        let upper = detail.to_ascii_uppercase();
                        upper.contains("SCAN M") && !upper.contains("USING")
                    });
                    // FTS ranking is expected to sort a bounded match set by BM25,
                    // which may legitimately use a temporary B-tree. The browse,
                    // language, and episode plans must remain index-ordered.
                    let passed = uses_expected_index
                        && (!definition.require_fts || uses_fts)
                        && (definition.require_fts || !temporary_b_tree)
                        && !full_table_scan;
                    QueryPlanReport {
                        name: definition.name.to_owned(),
                        uses_expected_index,
                        uses_fts,
                        temporary_b_tree,
                        full_table_scan,
                        details,
                        passed,
                    }
                }
                Err(error) => {
                    errors.push(format!("query plan {} failed: {error}", definition.name));
                    QueryPlanReport {
                        name: definition.name.to_owned(),
                        uses_expected_index: false,
                        uses_fts: false,
                        temporary_b_tree: false,
                        full_table_scan: true,
                        details: Vec::new(),
                        passed: false,
                    }
                }
            },
        )
        .collect()
}

fn explain_query(connection: &Connection, sql: &str) -> rusqlite::Result<Vec<String>> {
    let mut statement = connection.prepare(&format!("EXPLAIN QUERY PLAN {sql}"))?;
    let rows = statement.query_map([], |row| row.get::<_, String>(3))?;
    rows.collect()
}

fn integrity_check(connection: &Connection, errors: &mut Vec<String>) -> String {
    match connection.query_row("PRAGMA integrity_check", [], |row| row.get::<_, String>(0)) {
        Ok(value) => {
            if value != "ok" {
                errors.push(format!("SQLite integrity check failed: {value}"));
            }
            value
        }
        Err(error) => {
            errors.push(format!("SQLite integrity check failed to run: {error}"));
            "error".to_owned()
        }
    }
}

fn foreign_key_error_count(connection: &Connection, errors: &mut Vec<String>) -> usize {
    let result = connection
        .prepare("PRAGMA foreign_key_check")
        .and_then(|mut statement| {
            let rows = statement.query_map([], |_| Ok(()))?;
            rows.collect::<rusqlite::Result<Vec<_>>>()
        });
    match result {
        Ok(rows) => {
            if !rows.is_empty() {
                errors.push(format!(
                    "SQLite foreign-key check found {} errors",
                    rows.len()
                ));
            }
            rows.len()
        }
        Err(error) => {
            errors.push(format!("SQLite foreign-key check failed to run: {error}"));
            usize::MAX
        }
    }
}

fn pragma_i64(connection: &Connection, name: &str) -> Result<i64> {
    connection
        .pragma_query_value(None, name, |row| row.get(0))
        .with_context(|| format!("reading PRAGMA {name}"))
}

fn object_exists(connection: &Connection, name: &str) -> rusqlite::Result<bool> {
    connection.query_row(
        "SELECT EXISTS(SELECT 1 FROM sqlite_master WHERE name = ?1)",
        [name],
        |row| row.get(0),
    )
}

fn index_exists(connection: &Connection, name: &str) -> rusqlite::Result<bool> {
    object_exists(connection, name)
}

fn count_if_present(connection: &Connection, table: &str, errors: &mut Vec<String>) -> Option<i64> {
    let sql = format!("SELECT COUNT(*) FROM {table}");
    query_count(connection, &sql, &format!("{table} row count"), errors)
}

fn query_count(
    connection: &Connection,
    sql: &str,
    label: &str,
    errors: &mut Vec<String>,
) -> Option<i64> {
    match connection.query_row(sql, [], |row| row.get(0)) {
        Ok(value) => Some(value),
        Err(error) => {
            errors.push(format!("{label} failed: {error}"));
            None
        }
    }
}

fn emit<T: Serialize>(value: &T, format: OutputFormat, output: Option<PathBuf>) -> Result<()> {
    let rendered = match format {
        OutputFormat::Json => serde_json::to_string_pretty(value)?,
        OutputFormat::Human => human_render(value)?,
    };
    if let Some(path) = output {
        fs::write(&path, &rendered)
            .with_context(|| format!("writing report: {}", path.display()))?;
    } else {
        println!("{rendered}");
    }
    Ok(())
}

fn human_render<T: Serialize>(value: &T) -> Result<String> {
    let json = serde_json::to_value(value)?;
    let passed = json
        .get("passed")
        .and_then(serde_json::Value::as_bool)
        .unwrap_or(false);
    let status = if passed { "PASS" } else { "FAIL" };
    let path = json
        .get("databasePath")
        .or_else(|| json.get("destinationPath"))
        .and_then(serde_json::Value::as_str)
        .unwrap_or("database");
    let mut output = format!("{status}  {path}\n");
    if let Some(schema) = json
        .get("schemaVersion")
        .and_then(serde_json::Value::as_i64)
    {
        output.push_str(&format!("schema: {schema}\n"));
    }
    if let Some(rows) = json.get("rowCount").and_then(serde_json::Value::as_i64) {
        output.push_str(&format!("media rows: {rows}\n"));
    }
    if let Some(fts_rows) = json.get("ftsRowCount").and_then(serde_json::Value::as_i64) {
        output.push_str(&format!("FTS rows: {fts_rows}\n"));
    }
    if let Some(errors) = json.get("errors").and_then(serde_json::Value::as_array) {
        for error in errors {
            output.push_str(&format!("error: {}\n", error.as_str().unwrap_or("unknown")));
        }
    }
    if json.get("queryPlans").is_some() {
        output.push_str("query plans: see --format json for details\n");
    }
    Ok(output.trim_end().to_owned())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rusqlite::params;

    fn fixture_path(label: &str) -> PathBuf {
        let nonce = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("clock")
            .as_nanos();
        std::env::temp_dir().join(format!("zaen-db-test-{}-{nonce}-{label}.db", process::id()))
    }

    fn create_fixture(path: &Path, row_count: usize) {
        let connection = Connection::open(path).expect("open fixture");
        connection
            .execute_batch(
                r#"
                PRAGMA foreign_keys = ON;
                PRAGMA user_version = 2;
                CREATE TABLE kids_media (
                    id INTEGER PRIMARY KEY,
                    title TEXT NOT NULL,
                    media_type TEXT NOT NULL,
                    stimulation_score INTEGER,
                    stimulation_label TEXT,
                    target_age_group TEXT,
                    language TEXT,
                    parent_show_id INTEGER REFERENCES kids_media(id) ON DELETE CASCADE,
                    metadata_json TEXT NOT NULL DEFAULT '{}'
                );
                CREATE TABLE media_quality_issues (
                    media_id INTEGER NOT NULL REFERENCES kids_media(id) ON DELETE CASCADE,
                    issue_code TEXT NOT NULL,
                    PRIMARY KEY (media_id, issue_code)
                );
                CREATE VIEW browsable_media AS SELECT * FROM kids_media WHERE media_type != 'episode';
                CREATE TABLE high_stim_boundary (id INTEGER PRIMARY KEY);
                CREATE VIRTUAL TABLE kids_media_fts USING fts5(title);
                CREATE INDEX idx_browse_stimulation_order
                    ON kids_media(COALESCE(stimulation_score, 2147483647), id)
                    WHERE media_type != 'episode';
                CREATE INDEX idx_browse_type_order
                    ON kids_media(media_type, COALESCE(stimulation_score, 2147483647), id)
                    WHERE media_type != 'episode';
                CREATE INDEX idx_browse_age_order
                    ON kids_media(target_age_group, COALESCE(stimulation_score, 2147483647), id)
                    WHERE media_type != 'episode';
                CREATE INDEX idx_browse_language_order
                    ON kids_media(LOWER(language), COALESCE(stimulation_score, 2147483647), id)
                    WHERE media_type != 'episode';
                CREATE INDEX idx_episode_parent_order
                    ON kids_media(
                        parent_show_id,
                        media_type,
                        COALESCE(CAST(json_extract(metadata_json, '$.season') AS INTEGER), 1),
                        COALESCE(CAST(json_extract(metadata_json, '$.number') AS INTEGER), 0),
                        id
                    )
                    WHERE media_type = 'episode';
                "#,
            )
            .expect("create fixture schema");

        for index in 1..=row_count {
            let media_type = if index == 1 { "show" } else { "video" };
            connection
                .execute(
                    "INSERT INTO kids_media (id, title, media_type, stimulation_score, stimulation_label, target_age_group, language, metadata_json) VALUES (?1, ?2, ?3, ?4, 'calm', '3-5', 'English', '{}')",
                    params![index as i64, format!("Calm title {index}"), media_type, index as i64],
                )
                .expect("insert fixture media");
            connection
                .execute(
                    "INSERT INTO kids_media_fts (rowid, title) VALUES (?1, ?2)",
                    params![index as i64, format!("Calm title {index}")],
                )
                .expect("insert fixture fts");
        }
        connection
            .execute(
                "INSERT INTO kids_media (id, title, media_type, stimulation_score, stimulation_label, target_age_group, language, parent_show_id, metadata_json) VALUES (10000, 'Episode', 'episode', 1, 'calm', '3-5', 'English', 1, '{\"season\":1,\"number\":1}')",
                [],
            )
            .expect("insert episode");
        connection
            .execute(
                "INSERT INTO kids_media_fts (rowid, title) VALUES (10000, 'Episode')",
                [],
            )
            .expect("insert episode fts");
    }

    #[test]
    fn valid_fixture_passes_strict_audit() {
        let path = fixture_path("valid");
        create_fixture(&path, 100);
        let report = audit_database(&path, Some(101)).expect("audit");
        assert!(
            report.passed,
            "errors: {:?}; plans: {:?}",
            report.errors, report.query_plans
        );
        assert_eq!(report.row_count, Some(101));
        assert_eq!(report.fts_row_count, Some(101));
        assert_eq!(report.orphan_episode_count, Some(0));
        fs::remove_file(path).expect("cleanup");
    }

    #[test]
    fn audit_rejects_high_rows_or_orphans() {
        let path = fixture_path("invalid");
        create_fixture(&path, 10);
        let connection = Connection::open(&path).expect("open fixture");
        connection
            .execute_batch("PRAGMA foreign_keys = OFF;")
            .expect("disable fixture foreign keys");
        connection
            .execute(
                "INSERT INTO kids_media (id, title, media_type, stimulation_label, metadata_json) VALUES (20000, 'High', 'video', 'high', '{}')",
                [],
            )
            .expect("insert high row");
        connection
            .execute(
                "INSERT INTO kids_media (id, title, media_type, parent_show_id, metadata_json) VALUES (20001, 'Orphan', 'episode', 99999, '{}')",
                [],
            )
            .expect("insert orphan with foreign keys disabled on fixture connection");
        drop(connection);
        let report = audit_database(&path, None).expect("audit");
        assert!(!report.passed);
        assert!(report
            .errors
            .iter()
            .any(|error| error.contains("high-stimulation")));
        assert!(report.errors.iter().any(|error| error.contains("orphan")));
        fs::remove_file(path).expect("cleanup");
    }

    #[test]
    fn backup_is_consistent_and_never_overwrites() {
        let source = fixture_path("backup-source");
        create_fixture(&source, 20);
        let destination_dir = fixture_path("backup-dir");
        fs::create_dir_all(&destination_dir).expect("create destination");
        let report = backup_database(&source, &destination_dir, Some(21)).expect("backup");
        assert!(
            report.passed,
            "errors: {:?}; plans: {:?}",
            report.verification.errors, report.verification.query_plans
        );
        assert!(Path::new(&report.destination_path).is_file());
        let second = backup_database(&source, &destination_dir, Some(21)).expect("second backup");
        assert_ne!(report.destination_path, second.destination_path);
        fs::remove_file(source).expect("cleanup source");
        fs::remove_file(report.destination_path).expect("cleanup backup");
        fs::remove_file(second.destination_path).expect("cleanup second backup");
        fs::remove_dir(destination_dir).expect("cleanup directory");
    }

    #[test]
    fn query_plan_report_checks_all_canonical_queries() {
        let path = fixture_path("plans");
        create_fixture(&path, 1000);
        let report = query_plan_report(&path).expect("query plans");
        assert_eq!(report.query_plans.len(), PLAN_DEFINITIONS.len());
        assert!(report
            .query_plans
            .iter()
            .any(|plan| plan.name == "fts_ranked_prefix_search" && plan.uses_fts));
        fs::remove_file(path).expect("cleanup");
    }
}
