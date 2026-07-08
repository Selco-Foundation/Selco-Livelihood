import {
  aggregateBoundaryCodes,
  useAuthStore,
  useBoundary,
  useFacility,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ORDERED_INBOX_STATUSES } from "../../constants/inbox-statuses";
import { buildDefaultInboxRoleFilters } from "../../hooks/inbox-defaults";
import { useImComplaintTypes } from "../../hooks/use-im-inbox-summary";
import type { ImInboxFilters, InboxDataResult } from "../../types/inbox";
import { isAssigneeScopedUser, isEndUser } from "../../utils/access";
import { buildFilterQueryFromState } from "../../utils/inbox-filters";

interface FilterOption {
  code: string;
  name: string;
  key?: string;
  parentCode?: string;
}

function codesOf(items: Array<{ code: string }>): Set<string> {
  return new Set(items.map((item) => item.code));
}

interface InboxFilterProps {
  complaints?: InboxDataResult;
  searchParams: { filters?: ImInboxFilters };
  onFilterChange: (filters: ImInboxFilters) => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
  disabled,
  allLabel,
}: {
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (code: string) => void;
  disabled?: boolean;
  allLabel: string;
}) {
  return (
    <div className="min-w-0 space-y-1.5">
      <label className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="relative">
        <select
          className="livelihood-filter-select disabled:cursor-not-allowed disabled:opacity-50"
          value={value}
          disabled={disabled}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.code} value={option.code}>
              {option.name}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted-foreground" />
      </div>
    </div>
  );
}

