"""Stable, never-expiring links to filestore content.

A generated report is a durable artefact: it is stored, downloaded, mailed and printed,
and read long after it was produced. A pre-signed S3 URL is the opposite -- it carries
X-Amz-Expires (one hour here) and SigV4 refuses to sign for more than seven days, so a
pre-signed URL written into a PDF is guaranteed to rot.

These endpoints break that coupling. The PDF carries only a /view link, which holds no
signature and therefore never expires; the pre-signed URL is minted at the instant the
reader follows the link, and lives just long enough to serve that one playback.

Deliberately unauthenticated: the links are followed from a PDF opened outside the
application (a mail client, for instance), where no auth token exists. That matches the
exposure a pre-signed URL already had -- anyone holding the link can fetch the file --
minus the time bound. Do not extend these endpoints to anything more sensitive than
report attachments without putting a token on them first.
"""

import os

from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Query, Request
from fastapi.responses import RedirectResponse

from app.core.logging import AppLogger
from app.core.tenant import LIVELIHOOD_TENANT_ID
from app.utils.filestore_client import FilestoreClient

load_dotenv()
filestore_service_url = os.getenv("FILESTORE_SERVICE_URL")

# Externally reachable base of this service, used to build the absolute link written into
# a report. It must be the address the reader's browser can reach (the gateway), which is
# why it cannot be derived from the request alone -- behind an ingress, request.base_url is
# the in-cluster address unless X-Forwarded-* is honoured end to end. Left unset, the
# request is used as a best-effort fallback so local runs still work.
public_base_url = os.getenv("INGESTION_SERVICE_PUBLIC_URL")

router = APIRouter()
logger = AppLogger().get_logger()


def _view_url(request: Request, tenant_id: str, file_store_id: str) -> str:
    base = (public_base_url or str(request.base_url)).rstrip("/")
    return (f"{base}/ingestion-service/document/view"
            f"?tenantId={tenant_id}&fileStoreId={file_store_id}")


@router.get('/view',
            summary='Redirect to a freshly signed URL for a filestore file',
            response_description='302 redirect to the file')
async def view_document(
        fileStoreId: str = Query(..., description="Filestore id of the file to open"),
        tenantId: str = Query(LIVELIHOOD_TENANT_ID, description="Tenant owning the file"),
):
    logger.trace(f"Resolving view redirect: fileStoreId={fileStoreId}, tenantId={tenantId}")

    if not filestore_service_url:
        raise HTTPException(status_code=500, detail="Filestore service is not configured")
    try:
        signed_url = FilestoreClient(filestore_service_url).get_presigned_url(tenantId, fileStoreId)
    except FileNotFoundError as e:
        logger.warning(f"Unknown fileStoreId={fileStoreId}: {e}")
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Error resolving URL for fileStoreId={fileStoreId}: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Failed to resolve file URL: {str(e)}")

    # 302, never 301: the target is valid for an hour, so a permanent redirect would be
    # cached by browsers and proxies and then replay a dead URL. no-store says the same
    # thing to anything that caches regardless of status.
    return RedirectResponse(url=signed_url, status_code=302,
                            headers={"Cache-Control": "no-store"})


@router.get('/links',
            summary='Stable view link for a filestore file, in filestore response shape',
            response_description='{"fileStoreIds": [{"id", "tenantId", "url"}]}')
async def document_links(
        request: Request,
        fileStoreId: str = Query(..., description="Filestore id to build a link for"),
        tenantId: str = Query(LIVELIHOOD_TENANT_ID, description="Tenant owning the file"),
):
    """The link pdf-service drops into a report.

    Shaped like egov-filestore's own /files/url response ({"fileStoreIds": [{id, url}]}) so
    a pdf-service data-config swaps the filestore host for this one and keeps its existing
    $.fileStoreIds[0].url mapping untouched.

    Builds a string and talks to nothing. That is the point: the filestore call it replaces
    could fail and take the whole PDF generation down with it, whereas a bad fileStoreId
    here merely yields a link that 404s when someone follows it -- the report still renders.
    """
    view_url = _view_url(request, tenantId, fileStoreId)
    logger.trace(f"Built stable link for fileStoreId={fileStoreId}")
    return {"fileStoreIds": [{"id": fileStoreId, "tenantId": tenantId, "url": view_url}]}
