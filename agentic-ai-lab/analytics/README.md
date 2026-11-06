# Audit analytics reference implementation

This folder complements the browser-based Gemini audit demonstrator.

- analytics/sql/audit_control_tests.sql: PostgreSQL reference queries for invoice, procurement, supplier, pricing and fleet tests.
- analytics/python/audit_analytics.py: pandas routines for data-quality profiling and the same analytical patterns.
- analytics/python/test_audit_analytics.py: unit tests for the core routines.
- analytics/python/requirements.txt: minimal dependency.

The live Cloudflare Worker currently executes deterministic JavaScript tools against its own seeded synthetic records. The SQL and Python files are reference implementations for a future governed data-platform pilot; they are not called by the live Worker. No ERP, Palantir Foundry, BigQuery, Power BI or customer system is connected by these files.

All outputs are review candidates, not conclusions. Before enterprise use, bind thresholds to approved control policies, validate source data and joins, add data contracts and lineage, and require authorised auditor review.