export function InboxFilter({
  searchParams,
  onFilterChange,
}: InboxFilterProps) {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const userUuid = user?.uuid ?? "";
  const roles = user?.roles;
  const boundaries = useJurisdictionStore((state) => state.boundaries);
  const jurisdictionCodes = aggregateBoundaryCodes(boundaries);

  const assignedToOptions = useMemo(
    () => [
      { code: "ASSIGNED_TO_ME", name: t("ASSIGNED_TO_ME") },
      { code: "ASSIGNED_TO_ALL", name: t("ASSIGNED_TO_ALL") },
    ],
    [t],
  );

  const defaultFilters = buildDefaultInboxRoleFilters(user);
  const showGeoFilters = !isEndUser(roles);
  const showAssigneeFilter = !isAssigneeScopedUser(roles);

  const [selectAssigned, setSelectAssigned] = useState(
    searchParams.filters?.wfFilters?.assignee?.[0]?.code === userUuid
      ? assignedToOptions[0]
      : assignedToOptions[1],
  );

  const emptyPgrFilters = {
    incidentType: [] as Array<{ code: string; name?: string; key?: string }>,
    facility: [] as Array<{ code: string; name?: string }>,
    state: [] as Array<{ code: string; name?: string }>,
    district: [] as Array<{ code: string; name?: string }>,
    block: [] as Array<{ code: string; name?: string }>,
    applicationStatus: [] as Array<{ code: string }>,
  };

  const [pgrfilters, setPgrFilters] = useState({
    ...emptyPgrFilters,
    ...(searchParams.filters?.pgrfilters ?? defaultFilters.pgrfilters),
  });

  const [wfFilters, setWfFilters] = useState(
    searchParams.filters?.wfFilters ?? defaultFilters.wfFilters!,
  );

  const [stateMenu, setStateMenu] = useState<FilterOption[]>([]);
  const [districtMenu, setDistrictMenu] = useState<FilterOption[]>([]);
  const [blockMenu, setBlockMenu] = useState<FilterOption[]>([]);
  const [facilityMenu, setFacilityMenu] = useState<FilterOption[]>([]);
  const [facilityOptions, setFacilityOptions] = useState<FilterOption[]>([]);
  const [facilityBoundaries, setFacilityBoundaries] = useState<FilterOption[]>([]);
  const [facilityBoundaryCodes, setFacilityBoundaryCodes] = useState<string[]>(["-"]);

  const { data: boundaryData } = useBoundary(jurisdictionCodes);
  const { data: facilityData } = useFacility(facilityBoundaryCodes);
  const { data: complaintTypes } = useImComplaintTypes();

  const sortedMenu = useMemo(() => {
    if (!complaintTypes?.length) {
      return [];
    }
    const othersItem = complaintTypes.find((item) => item.key === "");
    const remaining = [...complaintTypes]
      .filter((item) => item.key !== "")
      .sort((a, b) => a.name.localeCompare(b.name));
    if (othersItem) {
      remaining.push(othersItem);
    }
    return remaining.map((item) => ({
      code: item.key,
      key: item.key,
      name: item.name,
    }));
  }, [complaintTypes]);

  const statusMenu = useMemo(
    () =>
      ORDERED_INBOX_STATUSES.map((status) => ({
        code: status.code,
        name: t(`CS_COMMON_${status.code}`),
      })),
    [t],
  );

  useEffect(() => {
    if (boundaryData?.facilities) {
      setFacilityBoundaries(
        boundaryData.facilities.map((facility) => ({
          code: facility.code,
          name: facility.code,
          parentCode: facility.parentCode,
        })),
      );
      setFacilityBoundaryCodes(
        boundaryData.facilities.map((facility) => facility.code).filter(Boolean),
      );
    }
  }, [boundaryData]);

  useEffect(() => {
    if (facilityBoundaries.length && facilityData?.facilities?.length) {
      const parentMap = new Map(
        facilityBoundaries.map((facility) => [facility.code, facility.parentCode]),
      );
      setFacilityOptions(
        facilityData.facilities.map((facility) => ({
          code: facility.boundaryCode,
          name: facility.boundaryCode,
          parentCode: parentMap.get(facility.boundaryCode),
        })),
      );
    }
  }, [facilityBoundaries, facilityData]);

  useEffect(() => {
    if (boundaryData?.states) {
      const unique = new Map<string, FilterOption>();
      for (const state of boundaryData.states) {
        if (!unique.has(state.code)) {
          unique.set(state.code, {
            code: state.code,
            name: t(`BOUNDARY_${state.code}`),
          });
        }
      }
      setStateMenu([...unique.values()].sort((a, b) => a.name.localeCompare(b.name)));
    }
  }, [boundaryData, t]);

  useEffect(() => {
    if (!boundaryData?.districts) {
      setDistrictMenu([]);
      return;
    }
    const selectedState = pgrfilters.state?.[0];
    const districts = selectedState
      ? boundaryData.districts.filter((district) => district.parentCode === selectedState.code)
      : boundaryData.districts;

    setDistrictMenu(
      districts
        .map((district) => ({
          code: district.code,
          name: t(`BOUNDARY_${district.code}`),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [pgrfilters.state, boundaryData, t]);

  useEffect(() => {
    if (!boundaryData?.blocks) {
      setBlockMenu([]);
      return;
    }
    const selectedState = pgrfilters.state?.[0];
    const selectedDistrict = pgrfilters.district?.[0];

    let blocks = boundaryData.blocks;
    if (selectedDistrict) {
      blocks = blocks.filter((block) => block.parentCode === selectedDistrict.code);
    } else if (selectedState && boundaryData.districts) {
      const districtCodes = codesOf(
        boundaryData.districts.filter((district) => district.parentCode === selectedState.code),
      );
      blocks = blocks.filter((block) => block.parentCode && districtCodes.has(block.parentCode));
    }

    setBlockMenu(
      blocks
        .map((block) => ({
          code: block.code,
          name: t(`BOUNDARY_${block.code}`),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [pgrfilters.state, pgrfilters.district, boundaryData, t]);

  useEffect(() => {
    const selectedState = pgrfilters.state?.[0];
    const selectedDistrict = pgrfilters.district?.[0];
    const selectedBlock = pgrfilters.block?.[0];

    let facilities = facilityOptions;
    if (selectedBlock) {
      facilities = facilities.filter((facility) => facility.parentCode === selectedBlock.code);
    } else if (selectedDistrict && boundaryData?.blocks) {
      const blockCodes = codesOf(
        boundaryData.blocks.filter((block) => block.parentCode === selectedDistrict.code),
      );
      facilities = facilities.filter(
        (facility) => facility.parentCode && blockCodes.has(facility.parentCode),
      );
    } else if (selectedState && boundaryData?.districts && boundaryData?.blocks) {
      const districtCodes = codesOf(
        boundaryData.districts.filter((district) => district.parentCode === selectedState.code),
      );
      const blockCodes = codesOf(
        boundaryData.blocks.filter(
          (block) => block.parentCode && districtCodes.has(block.parentCode),
        ),
      );
      facilities = facilities.filter(
        (facility) => facility.parentCode && blockCodes.has(facility.parentCode),
      );
    }

    setFacilityMenu(
      facilities
        .map((facility) => ({
          code: facility.code,
          name: t(`BOUNDARY_${facility.code}`),
        }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    );
  }, [pgrfilters.state, pgrfilters.district, pgrfilters.block, facilityOptions, boundaryData, t]);

  useEffect(() => {
    if (!showAssigneeFilter) {
      if (userUuid) {
        setWfFilters((prev) => ({
          ...prev,
          assignee: [{ code: userUuid }],
        }));
      }
      return;
    }
    const code = selectAssigned.code === "ASSIGNED_TO_ME" ? userUuid : "";
    setWfFilters((prev) => ({
      ...prev,
      assignee: [{ code }],
    }));
  }, [selectAssigned, showAssigneeFilter, userUuid]);

  useEffect(() => {
    const { pgrQuery, wfQuery } = buildFilterQueryFromState({ pgrfilters, wfFilters });
    onFilterChange({ pgrQuery, wfQuery, wfFilters, pgrfilters });
  }, [pgrfilters, wfFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const allLabel = t("ES_COMMON_ALL");

  return (
    <div className="livelihood-card p-5">
      {showAssigneeFilter ? (
        <>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("ES_COMMON_FILTER_BY")}:
            </span>
            {assignedToOptions.map((option) => (
              <label key={option.code} className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="assignedTo"
                  className="livelihood-radio"
                  checked={selectAssigned.code === option.code}
                  onChange={() => setSelectAssigned(option)}
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>

          <div className="my-5 border-t border-border" />
        </>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <FilterSelect
          label={t("CS_COMPLAINT_DETAILS_TICKET_TYPE")}
          value={pgrfilters.incidentType[0]?.code ?? ""}
          options={sortedMenu}
          allLabel={allLabel}
          onChange={(code) => {
            if (!code) {
              setPgrFilters((prev) => ({ ...prev, incidentType: [] }));
              return;
            }
            const option = sortedMenu.find((item) => item.code === code);
            setPgrFilters((prev) => ({
              ...prev,
              incidentType: option ? [{ code: option.code, name: option.name }] : [],
            }));
          }}
        />

        {showGeoFilters ? (
          <>
            <FilterSelect
              label={t("CS_STATE")}
              value={pgrfilters.state[0]?.code ?? ""}
              options={stateMenu}
              allLabel={allLabel}
              onChange={(code) => {
                if (!code) {
                  setPgrFilters((prev) => ({
                    ...prev,
                    state: [],
                    district: [],
                    block: [],
                    facility: [],
                  }));
                  return;
                }
                const option = stateMenu.find((item) => item.code === code);
                setPgrFilters((prev) => ({
                  ...prev,
                  state: option ? [option] : [],
                  district: [],
                  block: [],
                  facility: [],
                }));
              }}
            />

            <FilterSelect
              label={t("CS_DISTRICT")}
              value={pgrfilters.district[0]?.code ?? ""}
              options={districtMenu}
              allLabel={allLabel}
              onChange={(code) => {
                if (!code) {
                  setPgrFilters((prev) => ({ ...prev, district: [], block: [], facility: [] }));
                  return;
                }
                const option = districtMenu.find((item) => item.code === code);
                setPgrFilters((prev) => ({
                  ...prev,
                  district: option ? [option] : [],
                  block: [],
                  facility: [],
                }));
              }}
            />

            <FilterSelect
              label={t("CS_BLOCK")}
              value={pgrfilters.block[0]?.code ?? ""}
              options={blockMenu}
              allLabel={allLabel}
              onChange={(code) => {
                if (!code) {
                  setPgrFilters((prev) => ({ ...prev, block: [], facility: [] }));
                  return;
                }
                const option = blockMenu.find((item) => item.code === code);
                setPgrFilters((prev) => ({
                  ...prev,
                  block: option ? [option] : [],
                  facility: [],
                }));
              }}
            />

            <FilterSelect
              label={t("CS_HEALTH_CARE")}
              value={pgrfilters.facility[0]?.code ?? ""}
              options={facilityMenu}
              allLabel={allLabel}
              onChange={(code) => {
                if (!code) {
                  setPgrFilters((prev) => ({ ...prev, facility: [] }));
                  return;
                }
                const option = facilityMenu.find((item) => item.code === code);
                setPgrFilters((prev) => ({
                  ...prev,
                  facility: option ? [option] : [],
                }));
              }}
            />
          </>
        ) : null}

        <FilterSelect
          label={t("ES_IM_FILTER_STATUS")}
          value={pgrfilters.applicationStatus[0]?.code ?? ""}
          options={statusMenu}
          allLabel={allLabel}
          onChange={(code) => {
            if (!code) {
              setPgrFilters((prev) => ({ ...prev, applicationStatus: [] }));
              return;
            }
            const statusGroup = ORDERED_INBOX_STATUSES.find((item) => item.code === code);
            setPgrFilters((prev) => ({
              ...prev,
              applicationStatus: statusGroup
                ? statusGroup.statuses.map((status) => ({ code: status }))
                : [{ code }],
            }));
          }}
        />
      </div>
    </div>
  );
}
