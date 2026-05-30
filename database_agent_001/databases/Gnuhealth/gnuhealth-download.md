# GNU Health Demo Database Download

The official download page does not link to the SQL dumps.
The dumps are on a separate directory listing page.

## Step 1 — Open this URL in your browser

```
https://www.gnuhealth.org/downloads/postgres_dumps/
```

You will see a list of `.sql.gz` files, one per GNU Health version.

## Step 2 — Click the latest stable file

```
gnuhealth-50-demo.sql.gz
```

> **Note:** Version 50 = GNU Health 5.0. This is the latest stable release.
> If this file does not download, try `gnuhealth-44-demo.sql.gz` (version 4.4) instead.
> Avoid files with odd minor numbers like `gnuhealth-41-demo.sql.gz` — those are unstable builds.

## What you get

| Property | Value |
|---|---|
| File format | gzip compressed SQL dump |
| Restore tool | `psql` (plain SQL, not `pg_restore`) |
| Approximate size | 10–50 MB compressed |
| Database after restore | ~100–500 MB |
| Tables | ~200–300 |
