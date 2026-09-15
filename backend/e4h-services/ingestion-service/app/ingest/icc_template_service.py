"""Assembles the IC Report template workbook the Project Manager downloads.

The workbook itself comes out of filestore untouched -- it is the blank template seeded per
Solution. All this module does is append the read-only reference sheet, which is the "made
any updates if needed" half of the e4h filestore pattern.
"""
from typing import Any, Dict, List

from openpyxl.styles import Font, Protection
from openpyxl.worksheet.worksheet import Worksheet

from app.core.logging import AppLogger
from app.utils.icc_template_parser import (COL_CAPACITY, COL_MAKE, COL_PRODUCT, COL_QUANTITY,
                                           ParsedTemplate)

logger = AppLogger().get_logger()

SITES_SHEET = "Sites"
SITES_HEADERS = ("End User Site", "Site Id", "State", "District", "Block", "Status")

# The only cells the Project Manager fills on a line item. Everything else on the row -- the
# Sl. No. in column A above all -- stays locked, because field names are assigned by position and
# a renumbered or inserted row shifts every name after it.
EDITABLE_LINE_ITEM_COLUMNS = (COL_PRODUCT, COL_MAKE, COL_CAPACITY, COL_QUANTITY)

# Column B, where the header block keeps its values.
HEADER_VALUE_COLUMN = 2


def protect_input_cells(sheet: Worksheet, parsed: ParsedTemplate) -> None:
    """Lock the template's structure, leaving only the cells the Project Manager fills.

    Field names are assigned by position at upload -- line item *i* takes the names MDMS declares
    for line item *i* -- so inserting, deleting or renumbering a row silently re-points every name
    after it. Locking the structure is how that stops being an easy accident.

    It is an affordance, not a control: a Project Manager can unprotect the sheet in two clicks
    and Google Sheets drops protection on import entirely. The authoritative check is
    ``bom_form_catalog.structural_errors`` on upload, which compares the workbook's category
    sequence against the form's and rejects a mismatch. This just means they have to mean it.

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


def append_sites_sheet(workbook, sites: List[Dict[str, Any]]) -> Worksheet:
    """Add a read-only sheet listing the sites this template covers.

    Reference only -- none of it is read back on upload. It earns its place by telling the
    Project Manager which sites a Solution's single template applies to, and by flagging any
    site already published in a sibling plan so the problem surfaces here rather than at
    Vendor Assignment.

    Replaces the sheet if it already exists, so a re-download does not accumulate copies.
    """
    if SITES_SHEET in workbook.sheetnames:
        del workbook[SITES_SHEET]

    sheet = workbook.create_sheet(SITES_SHEET)
    for column, header in enumerate(SITES_HEADERS, start=1):
        cell = sheet.cell(row=1, column=column, value=header)
        cell.font = Font(bold=True)

    for row_index, site in enumerate(sites, start=2):
        values = (
            site.get("name") or "",
            site.get("facility_id") or "",
            site.get("state") or "",
            site.get("district") or "",
            site.get("block") or "",
            site.get("status") or "",
        )
        for column, value in enumerate(values, start=1):
            sheet.cell(row=row_index, column=column, value=value)

    # Every cell locked: this sheet is context, not input. Sheet protection has to be switched
    # on for cell-level locking to take effect at all in Excel.
    for row in sheet.iter_rows(min_row=1, max_row=max(sheet.max_row, 1),
                               max_col=len(SITES_HEADERS)):
        for cell in row:
            cell.protection = Protection(locked=True)
    sheet.protection.sheet = True

    for column, header in enumerate(SITES_HEADERS, start=1):
        longest = max([len(str(header))] + [
            len(str(sheet.cell(row=r, column=column).value or ""))
            for r in range(2, sheet.max_row + 1)
        ])
        sheet.column_dimensions[sheet.cell(row=1, column=column).column_letter].width = \
            min(max(longest + 2, 12), 45)

    logger.info(f"Appended {SITES_SHEET} sheet with {len(sites)} site(s)")
    return sheet
