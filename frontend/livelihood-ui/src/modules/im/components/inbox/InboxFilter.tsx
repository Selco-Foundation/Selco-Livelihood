import {
  aggregateBoundaryCodes,
  hasRole,
  isNonHcrUser,
  isTechPocUser,
  useAuthStore,
  useBoundary,
  useFacility,
  useJurisdictionStore,
  useTranslate,
} from "@/shared";
import { Button, Card, CardContent, Label } from "@/ui";
import { useEffect, useMemo, useState } from "react";
import type { ImInboxFilters, InboxDataResult } from "../../types/inbox";
import { buildFilterQueryFromState } from "../../utils/inbox-filters";
import { buildDefaultInboxRoleFilters } from "../../hooks/inbox-defaults";
import { useImComplaintTypes, useImMdms } from "../../hooks/use-im-inbox-summary";
import { InboxStatus } from "./InboxStatus";

interface FilterOption {
  code: string;
  name: string;
  key?: string;
  parentCode?: string;
  blockCode?: string;
}

interface InboxFilterProps {
  complaints?: InboxDataResult;
  searchParams: { filters?: ImInboxFilters };
  onFilterChange: (filters: ImInboxFilters) => void;
}

export function InboxFilter({
  complaints,
  searchParams,
  onFilterChange,
}: InboxFilterProps) {
  const { t } = useTranslate();
  const user = useAuthStore((state) => state.user);
  const userName = user?.userName ?? "";
  const roles = user?.roles;
  const currentBoundary = useJurisdictionStore((state) => state.currentBoundary);
  const jurisdictionCodes = aggregateBoundaryCodes(currentBoundary);

  const assignedToOptions = useMemo(
    () => [
      { code: "ASSIGNED_TO_ME", name: t("ASSIGNED_TO_ME") },
      { code: "ASSIGNED_TO_ALL", name: t("ASSIGNED_TO_ALL") },
    ],
    [t],
  );

  const defaultFilters = buildDefaultInboxRoleFilters(user);
  const isResolver = hasRole(roles, "COMPLAINT_RESOLVER");
  const techPoc = isTechPocUser(roles);

  const [selectAssigned, setSelectAssigned] = useState(
    searchParams.filters?.wfFilters?.assignee?.[0]?.code === userName
      ? assignedToOptions[0]
      : assignedToOptions[1],
  );

  const emptyPgrFilters = {
    incidentType: [] as Array<{ code: string; name?: string; key?: string }>,
    facility: [] as Array<{ code: string; name?: string }>,
    state: [] as Array<{ code: string; name?: string }>,
    district: [] as Array<{ code: string; name?: string }>,
    block: [] as Array<{ code: string; name?: string }>,
    isSystemFunctional: [] as Array<{ code: string; name?: string }>,
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
  const [systemFunctionalityMenu, setSystemFunctionalityMenu] = useState<FilterOption[]>([]);

  const { data: boundaryData } = useBoundary(jurisdictionCodes);
  const { data: facilityData } = useFacility(facilityBoundaryCodes);
  const { data: mdmsData } = useImMdms();
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
            name: t(`Boundary_${state.code}`),
          });
        }
      }
      setStateMenu(
        [...unique.values()].sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  }, [boundaryData, t]);

  useEffect(() => {
    const selectedState = pgrfilters.state?.[0];
    if (selectedState && boundaryData?.districts) {
      setDistrictMenu(
        boundaryData.districts
          .filter((district) => district.parentCode === selectedState.code)
          .map((district) => ({
            code: district.code,
            name: t(`Boundary_${district.code}`),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  }, [pgrfilters.state, boundaryData, t]);

  useEffect(() => {
    const selectedDistrict = pgrfilters.district?.[0];
    if (selectedDistrict && boundaryData?.blocks) {
      setBlockMenu(
        boundaryData.blocks
          .filter((block) => block.parentCode === selectedDistrict.code)
          .map((block) => ({
            code: block.code,
            name: t(`Boundary_${block.code}`),
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  }, [pgrfilters.district, boundaryData, t]);

  useEffect(() => {
    const selectedBlock = pgrfilters.block?.[0];
    if (selectedBlock) {
      setFacilityMenu(
        facilityOptions
          .filter((facility) => facility.parentCode === selectedBlock.code)
          .map((facility) => ({
            code: facility.code,
            name: t(`Boundary_${facility.code}`),
            blockCode: facility.parentCode,
          }))
          .sort((a, b) => a.name.localeCompare(b.name)),
      );
    }
  }, [pgrfilters.block, facilityOptions, t]);

  useEffect(() => {
    if (mdmsData?.length) {
      setSystemFunctionalityMenu(
        mdmsData
          .filter((item) => item.active !== false)
          .sort((a, b) => a.name.localeCompare(b.name))
          .map((item) => ({
            code: item.code,
            name: t(item.name),
          })),
      );
    }
  }, [mdmsData, t]);

  useEffect(() => {
    const code = selectAssigned.code === "ASSIGNED_TO_ME" ? userName : "";
    setWfFilters((prev) => ({
      ...prev,
      assignee: [{ code }],
      ...(techPoc &&
        (code
          ? {
              wfStatus: [
                { code: "RMS_DEVICE_PENDING_TECH_POC" },
                { code: "OUT_OF_WARRANTY_PENDING_TECH_POC" },
                { code: "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2" },
              ],
            }
          : { wfStatus: [] })),
    }));
  }, [selectAssigned, techPoc, userName]);

  useEffect(() => {
    const { pgrQuery, wfQuery } = buildFilterQueryFromState({ pgrfilters, wfFilters });
    onFilterChange({ pgrQuery, wfQuery, wfFilters, pgrfilters });
  }, [pgrfilters, wfFilters]); // eslint-disable-line react-hooks/exhaustive-deps

  const clearAll = () => {
    const resetPgr = { ...emptyPgrFilters };
    const resetWf = isResolver
      ? { assignee: [{ code: userName }] }
      : techPoc
        ? {
            assignee: [{ code: userName }],
            wfStatus: [
              { code: "RMS_DEVICE_PENDING_TECH_POC" },
              { code: "OUT_OF_WARRANTY_PENDING_TECH_POC" },
              { code: "OUT_OF_WARRANTY_PENDING_TECH_POC_ROUND_2" },
            ],
          }
        : { assignee: [{ code: "" }] };

    setDistrictMenu([]);
    setBlockMenu([]);
    setFacilityMenu([]);
    setPgrFilters(resetPgr);
    setWfFilters(resetWf);
    setSelectAssigned(isResolver || techPoc ? assignedToOptions[0] : assignedToOptions[1]);
  };

  const handleAssignmentChange = (
    checked: boolean,
    type: { statuses: readonly string[] | string[] },
  ) => {
    if (checked) {
      setPgrFilters((prev) => ({
        ...prev,
        applicationStatus: [
          ...prev.applicationStatus,
          ...type.statuses.map((status) => ({ code: status })),
        ],
      }));
      return;
    }

    setPgrFilters((prev) => ({
      ...prev,
      applicationStatus: prev.applicationStatus.filter(
        (value) => !type.statuses.includes(value.code),
      ),
    }));
  };

  const renderSelect = (
    label: string,
    options: FilterOption[],
    onSelect: (value: FilterOption) => void,
    key: keyof typeof emptyPgrFilters,
  ) => (
    <div className="space-y-1">
      <Label>{label}</Label>
      <select
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
        defaultValue=""
        onChange={(event) => {
          const selected = options.find((option) => option.code === event.target.value);
          if (selected) {
            onSelect(selected);
          }
        }}
      >
        <option value="" disabled>
          {t("ES_COMMON_SELECT")}
        </option>
        {options.map((option) => (
          <option key={option.code} value={option.code}>
            {option.name}
          </option>
        ))}
      </select>
      {pgrfilters[key].length > 0 ? (
        <div className="flex flex-wrap gap-1">
          {pgrfilters[key].map((value, index) => (
            <button
              key={`${value.code}-${index}`}
              type="button"
              className="rounded border px-2 py-0.5 text-xs"
              onClick={() => {
                if (key === "state") {
                  setDistrictMenu([]);
                  setBlockMenu([]);
                  setFacilityMenu([]);
                  setPgrFilters({
                    ...pgrfilters,
                    state: [],
                    district: [],
                    block: [],
                    facility: [],
                  });
                } else if (key === "district") {
                  setBlockMenu([]);
                  setFacilityMenu([]);
                  setPgrFilters({ ...pgrfilters, district: [], block: [], facility: [] });
                } else if (key === "block") {
                  setFacilityMenu([]);
                  setPgrFilters({ ...pgrfilters, block: [], facility: [] });
                } else {
                  setPgrFilters({
                    ...pgrfilters,
                    [key]: pgrfilters[key].filter((_, itemIndex) => itemIndex !== index),
                  });
                }
              }}
            >
              {("name" in value && value.name) ? value.name : value.code} ×
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );

  return (
    <Card className="w-full max-w-[270px]">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <Label>{t("ES_COMMON_FILTER_BY")}:</Label>
          <button
            type="button"
            onClick={clearAll}
            className="text-xs text-[#7a2829] hover:underline"
          >
            {t("ES_COMMON_CLEAR_ALL")}
          </button>
        </div>

        <div className="space-y-2">
          <Label>{t("ASSIGNED_TO_ME")}</Label>
          {assignedToOptions.map((option) => (
            <label key={option.code} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="assignedTo"
                checked={selectAssigned.code === option.code}
                onChange={() => setSelectAssigned(option)}
              />
              <span>{option.name}</span>
            </label>
          ))}
        </div>

        {renderSelect(t("CS_COMPLAINT_DETAILS_TICKET_TYPE"), sortedMenu, (value) => {
          setPgrFilters((prev) => {
            if (prev.incidentType.some((item) => item.code === value.code)) {
              return prev;
            }
            return {
              ...prev,
              incidentType: [
                ...prev.incidentType,
                { code: value.key ?? value.code, name: value.name },
              ],
            };
          });
        }, "incidentType")}

        {isNonHcrUser(roles) ? (
          <>
            {renderSelect(t("CS_STATE"), stateMenu, (value) => {
              setPgrFilters({
                ...pgrfilters,
                state: [value],
                district: [],
                block: [],
                facility: [],
              });
            }, "state")}
            {renderSelect(t("CS_DISTRICT"), districtMenu, (value) => {
              setPgrFilters({
                ...pgrfilters,
                district: [value],
                block: [],
                facility: [],
              });
            }, "district")}
            {renderSelect(t("CS_BLOCK"), blockMenu, (value) => {
              setPgrFilters({ ...pgrfilters, block: [value], facility: [] });
            }, "block")}
            {renderSelect(t("CS_HEALTH_CARE"), facilityMenu, (value) => {
              setPgrFilters((prev) => {
                if (prev.facility.some((item) => item.code === value.code)) {
                  return prev;
                }
                return {
                  ...prev,
                  facility: [...prev.facility, value],
                };
              });
            }, "facility")}
          </>
        ) : null}

        {renderSelect(t("CS_SYSTEM_FUNCTIONAL"), systemFunctionalityMenu, (value) => {
          setPgrFilters({ ...pgrfilters, isSystemFunctional: [value] });
        }, "isSystemFunctional")}

        <InboxStatus
          statusMap={complaints?.statusArray}
          selectedStatuses={pgrfilters.applicationStatus}
          onAssignmentChange={handleAssignmentChange}
        />

        <Button type="button" variant="outline" className="w-full" onClick={clearAll}>
          {t("ES_COMMON_CLEAR_ALL")}
        </Button>
      </CardContent>
    </Card>
  );
}
