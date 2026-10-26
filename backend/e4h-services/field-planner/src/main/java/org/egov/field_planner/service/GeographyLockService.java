package org.egov.field_planner.service;

import org.apache.commons.lang3.StringUtils;
import org.egov.field_planner.repository.GeographyLockRepository;
import org.egov.field_planner.repository.GeographyLockRepository.PlanGeography;
import org.egov.field_planner.web.models.GeographyLock;
import org.egov.field_planner.web.models.GeographyLockRequest;
import org.egov.tracer.model.CustomException;
import org.springframework.stereotype.Service;

import java.util.Collection;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * The single definition of which geography codes cannot be removed.
 *
 * - Project: every code (state, district or block) of every non-deleted plan of the project,
 *   whatever the plan's status.
 * - Plan: every code of the plan's own geography that has a scoped end-user site under it.
 *
 * Both sets are closed upward -- a locked block's district and state are locked too -- because a
 * plan's geography lists every level, and a site under a block is also under its district and
 * state. Served to the UI by {@code /geography/_locks} and enforced on save by the field-plan
 * update here and by the project service's update, so the rule lives in one place.
 *
 * A plan's sectors lock the same way: a sector with a scoped site in it cannot be removed. A site's
 * sector is its facility_type, matched trimmed and case-insensitively, as ingestion-service does
 * when it offers sites for a plan's sectors.
 */
@Service
public class GeographyLockService {

    private static final List<String> LEVELS = List.of("states", "districts", "blocks");
    /** installation-ui still writes a single state as a bare string. */
    private static final String LEGACY_STATE = "state";

    private final GeographyLockRepository repository;

    public GeographyLockService(GeographyLockRepository repository) {
        this.repository = repository;
    }

    public List<GeographyLock> search(GeographyLockRequest request) {
        boolean byProject = StringUtils.isNotBlank(request.getProjectId());
        boolean byPlan = StringUtils.isNotBlank(request.getFieldPlanId());
        if (byProject == byPlan) {
            throw new CustomException("GEOGRAPHY_LOCK_TARGET", "Send exactly one of projectId or fieldPlanId");
        }
        if (byProject) {
            return projectLocks(request.getProjectId());
        }
        PlanGeography plan = repository.findPlan(request.getFieldPlanId())
                .orElseThrow(() -> new CustomException("FIELDPLAN_NOT_FOUND",
                        "Field plan " + request.getFieldPlanId() + " does not exist"));
        return planLocks(plan);
    }

    /** The plan's sectors that cannot be removed; none for a project target. */
    public List<GeographyLock> searchSectorLocks(GeographyLockRequest request) {
        if (StringUtils.isBlank(request.getFieldPlanId())) {
            return List.of();
        }
        return repository.findPlan(request.getFieldPlanId()).map(this::planSectorLocks).orElse(List.of());
    }

    public List<GeographyLock> projectLocks(String projectId) {
        Map<String, GeographyLock> locks = new LinkedHashMap<>();
        for (PlanGeography plan : repository.findProjectPlans(projectId)) {
            for (String code : geographyCodes(plan.geography())) {
                lockFor(locks, code).getUsedBy().add(usage(plan, null));
            }
        }
        return List.copyOf(locks.values());
    }

    public List<GeographyLock> planLocks(PlanGeography plan) {
        List<String> siteBoundaries = repository.findScopedSiteBoundaries(plan.id());
        Map<String, GeographyLock> locks = new LinkedHashMap<>();
        for (String code : geographyCodes(plan.geography())) {
            int siteCount = (int) siteBoundaries.stream().filter(boundary -> isUnder(boundary, code)).count();
            if (siteCount > 0) {
                lockFor(locks, code).getUsedBy().add(usage(plan, siteCount));
            }
        }
        return List.copyOf(locks.values());
    }

    public List<GeographyLock> planSectorLocks(PlanGeography plan) {
        List<String> siteSectors = repository.findScopedSiteSectors(plan.id()).stream()
                .map(GeographyLockService::sectorKey)
                .toList();
        Map<String, GeographyLock> locks = new LinkedHashMap<>();
        for (String sector : plan.sectors() == null ? List.<String>of() : plan.sectors()) {
            int siteCount = (int) siteSectors.stream().filter(sectorKey(sector)::equals).count();
            if (siteCount > 0) {
                lockFor(locks, sector).getUsedBy().add(usage(plan, siteCount));
            }
        }
        return List.copyOf(locks.values());
    }

    /** How two sector names are compared: trimmed and case-insensitive. */
    public static String sectorKey(String sector) {
        return sector == null ? "" : sector.trim().toLowerCase(Locale.ROOT);
    }

    /** The locks a removal would break: those whose code is among {@code removedCodes}. */
    public static List<GeographyLock> blocking(Collection<GeographyLock> locks, Set<String> removedCodes) {
        return locks.stream().filter(lock -> removedCodes.contains(lock.getCode())).collect(Collectors.toList());
    }

    /** "CODE_A (Plan 1, Plan 2), CODE_B (Plan 3)" -- for error messages. */
    public static String describe(Collection<GeographyLock> locks) {
        return locks.stream()
                .map(lock -> lock.getCode() + " (" + lock.getUsedBy().stream()
                        .map(u -> StringUtils.defaultIfBlank(u.getFieldPlanName(), u.getFieldPlanId())
                                + (u.getSiteCount() == null ? "" : ": " + u.getSiteCount() + " site(s)"))
                        .collect(Collectors.joining(", ")) + ")")
                .collect(Collectors.joining(", "));
    }

    /**
     * Every code at every level of a geography. Entries may be bare codes (field-planner's own
     * shape) or {@code {code, ...}} objects (the project's shape), so both are read.
     */
    public static Set<String> geographyCodes(Object geographyDetails) {
        Set<String> codes = new LinkedHashSet<>();
        if (!(geographyDetails instanceof Map<?, ?> geography)) {
            return codes;
        }
        for (String level : LEVELS) {
            if (geography.get(level) instanceof Collection<?> entries) {
                entries.forEach(entry -> addCode(codes, entry));
            }
        }
        addCode(codes, geography.get(LEGACY_STATE));
        return codes;
    }

    /**
     * Boundary codes are built hierarchically, so a code sits under an ancestor when it equals it
     * or extends it past a "_" (a facility's own code is "{blockCode}_{facilityId}"). Mirrors
     * ingestion-service's is_under_any_boundary.
     */
    public static boolean isUnder(String code, String ancestor) {
        return code != null && ancestor != null && (code.equals(ancestor) || code.startsWith(ancestor + "_"));
    }

    private static void addCode(Set<String> codes, Object entry) {
        Object code = entry instanceof Map<?, ?> map ? map.get("code") : entry;
        if (code instanceof String value && StringUtils.isNotBlank(value)) {
            codes.add(value.trim());
        }
    }

    private static GeographyLock lockFor(Map<String, GeographyLock> locks, String code) {
        return locks.computeIfAbsent(code, c -> GeographyLock.builder().code(c).build());
    }

    private static GeographyLock.Usage usage(PlanGeography plan, Integer siteCount) {
        return GeographyLock.Usage.builder()
                .fieldPlanId(plan.id())
                .fieldPlanName(plan.name())
                .siteCount(siteCount)
                .build();
    }
}
