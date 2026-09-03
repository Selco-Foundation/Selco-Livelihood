# Troubleshooting

This page is a stub — no dedicated troubleshooting guide exists in the repository as of this writing. A few pointers that follow directly from the architecture documented elsewhere in this GitBook:

- **A workflow action seems to silently fail or a state seems unreachable** — confirm the business service's actual registered states/actions against a running `egov-workflow-v2` instance rather than assuming a design document's state diagram is already live; see the caution note in [Workflows and crons](../backend/workflows-and-crons.md).
- **A new field shows up in the API but not in search/filtering** — check whether it was added to all three of the API model, the persister mapping, and the indexer mapping; see [Data and integrations → Ingestion](../data-and-integrations/ingestion.md).
- **Local services can't reach each other** — confirm the shared infrastructure (Postgres, Kafka, Elasticsearch) and DIGIT backbone services are up first; see [Local setup](../getting-started/local-setup.md).

If you find a recurring issue and its fix, this is the page to extend.
