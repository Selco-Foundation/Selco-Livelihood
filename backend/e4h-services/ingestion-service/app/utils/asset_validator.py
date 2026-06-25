import pandas as pd

from app.utils.facility_validator import validate_columns, format_col_name

ASSET_ID_COLUMN = "Asset Id"


def asset_validation(df, mdms_client, request_info, schema_name):
    """Schema-driven validation for the asset ingestion sheet.
    Mirrors facility_validation: required/pattern/enum/allowed-value checks from the
    MDMS schema, plus a unique-serial-number check. New assets = rows with blank Asset Id."""
    df = df.reset_index(drop=True)
    errors = [[] for _ in range(len(df))]
    add_err = lambda i, msg: errors[i].append(msg)

    if ASSET_ID_COLUMN in df.columns:
        new_rows = df[df[ASSET_ID_COLUMN].isna() | (df[ASSET_ID_COLUMN].astype(str).str.strip() == "")]
    else:
        new_rows = df
    if new_rows.empty:
        return errors
    new_rows = new_rows.reset_index()

    schema = mdms_client.get_column_definitions_and_row_constraints_with_metadata(request_info, schema_name)

    validate_columns(new_rows, schema, lambda i, m: add_err(new_rows.loc[i, "index"], m))
    _validate_unique_serial(df, schema, add_err)

    return errors


def _validate_unique_serial(df, schema, add_err):
    col = next((c for c in schema.get("column_list", []) if c.get("code") == "serialNumber"), None)
    if not col:
        return
    header = format_col_name(col)
    if header not in df.columns:
        return
    seen = {}
    for i, val in enumerate(df[header]):
        if pd.isna(val) or str(val).strip() == "":
            continue
        s = str(val).strip()
        if s in seen:
            add_err(i, f"Duplicate {header}: '{s}' (also in row {seen[s] + 1})")
        else:
            seen[s] = i
