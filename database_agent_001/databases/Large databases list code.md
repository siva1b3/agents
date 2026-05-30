# Large PostgreSQL sample databases for AI agent testing

**The best options for 100+ table PostgreSQL databases with actual data are open-source ERP systems** — specifically Metasfresh (~1,000+ tables), iDempiere (~900+ tables), and Odoo (~600+ tables) — all of which run natively on PostgreSQL and ship with demo data via Docker. For non-ERP alternatives, MusicBrainz (200+ tables, 30GB+ of real music data) and SportsDB (100+ tables, pre-built Docker image) are the strongest candidates. No traditional "sample database" beyond SportsDB reaches the 100-table threshold; the path to large, data-rich PostgreSQL schemas runs through production open-source applications.

Below is a detailed breakdown of every viable option found, ordered by table count and overall suitability.

---

## Tier 1: ERP systems with 600–1,500 tables

These are the richest PostgreSQL schemas available. Each models a complete business — accounting, inventory, sales, purchasing, HR, manufacturing — with extensive foreign key networks and real demo data.

### Metasfresh ERP ⭐ (best overall fit)

**Metasfresh is a fork of ADempiere built exclusively on PostgreSQL, with a dedicated Docker database image that ships pre-populated.** It covers manufacturing, supply chain, CRM, accounting, and warehouse management across an estimated **900–1,500+ tables**. The schema inherits ADempiere's rich Application Dictionary (AD_* metadata tables) plus Metasfresh's own extensions.

