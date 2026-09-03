# eGov Filestore

`backend/core-services/egov-filestore`

## What it does

Provides file upload/download capability for every other module in the platform. It can be configured against AWS S3, Azure, Minio, or the local filesystem to store files. In Livelihood, it's the backing store for installation evidence photos/videos, out-of-warranty quotations, and generated handover letters/PDFs.

## Where to look

- `backend/core-services/egov-filestore/README.md`
- The Swagger API contract linked from that README.
