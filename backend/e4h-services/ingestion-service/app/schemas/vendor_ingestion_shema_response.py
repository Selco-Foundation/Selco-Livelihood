from typing import Optional, List, Any

from pydantic import BaseModel


class MDMSAuditDetails(BaseModel):
    createdBy: Optional[str] = None
    lastModifiedBy: Optional[str] = None
    createdTime: Optional[int] = None
    lastModifiedTime: Optional[int] = None


class MDMSDataSource(BaseModel):
    path: Optional[str] = None
    master: Optional[str] = None
    module: Optional[str] = None
    filterType: Optional[str] = None
    mode: Optional[str] = None  # "resolve" (default) | "direct" | "nested"
    displayField: Optional[str] = None  # used by "resolve"; defaults to "name"
    nestedField: Optional[str] = None  # used by "nested"; the array field to unwrap
    # When a schema definition's JSON-schema locks mdmsSource to {path, master, module,
    # filterType} only, mode/nestedField can't be stored directly -- mdms_client.py falls
    # back to inferring them from filterType ("DIRECT_ONE_OF"/"NESTED_ONE_OF") and master
    # (strip trailing "Schema" for the nested array field).


class MDMSColumn(BaseModel):
    name: Optional[str] = None
    type: Optional[str] = None
    required: Optional[bool] = None
    pattern: Optional[str] = None
    mdmsSource: Optional[MDMSDataSource] = None
    code: Optional[str] = None

class RowConstraint(BaseModel):
    message: Optional[str] = None
    type: Optional[str] = None
    fields: Optional[List[str]] = None

class MDMSData(BaseModel):
    id: Optional[int] = None
    columns: Optional[List[MDMSColumn]] = None
    rowConstraints: Optional[List[RowConstraint]] = None

    class Config:
        extra = "allow"


class MDMS(BaseModel):
    id: Optional[str] = None
    tenantId: Optional[str] = None
    schemaCode: Optional[str] = None
    uniqueIdentifier: Optional[str] = None
    data: Optional[MDMSData] = None
    isActive: Optional[bool] = None
    auditDetails: Optional[MDMSAuditDetails] = None


class ResponseInfo(BaseModel):
    apiId: Optional[Any] = None
    ver: Optional[Any] = None
    ts: Optional[Any] = None
    resMsgId: Optional[str] = None
    msgId: Optional[Any] = None
    status: Optional[str] = None


class IngestionSchemaResponse(BaseModel):
    response_info: Optional[ResponseInfo] = None
    mdms: Optional[List[MDMS]] = None