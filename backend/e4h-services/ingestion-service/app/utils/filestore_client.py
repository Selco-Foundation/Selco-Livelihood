import os
from typing import Optional, Tuple

import requests
from dotenv import load_dotenv

from app.core.logging import AppLogger
from app.core.tenant import LIVELIHOOD_TENANT_ID
from app.schemas.request_info import RequestInfo

logger = AppLogger().get_logger()
load_dotenv()

filestore_service_url = os.getenv("FILESTORE_SERVICE_URL")


class FilestoreClient:
    """Reads files out of, and writes files into, egov-filestore.

    Two distinct uses, hence the two download methods:
      - download_file: the blank IC Report template for each Solution, which is always an
        xlsx workbook and is validated as one.
      - download_bytes / upload_file: arbitrary content, used by the /document/append
        endpoint, which merges PDFs and images it cannot make any format assumption about.

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

    def download_bytes(self, tenant_id: str, file_store_id: str,
                       auth_token: Optional[str] = None) -> Tuple[bytes, Optional[str]]:
        """Raw bytes of any file in filestore, plus its Content-Type.

        Unlike download_file this makes no assumption about the format -- callers merging
        PDFs and images cannot use the xlsx PK check -- so a filestore miss served as a
        200 with an error body reaches the caller as unparseable content rather than as a
        clear failure here. pdf_utils rejects it at that point.
        """
        if not self.filestore_url:
            raise RuntimeError("FILESTORE_SERVICE_URL is not configured; files cannot be fetched")
        if not file_store_id:
            raise ValueError("file_store_id is required")

        url = f"{self.filestore_url}/filestore/v1/files/id"
        params = {"tenantId": tenant_id, "fileStoreId": file_store_id}
        headers = {"auth-token": auth_token} if auth_token else {}

        logger.trace(f"Downloading file from filestore: fileStoreId={file_store_id}, tenantId={tenant_id}")
        response = requests.get(url, params=params, headers=headers, timeout=120)
        response.raise_for_status()

        logger.debug(f"Downloaded file fileStoreId={file_store_id}, size={len(response.content)} bytes")
        return response.content, response.headers.get("Content-Type")

    def upload_file(self, file_bytes: bytes, file_name: str, tenant_id: str, module: str,
                    content_type: str = "application/pdf", tag: Optional[str] = None,
                    auth_token: Optional[str] = None) -> str:
        """Uploads a file to filestore and returns its generated fileStoreId."""
        if not self.filestore_url:
            raise RuntimeError("FILESTORE_SERVICE_URL is not configured; files cannot be uploaded")

        url = f"{self.filestore_url}/filestore/v1/files"
        data = {"tenantId": tenant_id, "module": module}
        if tag:
            data["tag"] = tag
        files = {"file": (file_name, file_bytes, content_type)}
        headers = {"auth-token": auth_token} if auth_token else {}

        logger.trace(f"Uploading file to filestore: fileName={file_name}, tenantId={tenant_id}, module={module}")
        response = requests.post(url, data=data, files=files, headers=headers, timeout=120)
        response.raise_for_status()

        response_body = response.json()
        uploaded_files = response_body.get("files") or []
        if not uploaded_files:
            raise RuntimeError(f"Filestore upload returned no files: {response_body}")

        file_store_id = uploaded_files[0].get("fileStoreId")
        if not file_store_id:
            raise RuntimeError(f"Filestore upload returned no fileStoreId: {response_body}")

        logger.info(f"Uploaded file to filestore successfully: fileStoreId={file_store_id}")
        return file_store_id