- **Domain:** Full ERP (manufacturing, supply chain, CRM, accounting, warehouse)
- **Table count:** ~900–1,500+
- **Data included:** Yes — the `metasfresh/metasfresh-db` Docker image comes pre-loaded with configuration data, master data, and the complete application dictionary
- **Installation:** `docker run -p 5432:5432 metasfresh/metasfresh-db` or full stack via `docker-compose up` from [metasfresh-docker](https://github.com/metasfresh/metasfresh-docker). Then `pg_dump` to extract.
- **GitHub:** [github.com/metasfresh/metasfresh](https://github.com/metasfresh/metasfresh)
- **Notable features:** Foreign keys, indexes, views, **PL/pgSQL stored procedures/functions** (inherited from Compiere/ADempiere architecture), JSONB columns, rich metadata model
- **Limitations:** Docker image is large and takes several minutes to initialize on first run. Some documentation is in German. Credentials: `metasfresh/metasfresh`, database name: `metasfresh`

### iDempiere ERP ⭐

**iDempiere auto-seeds a PostgreSQL database with the "GardenWorld" demo company on first Docker launch**, providing ~**900+ tables** across the `adempiere` schema. The schema covers general ledger, accounts payable/receivable, inventory, manufacturing, purchasing, and sales with the classic Compiere/ADempiere data dictionary model.

- **Domain:** Full ERP (GL, AP, AR, inventory, manufacturing, sales)
- **Table count:** ~900+
- **Data included:** Yes — GardenWorld demo company with chart of accounts, business partners, products, sample orders. Default users: GardenAdmin/GardenAdmin
- **Installation:** Docker Compose with `idempiereofficial/idempiere:12-master` image + standard `postgres:16`. On first start, iDempiere imports its `Adempiere_pg.dmp` seed file automatically. Alternatively, download the installer from SourceForge and run `RUN_ImportIdempiere.sh`.
- **GitHub:** [github.com/idempiere/idempiere-docker](https://github.com/idempiere/idempiere-docker)
- **Notable features:** Foreign keys, functional indexes, **reporting views**, **PL/pgSQL functions** (especially for accounting posting), Application Dictionary metadata system, multi-schema design
- **Limitations:** Seed database initialization takes several minutes. Schema uses the `adempiere` PostgreSQL schema (not public). Community wiki documentation.

### Odoo

**Odoo uses PostgreSQL exclusively and generates 600+ tables for a base installation**, scaling higher as modules are installed. Selecting "Demo data" during database creation populates tables with sample companies, products, sales orders, invoices, and partners.

- **Domain:** Full ERP/CRM (sales, inventory, accounting, HR, manufacturing, e-commerce, project management)
- **Table count:** ~600+ (base), potentially thousands with all modules
- **Data included:** Yes — check "Demo data" when creating a database, or use CLI: `odoo-bin -d mydb --without-demo=False -i base,sale,purchase,stock,account`
- **Installation:** Docker: `docker run -d --name db -e POSTGRES_USER=odoo -e POSTGRES_PASSWORD=odoo postgres:15` then `docker run -p 8069:8069 --link db:db odoo`. Create database via web UI at localhost:8069, then `pg_dump` to extract.
- **Docker Hub:** [hub.docker.com/_/odoo](https://hub.docker.com/_/odoo)
- **Notable features:** Foreign keys (ORM-generated for all Many2one fields), indexes, some database views, JSONB columns. Business logic is in Python, so **minimal stored procedures**.
- **Limitations:** No pre-built SQL dump — you must spin up an instance and export yourself. Demo data volume varies by module (hundreds of demo records per major app).

### Apache OFBiz

**OFBiz creates ~800+ tables and includes extensive seed + demo data** covering CRM, e-commerce, manufacturing, HR, and accounting. PostgreSQL is a first-class supported backend.

- **Domain:** Full ERP + e-commerce (CRM, catalog, orders, manufacturing, HR, accounting)
- **Table count:** ~800+
- **Data included:** Yes — `./gradlew cleanAll loadDefault` loads seed and demo data (sample companies, products, orders, parties, catalogs)
- **Installation:** Clone from [github.com/apache/ofbiz-framework](https://github.com/apache/ofbiz-framework), configure PostgreSQL in `entityengine.xml`, create databases (`ofbiz`, `ofbizolap`, `ofbiztenant`), run `./gradlew cleanAll loadDefault`, then `pg_dump`.
- **Notable features:** Foreign keys (configurable), indexes, entity views. Requires Java JDK + Gradle.
- **Limitations:** No pre-built dump file. Requires a build step. Business logic is in Java services, not stored procedures.

---

## Tier 2: Domain-specific databases with 100–300+ tables

### MusicBrainz ⭐ (best non-ERP option)

**MusicBrainz is the world's largest open music encyclopedia, built natively on PostgreSQL with 200+ tables and over 30GB of real data.** The schema covers artists, releases, recordings, labels, works, events, and complex many-to-many relationships across 13 entity types. Data dumps are updated twice weekly.

- **Domain:** Music metadata (artists, albums, recordings, labels, relationships)
- **Table count:** **200+** (core tables plus relationship, alias, tag, and rating tables for each entity type)
- **Data included:** Yes — **massive real-world dataset** (~1M+ artists, millions of recordings/releases)
- **Installation:** Download full dumps from `ftp.musicbrainz.org/pub/musicbrainz/data/fullexport/`, import via `mbslave` or Docker image at [github.com/arey/musicbrainz-database](https://github.com/arey/musicbrainz-database)
- **Notable features:** Extensive FK relationships, separate `CreatePrimaryKeys.sql` and `CreateIndexes.sql` scripts, **triggers and functions**, multiple PostgreSQL schemas, uses `cube` and `earthdistance` extensions
- **Limitations:** Very large (~30GB+), complex setup, CC BY-NC-SA 3.0 license for some data (non-commercial use). Schema requires domain knowledge.

### GNU Health (healthcare)

**GNU Health provides downloadable PostgreSQL demo dumps directly from its website** — a rare convenience. Built on the Tryton framework, it models a complete hospital information system with **200–300+ tables** covering patients, encounters, lab results, medications, surgeries, epidemiology, and genetics.

- **Domain:** Hospital management / public health (patients, encounters, labs, medications, surgeries, genetics, epidemiology)
- **Table count:** ~200–300+
- **Data included:** Yes — official demo dumps at [gnuhealth.org/downloads/postgres_dumps/](https://www.gnuhealth.org/downloads/postgres_dumps/) with sample patients, clinical histories, appointments, lab results
- **Installation:** Download dump + run `install_demo_database.sh`, or use Docker via [github.com/mbehrle/docker-gnuhealth-demo](https://github.com/mbehrle/docker-gnuhealth-demo)
- **Notable features:** Foreign keys, indexes, proper normalization via Tryton ORM. GPL v3 license — fully open.
- **Limitations:** Demo data is moderate in volume (thousands of records, not millions). Tryton framework tables add to the count.

### Tryton ERP

**Tryton uniquely offers daily-refreshed PostgreSQL demo database backups for direct download** at [tryton.org/~demo/](https://www.tryton.org/~demo/). With full business modules installed, the schema reaches **200–400+ tables** covering accounting, inventory, sales, purchasing, and production.

- **Domain:** ERP (accounting, stock, sales, purchasing, production)
- **Table count:** ~200–400+ (depending on installed modules)
- **Data included:** Yes — daily demo backups with example data
- **Installation:** Download PostgreSQL dump from tryton.org/~demo/ and `pg_restore`, or use Docker (`tryton/tryton`)
- **Notable features:** Foreign keys, indexes. Business logic is in Python (minimal stored procedures).
- **Limitations:** Demo database may be on the smaller side of the range. Module-dependent table count.

### Saleor (e-commerce)

**Saleor is a modern headless e-commerce platform using Django/PostgreSQL with ~100+ tables** covering products, orders, customers, payments, warehouses, channels, checkout, shipping, and discounts.

- **Domain:** E-commerce (product catalog, orders, payments, warehouses, channels, discounts)
- **Table count:** ~100+
- **Data included:** Yes — via `python manage.py populatedb --createsuperuser`
- **Installation:** Docker via [github.com/saleor/saleor-platform](https://github.com/saleor/saleor-platform) (docker-compose). Requires Python 3.12+, PostgreSQL, Redis.
- **GitHub:** [github.com/saleor/saleor](https://github.com/saleor/saleor)
- **Notable features:** Django ORM-managed FK relationships and indexes, GraphQL API layer
- **Limitations:** No standalone SQL dump — must run the application to generate data. Complex infrastructure requirements.

### SportsDB ⭐ (easiest 100+ table setup)

**SportsDB is the only purpose-built PostgreSQL sample database that crosses the 100-table threshold**, with ~80,000 rows of real sports data covering football, baseball, basketball, ice hockey, and soccer. A pre-loaded Docker image makes setup trivial.

- **Domain:** Sports statistics (multi-sport: football, baseball, basketball, hockey, soccer)
- **Table count:** **100+** (confirmed)
- **Data included:** Yes — ~80,000 rows of real sports data
- **Installation:** `docker run aa8y/postgres-dataset:sportsdb` for instant setup, or load 5 SQL scripts (`sportsdb_tables.sql`, `sportsdb_inserts.sql`, `sportsdb_indexes.sql`, `sportsdb_constraints.sql`, `sportsdb_fks.sql`) from [YugabyteDB's sample directory](https://github.com/yugabyte/yugabyte-db/tree/master/sample)
- **Notable features:** Foreign keys, indexes, unique constraints, sequences, ER diagram available
- **Limitations:** Data volume is moderate (~80K rows). Sports-specific domain. The sportsdb.org website is partially maintained — best to use the YugabyteDB or Docker sources.

---

## Tier 3: Close to 100 tables or notable for other reasons

### Mouse Genome Informatics (MGI)

A real **production database dump** from the Jackson Laboratory with **~180 tables** and tens of gigabytes of genomic data. Available as a `pg_restore`-compatible custom dump at [informatics.jax.org/downloads/database_backups/](http://www.informatics.jax.org/downloads/database_backups/). This is not a sample database — it's a live scientific database backup. Highly normalized with real FK relationships, but the molecular biology domain requires specialist knowledge.

### AdventureWorks for PostgreSQL

The classic Microsoft sample ported to PostgreSQL with **68 tables** across 5 schemas (humanresources, person, production, purchasing, sales) plus **20 views**. Includes ~300 employees, 500 products, 20,000 customers, and 31,000 sales orders. Available at [github.com/lorint/AdventureWorks-for-Postgres](https://github.com/lorint/AdventureWorks-for-Postgres). Falls short of 100 tables but remains the most widely-recognized enterprise OLTP sample. Docker Compose available.

### Broadleaf Commerce

Java-based enterprise e-commerce with **~200+ tables** covering catalog, pricing, promotions, CMS, orders, and customer management. PostgreSQL is supported but not the default (HSQLDB). Requires manual configuration and Java build tooling. No standalone dump. Complex setup limits practical utility.

### MIMIC-III/IV (clinical data)

The gold standard for clinical research data — **26 tables** of real de-identified ICU patient data. The **demo version** (100 patients) is freely downloadable as a PostgreSQL backup from PhysioNet with no restrictions. The full dataset (**46,520 patients, 330M+ rows, ~90GB**) requires credentialing. Available at [physionet.org/content/mimiciii-demo/1.4/](https://physionet.org/content/mimiciii-demo/1.4/). Few tables but extremely rich data.

---

## Quick-reference comparison

| Database | Tables | Data rows | Domain | Install method | Stored procs | Pre-built dump |
|---|---|---|---|---|---|---|
| **Metasfresh** | ~900–1,500 | Thousands+ | Full ERP | Docker image | ✅ Yes | ✅ Docker DB image |
| **iDempiere** | ~900 | Thousands+ | Full ERP | Docker auto-seed | ✅ Yes | ✅ Seed dump |
| **Apache OFBiz** | ~800 | Thousands+ | ERP + e-commerce | Gradle build | ❌ | ❌ Generate yourself |
| **Odoo** | ~600+ | Hundreds+ | Full ERP/CRM | Docker + UI | ❌ | ❌ Generate yourself |
| **Tryton** | ~200–400 | Thousands | ERP | Download dump | ❌ | ✅ Daily backups |
| **GNU Health** | ~200–300 | Thousands | Hospital mgmt | Download dump | ❌ | ✅ Official dumps |
| **MusicBrainz** | 200+ | Millions | Music metadata | Docker / dumps | ✅ Yes | ✅ Weekly dumps |
| **Saleor** | ~100+ | Generated | E-commerce | Docker + CLI | ❌ | ❌ Generate yourself |
| **SportsDB** | 100+ | ~80K | Sports stats | Docker image | ❌ | ✅ Docker + SQL files |
| **MGI** | ~180 | Millions | Genomics | pg_restore | Unknown | ✅ Weekly dumps |
| **AdventureWorks** | 68 | ~50K+ | Manufacturing | SQL file / Docker | ❌ | ✅ SQL scripts |

## Practical recommendations for AI agent testing

For testing a database AI agent, the ideal setup balances schema complexity, data richness, and ease of deployment. **Three setups stand out as the strongest choices:**

**For maximum schema complexity**, Metasfresh or iDempiere deliver 900+ tables with full ERP semantics, foreign key networks, stored procedures, and realistic business data — all deployable via a single Docker command. These are the best stress tests for an AI agent's ability to navigate large, interconnected schemas.

**For the fastest path to a 100+ table database with data**, SportsDB via `docker run aa8y/postgres-dataset:sportsdb` is unmatched in simplicity. It's ready in seconds with FK relationships, indexes, and real data.

**For rich domain diversity and real-world data**, MusicBrainz offers 200+ tables with millions of rows of genuine music metadata, triggers, functions, and PostgreSQL extensions — excellent for testing how an AI agent handles a complex, production-grade schema. GNU Health fills a similar role for healthcare, with the advantage of downloadable dumps requiring no application setup.

A practical testing strategy would combine SportsDB for quick validation, one ERP system (Metasfresh or iDempiere) for deep schema complexity testing, and MusicBrainz or GNU Health for real-world data volume testing. All are freely available, PostgreSQL-native, and deployable within minutes.