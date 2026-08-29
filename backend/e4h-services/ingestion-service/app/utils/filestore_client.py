import os

import requests
from dotenv import load_dotenv

from app.core.logging import AppLogger
from app.core.tenant import LIVELIHOOD_TENANT_ID
from app.schemas.request_info import RequestInfo

logger = AppLogger().get_logger()
load_dotenv()

filestore_service_url = os.getenv("FILESTORE_SERVICE_URL")


class FilestoreClient:
    """Reads files out of egov-filestore.

    Download only: the blank IC Report template for each Solution lives in filestore
    (pointed at from icc_templates), and nothing in the request path ever writes there --
    the Project Manager's filled workbook is parsed and discarded, not stored.

    Endpoint shape taken from processor-services' StorageUtil/ServiceRequestRepository,
    which is the only working filestore integration in this backend.
    """

    def __init__(self, filestore_url: str = None):
        self.filestore_url = (filestore_url or filestore_service_url or "").rstrip("/")

    def download_file(self, request_info: RequestInfo, file_store_id: str,
                     tenant_id: str = LIVELIHOOD_TENANT_ID) -> bytes:
        if not self.filestore_url:
            raise RuntimeError(
                "FILESTORE_SERVICE_URL is not configured; blank templates cannot be fetched")
        if not file_store_id:
            raise ValueError("file_store_id is required")

        url = f"{self.filestore_url}/filestore/v1/files/id"
        params = {"tenantId": tenant_id, "fileStoreId": file_store_id}
        headers = {}
        if request_info is not None and request_info.auth_token:
            headers["auth-token"] = request_info.auth_token

        response = requests.get(url, params=params, headers=headers, timeout=120)
        response.raise_for_status()

        # A filestore miss can come back as a 200 carrying an error body rather than a 404,
        # which would otherwise be served to the Project Manager as a corrupt workbook. Every
        # xlsx is a zip, so the PK signature is a cheap way to tell a real file from a message.
        if not response.content[:2] == b"PK":
            raise RuntimeError(
                f"filestore did not return a workbook for fileStoreId={file_store_id}: "
                f"{response.content[:300]!r}")

        logger.info(f"Fetched {len(response.content)} bytes from filestore for {file_store_id}")
        return response.content
