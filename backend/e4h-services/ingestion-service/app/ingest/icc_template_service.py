"""Assembles the IC Report template workbook the Project Manager downloads.

The workbook itself comes out of filestore untouched -- it is the blank template seeded per
Solution. This module locks its structure, so the positional field mapping the upload relies on
cannot be broken by an inserted or renumbered row, and shades every cell the Project Manager may
not edit grey, so the few they fill stand out. It also fetches that blank template, which the
upload compares the read-only cells against.
"""
from fastapi import HTTPException
from openpyxl.styles import PatternFill, Protection
from openpyxl.worksheet.worksheet import Worksheet

from app.core.logging import AppLogger
from app.utils.filestore_client import FilestoreClient
from app.utils.icc_template_parser import (COL_CAPACITY, COL_MAKE, COL_QUANTITY, COL_SL_NO,
                                           ParsedTemplate)

logger = AppLogger().get_logger()

# The only cells the Project Manager fills on a line item. Everything else on the row stays
# locked: the Sl. No. because field names are assigned by position and a renumbered row shifts
# every name after it, and the Product because it is the Solution's own bill of material.
EDITABLE_LINE_ITEM_COLUMNS = (COL_MAKE, COL_CAPACITY, COL_QUANTITY)

# Column B, where the header block keeps its values.
HEADER_VALUE_COLUMN = 2

# The read-only cells of the Project Manager's part of the sheet (columns A-E, down to the
# technician section) are shaded this grey. Cells already coloured -- the column headers and
# category rows -- keep their colour.
READ_ONLY_FILL = PatternFill(fill_type="solid", fgColor="FFD9D9D9")
LAST_SHADED_COLUMN = COL_QUANTITY


def protect_input_cells(sheet: Worksheet, parsed: ParsedTemplate) -> None:
    """Lock the template's structure, leaving only the cells the Project Manager fills.

    Field names are assigned by position at upload -- line item *i* takes the names MDMS declares
    for line item *i* -- so inserting, deleting or renumbering a row silently re-points every name
    after it. Locking the structure is how that stops being an easy accident.

    It is an affordance, not a control: a Project Manager can unprotect the sheet in two clicks
    and Google Sheets drops protection on import entirely. The authoritative checks are on
    upload: ``bom_form_catalog.structural_errors`` compares the workbook's category sequence
    against the form's, and ``icc_template_parser.read_only_errors`` compares each line item's
    Sl. No. and Product against the blank template's. This just means they have to mean it.

    Two openpyxl details worth knowing:

    * Every cell is ``locked=True`` by default and protection does nothing until
      ``sheet.protection.sheet`` is set -- so this is "switch it on, then punch holes", not
      "lock things down".
    * ``SheetProtection`` uses OOXML polarity, where ``True`` means *blocked*. Hence
      ``insertRows = True`` to forbid inserting rows, but ``selectLockedCells = False`` to keep
      selection working.
    """
    unlocked = Protection(locked=False)

    for item in parsed.line_items:
        for column in EDITABLE_LINE_ITEM_COLUMNS:
            sheet.cell(row=item.row, column=column).protection = unlocked

    # The header block's two Project-Manager-owned values. Both rows are merged across B:E, and
    # assigning .protection to a MergedCell raises -- set the anchor, which Excel honours for the
    # whole range.
    for row in (parsed.tender_row, parsed.purchase_order_row):
        if row:
            sheet.cell(row=row, column=HEADER_VALUE_COLUMN).protection = unlocked

    _shade_read_only_cells(sheet, parsed)

    protection = sheet.protection
    protection.sheet = True
    protection.insertRows = protection.deleteRows = True
    protection.insertColumns = protection.deleteColumns = True
    protection.sort = protection.autoFilter = protection.pivotTables = True
    protection.objects = protection.scenarios = True
    # Formatting is harmless -- widening a column to read a long product name should not be a
    # fight -- and selection must stay possible or the unlocked cells cannot be typed into.
    protection.formatCells = protection.formatColumns = protection.formatRows = False
    protection.selectLockedCells = protection.selectUnlockedCells = False

    logger.info(
        f"Protected sheet {sheet.title!r}: {len(parsed.line_items)} line item row(s) editable "
        f"in columns {EDITABLE_LINE_ITEM_COLUMNS}, structure locked")


def _shade_read_only_cells(sheet: Worksheet, parsed: ParsedTemplate) -> None:
    """Grey out every locked, uncoloured cell from below the title down to the technician section.

    A merged range follows its anchor: the anchor's lock decides, and every cell of the range is
    shaded so the whole block reads as one.
    """
    if parsed.technician_row:
        last_row = parsed.technician_row - 1
    elif parsed.line_items:
        last_row = max(item.row for item in parsed.line_items)
    else:
        return

    anchor_of = {}
    for merged in sheet.merged_cells.ranges:
        for row, column in merged.cells:
            anchor_of[(row, column)] = (merged.min_row, merged.min_col)

    for row in range(2, last_row + 1):
        for column in range(COL_SL_NO, LAST_SHADED_COLUMN + 1):
            anchor = sheet.cell(*anchor_of.get((row, column), (row, column)))
            cell = sheet.cell(row=row, column=column)
            if anchor.protection.locked and not cell.fill.fill_type:
                cell.fill = READ_ONLY_FILL


def fetch_blank_template(fieldplan_client, request_info, solution_code: str) -> bytes:
    """The Solution's blank IC Report template, as stored in filestore.

    Resolved through field-planner, which owns icc_templates, rather than read from that table
    directly, so nothing depends on the two services sharing a database.
    """
    try:
        blank_templates = fieldplan_client.search_blank_templates(request_info, [solution_code])
    except Exception as e:
        logger.error(f"Could not resolve blank template for {solution_code}: {e}", exc_info=True)
        raise HTTPException(status_code=502, detail=f"Could not resolve the blank template: {e}")

    file_store_id = blank_templates.get(solution_code)
    if not file_store_id:
        raise HTTPException(
            status_code=400,
            detail=f"SOLUTION_TEMPLATE_NOT_FOUND: no blank IC Report template is configured "
                   f"for Solution {solution_code}.")

    try:
        return FilestoreClient().download_file(request_info, file_store_id)
    except Exception as e:
        logger.error(f"Filestore fetch failed for {file_store_id}: {e}", exc_info=True)
        raise HTTPException(
            status_code=502,
            detail=f"Could not fetch the template file from filestore: {e}")
