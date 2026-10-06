from typing import Any, List, Optional

from pydantic import BaseModel

from app.core.tenant import LIVELIHOOD_TENANT_ID


class AuditDetails(BaseModel):
    createdBy: Optional[str] = None
    lastModifiedBy: Optional[str] = None
    createdTime: Optional[int] = None
    lastModifiedTime: Optional[int] = None


class Document(BaseModel):
    """Mirrors field-planner-activity's Document model, so a workflow document can be sent
    through verbatim; only fileStoreId is actually read here."""
    id: Optional[str] = None
    tenantId: Optional[str] = None
    bomId: Optional[str] = None
    documentType: Optional[str] = None
    fileStoreId: Optional[str] = None
    documentUid: Optional[str] = None
    additionalDetails: Optional[Any] = None
    status: Optional[str] = None
    auditDetails: Optional[AuditDetails] = None


class DocumentAppendRequest(BaseModel):
    tenantId: str = LIVELIHOOD_TENANT_ID
    module: str
    parentFileStoreId: str
    documents: List[Document]


class DocumentAppendResponse(BaseModel):
    ResponseInfo: Optional[Any] = None
    fileStoreId: str
    tenantId: str
    appendedDocumentCount: int
