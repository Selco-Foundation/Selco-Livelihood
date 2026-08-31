package org.egov.activity.service;

import lombok.extern.slf4j.Slf4j;
import org.egov.activity.config.ActivityConfiguration;
import org.egov.activity.repository.VendorAssignmentRepository;
import org.egov.activity.util.VendorDirectory;
import static org.egov.activity.util.ActivityConstants.INSTALLATION_REPORT_APPROVER_QC_TEAM;
import org.egov.activity.web.models.OrgUserEnriched;
import org.egov.activity.web.models.VendorAssignmentAsset;
import org.egov.activity.web.models.VendorAssignmentCreateResponse;
import org.egov.activity.web.models.VendorAssignmentCriteria;
import org.egov.activity.web.models.VendorAssignmentError;
import org.egov.activity.web.models.VendorAssignmentRequest;
import org.egov.activity.web.models.VendorAssignmentSearchResponse;
import org.egov.activity.web.models.VendorAssignmentSite;
import org.egov.activity.web.models.VendorAssignmentSubmission;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.producer.Producer;
import org.egov.common.service.IdGenService;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Vendor Assignment (FR-07) — the step that turns a planned Installation Plan into dispatched work.
 *
 * A site's Solution expands into one SOLAR asset for the whole solar section plus one MACHINE
 * asset per machine, the machine count coming from the IC Report template filled in the previous
 * step. Each asset gets its own vendor, its own facility_activities row (and so its own
 * FACILITY_INSTALLATION review instance) and its own bom row seeded from the template.
 *
 * Submit is the handover: it also flips the plan to SCHEDULED, which is what bars these sites
 * from other plans in the same project. There is no separate Publish step, and assignment is
 * one-shot -- so the write is published as a single atomic persister mapping, since a
 * half-dispatched plan could not be recovered.
 */
@Service
@Slf4j
public class VendorAssignmentService {

    public static final String COMPONENT_SOLAR = "SOLAR";
    public static final String COMPONENT_MACHINE = "MACHINE";

    private static final String ACTIVITY_CODE_INSTALLATION = "INS";

    private static final String PLAN_STATUS_DRAFT = "DRAFT";
    /** field_plans has no PUBLISHED value; SCHEDULED is this codebase's published equivalent. */
    private static final String PLAN_STATUS_PUBLISHED = "SCHEDULED";
    /** A dispatched asset awaiting installation. Matches facility_activities' own DDL default. */
    private static final String ASSET_STATUS_SCHEDULED = "SCHEDULED";

    private static final String SOLAR_ASSET_NAME = "Solar";
    private static final String KEY_MACHINE_SECTION = "machineSection";
    private static final String KEY_SOLAR_SECTION = "solarSection";
    private static final String KEY_COMPONENTS = "components";

    /** How long create() will wait for the published rows to appear before saying so. ~3s. */
    private static final int PERSIST_WAIT_ATTEMPTS = 20;
    private static final long PERSIST_WAIT_INTERVAL_MS = 150L;

    private final VendorAssignmentRepository repository;
    private final Producer producer;
    private final IdGenService idGenService;
    private final ActivityConfiguration configuration;
    private final VendorDirectory vendorDirectory;

    @Autowired
    public VendorAssignmentService(VendorAssignmentRepository repository,
                                   Producer producer,
                                   IdGenService idGenService,
                                   ActivityConfiguration configuration,
                                   VendorDirectory vendorDirectory) {
        this.repository = repository;
        this.producer = producer;
        this.idGenService = idGenService;
        this.configuration = configuration;
        this.vendorDirectory = vendorDirectory;
    }

    // ------------------------------------------------------------------ read

    /**
     * The grid. Derives the asset list rather than materialising it, so a Project Manager who
     * opens the screen and walks away leaves nothing behind. Once the plan is published the
     * stored rows are returned instead, so it renders read-only with the assignments visible.
     */
    public VendorAssignmentSearchResponse search(VendorAssignmentCriteria criteria) {
        Map<String, Object> plan = requirePlan(criteria);
        String planStatus = asString(plan.get("status"));
        boolean published = PLAN_STATUS_PUBLISHED.equals(planStatus);

        List<VendorAssignmentSite> sites = published
                ? readStoredAssets(criteria)
                : deriveSites(criteria, plan);

        int totalAssets = sites.stream()
                .mapToInt(site -> site.getAssets() == null ? 0 : site.getAssets().size())
                .sum();

        return VendorAssignmentSearchResponse.builder()
                .sites(sites)
                .totalAssets(totalAssets)
                .assignable(!published)
                .planStatus(planStatus)
                .build();
    }

    /**
     * sites x their Solution's machine count. The one place the asset model is expressed:
     * one SOLAR asset always, plus one MACHINE asset per entry in the template's machineSection.
     * A Solution with no machines yields a single solar asset, which is correct -- Textile
     * Lighting has no machine at all.
     */
    private List<VendorAssignmentSite> deriveSites(VendorAssignmentCriteria criteria,
                                                   Map<String, Object> plan) {
        List<Map<String, Object>> scopeRows =
                repository.findScope(criteria.getTenantId(), criteria.getFieldPlanId());
        Map<String, Map<String, Object>> templates =
                repository.findTemplates(criteria.getTenantId(), criteria.getFieldPlanId());

        List<VendorAssignmentSite> sites = new ArrayList<>();
        for (Map<String, Object> row : scopeRows) {
            String facilityId = asString(row.get("facility_id"));
            String solutionId = asString(row.get("solution_id"));

            List<Map<String, Object>> machines = repository.readSection(
                    templates.get(solutionId), KEY_MACHINE_SECTION);

            List<VendorAssignmentAsset> assets = new ArrayList<>();
            assets.add(VendorAssignmentAsset.builder()
                    .componentType(COMPONENT_SOLAR)
                    .componentSequence(1)
                    .assetName(SOLAR_ASSET_NAME)
                    .build());
            for (int i = 0; i < machines.size(); i++) {
                assets.add(VendorAssignmentAsset.builder()
                        .componentType(COMPONENT_MACHINE)
                        .componentSequence(i + 1)
                        .assetName(machineName(machines.get(i), i + 1))
                        .build());
            }

            sites.add(VendorAssignmentSite.builder()
                    .facilityId(facilityId)
                    .siteName(asString(row.get("facility_name")))
                    // solutionName is left for the caller to resolve: the screen already holds the
                    // Installation.Solution code-to-name map it built for the Scope step's
                    // dropdown, so fetching it again here would be a redundant MDMS round trip.
                    .solutionId(solutionId)
                    .assets(assets)
                    .build());
        }
        return sites;
    }

    private List<VendorAssignmentSite> readStoredAssets(VendorAssignmentCriteria criteria) {
        List<Map<String, Object>> rows =
                repository.findExistingAssets(criteria.getTenantId(), criteria.getFieldPlanId());
        Map<String, VendorAssignmentSite> byFacility = new LinkedHashMap<>();

        for (Map<String, Object> row : rows) {
            String facilityId = asString(row.get("facility_id"));
            VendorAssignmentSite site = byFacility.computeIfAbsent(facilityId, id ->
                    VendorAssignmentSite.builder()
                            .facilityId(id)
                            .siteName(asString(row.get("facility_name")))
                            .solutionId(asString(row.get("solution_id")))
                            .assets(new ArrayList<>())
                            .build());

            Map<String, Object> details = repository.readJson(
                    row.get("additional_details") == null ? null : String.valueOf(row.get("additional_details")));
            site.getAssets().add(VendorAssignmentAsset.builder()
                    .componentType(asString(row.get("component_type")))
                    .componentSequence(row.get("component_sequence") == null
                            ? null : ((Number) row.get("component_sequence")).intValue())
                    .assetName(asString(details.get("assetName")))
                    .vendorOrgId(asString(row.get("vendor_org_id")))
                    .vendorOrgName(asString(details.get("vendorOrgName")))
                    .vendorUserId(asString(row.get("assign_user")))
                    .vendorUserName(asString(details.get("vendorUserName")))
                    .vendorEmail(asString(row.get("vendor_email")))
                    .vendorPhone(asString(row.get("vendor_phone")))
                    .reportNumber(asString(row.get("report_number")))
                    .build());
        }
        return new ArrayList<>(byFacility.values());
    }

    // -------------------------------------------------------------- validate

    /**
     * Every check the submit depends on, returned per asset so the grid can highlight the
     * offending rows. Writes nothing, and is re-run inside create -- validate being a separate
     * call is a convenience for the UI, not a trust boundary
     */
    public List<VendorAssignmentError> validate(VendorAssignmentRequest request) {
        return check(request).errors;
    }

    /**
     * validate's actual body, which also hands back the vendors it resolved from vendor-registry
     * so create does not have to look them up a second time.
     */
    private ValidationOutcome check(VendorAssignmentRequest request) {
        VendorAssignmentCriteria criteria = request.getCriteria();
        List<VendorAssignmentError> errors = new ArrayList<>();

        Map<String, Object> plan = requirePlan(criteria);
        String planStatus = asString(plan.get("status"));
        if (!PLAN_STATUS_DRAFT.equals(planStatus)) {
            // One-shot: once published there is no path back to editable.
            errors.add(planError("PLAN_ALREADY_PUBLISHED",
                    "This installation plan has already been submitted (status " + planStatus
                            + "), so its vendor assignments can no longer be changed."));
            return ValidationOutcome.failed(errors);
        }

        Map<String, String> scope = solutionByFacility(
                repository.findScope(criteria.getTenantId(), criteria.getFieldPlanId()));
        if (scope.isEmpty()) {
            errors.add(planError("SCOPE_EMPTY",
                    "This installation plan has no end user sites. Complete the Installation Scope step first."));
            return ValidationOutcome.failed(errors);
        }

        Map<String, Map<String, Object>> templates =
                repository.findTemplates(criteria.getTenantId(), criteria.getFieldPlanId());

        // Every Solution in scope needs a template: without one the machine count is unknown, so
        // the asset list itself would be wrong rather than merely incomplete.
        Set<String> solutionsWithoutTemplate = new LinkedHashSet<>();
        for (Map.Entry<String, String> entry : scope.entrySet()) {
            String solutionId = entry.getValue();
            if (!StringUtils.hasText(solutionId)) {
                errors.add(VendorAssignmentError.builder()
                        .facilityId(entry.getKey())
                        .code("SOLUTION_MISSING")
                        .message("This end user site has no Solution assigned. Fix it in the Installation Scope step.")
                        .build());
            } else if (!templates.containsKey(solutionId)) {
                solutionsWithoutTemplate.add(solutionId);
            }
        }
        for (String solutionId : solutionsWithoutTemplate) {
            errors.add(planError("TEMPLATE_MISSING",
                    "Solution " + solutionId + " has no IC Report template yet. "
                            + "Complete the Template step for it before assigning vendors."));
        }
        if (!errors.isEmpty()) {
            return ValidationOutcome.failed(errors);
        }

        // Compare what was submitted against what the plan actually implies. Catches a stale
        // screen: if a template's machine count changed after the grid loaded, the submission
        // no longer describes this plan and must not be written.
        Map<String, VendorAssignmentAsset> derived = new LinkedHashMap<>();
        for (VendorAssignmentSite site : deriveSites(criteria, plan)) {
            for (VendorAssignmentAsset asset : site.getAssets()) {
                derived.put(assetKey(site.getFacilityId(), asset.getComponentType(), asset.getComponentSequence()),
                        asset);
            }
        }

        Map<String, VendorAssignmentSubmission> submitted = new LinkedHashMap<>();
        for (VendorAssignmentSubmission submission : orEmpty(request.getAssignments())) {
            String key = submission.assetKey();
            if (submitted.put(key, submission) != null) {
                errors.add(assetError(submission, "DUPLICATE_ASSET",
                        "This asset appears more than once in the submission."));
            }
            if (!derived.containsKey(key)) {
                errors.add(assetError(submission, "UNKNOWN_ASSET",
                        "This asset is not part of the plan. The screen may be out of date -- reload it."));
            }
        }
        for (Map.Entry<String, VendorAssignmentAsset> entry : derived.entrySet()) {
            if (!submitted.containsKey(entry.getKey())) {
                String[] parts = entry.getKey().split("\\|", -1);
                errors.add(VendorAssignmentError.builder()
                        .facilityId(parts[0])
                        .componentType(parts[1])
                        .componentSequence(entry.getValue().getComponentSequence())
                        .code("ASSET_NOT_SUBMITTED")
                        .message("No vendor was submitted for this asset.")
                        .build());
            }
        }

        // A vendor organisation and a vendor are both required on every asset -- this is FR-09's
        // "every expanded row has a Vendor + Vendor Email".
        Set<String> organisationIds = new LinkedHashSet<>();
        for (VendorAssignmentSubmission submission : submitted.values()) {
            if (!StringUtils.hasText(submission.getVendorOrgId())
                    || !StringUtils.hasText(submission.getVendorUserId())) {
                errors.add(assetError(submission, "VENDOR_REQUIRED",
                        "Select a vendor organisation and a vendor for this asset."));
            } else {
                organisationIds.add(submission.getVendorOrgId());
            }
        }

        // The organisation/vendor pairing is resolved against vendor-registry rather than taken
        // on trust: it decides who is dispatched to a site, and assignment is one-shot. A stale
        // dropdown, a vendor removed from the organisation since the screen loaded, or a
        // hand-built payload all land here rather than in the database.
        Map<String, OrgUserEnriched> resolvedVendors = new LinkedHashMap<>();
        Map<String, OrgUserEnriched> members =
                lookupMembers(request.getRequestInfo(), criteria.getTenantId(), organisationIds);
        for (VendorAssignmentSubmission submission : submitted.values()) {
            if (!StringUtils.hasText(submission.getVendorOrgId())
                    || !StringUtils.hasText(submission.getVendorUserId())) {
                continue;
            }
            OrgUserEnriched member = members.get(
                    VendorDirectory.key(submission.getVendorOrgId(), submission.getVendorUserId()));
            if (member == null) {
                errors.add(assetError(submission, "VENDOR_MISMATCH",
                        "The selected vendor does not belong to the selected vendor organisation, "
                                + "or is no longer active in it. Reload the screen and pick again."));
            } else {
                resolvedVendors.put(submission.assetKey(), member);
            }
        }

        // A site published in a sibling plan cannot be dispatched again. Derived from the sibling
        // plan's status, the same way the Installation Scope step's bar is.
        String projectId = asString(plan.get("project_id"));
        if (StringUtils.hasText(projectId)) {
            Map<String, String> barred = repository.findSitesPublishedElsewhere(
                    criteria.getTenantId(), projectId, criteria.getFieldPlanId(), PLAN_STATUS_PUBLISHED);
            for (String facilityId : scope.keySet()) {
                if (barred.containsKey(facilityId)) {
                    errors.add(VendorAssignmentError.builder()
                            .facilityId(facilityId)
                            .code("SITE_PUBLISHED_ELSEWHERE")
                            .message("This end user site has already been added and published into "
                                    + "installation plan " + barred.get(facilityId)
                                    + ". It cannot be part of another installation plan in the same project.")
                            .build());
                }
            }
        }

        // Without a reviewer, submitted reports would have nowhere to go. The role code is
        // INSTALLATION_REPORT_APPROVER_QC_TEAM despite field-planner calling its constant
        // INSTALLATION_REVIEWER_ROLE -- the name is the screen's wording, not the stored code.
        if (repository.findAssignedUsersByRole(criteria.getTenantId(), criteria.getFieldPlanId(),
                INSTALLATION_REPORT_APPROVER_QC_TEAM).isEmpty()) {
            errors.add(planError("REVIEWER_MISSING",
                    "This installation plan has no Installation Reviewer assigned."));
        }

        if (!StringUtils.hasText(repository.findActivityIdByCode(
                criteria.getTenantId(), ACTIVITY_CODE_INSTALLATION))) {
            errors.add(planError("ACTIVITY_MISSING",
                    "No active activity with code " + ACTIVITY_CODE_INSTALLATION + " exists for this tenant."));
        }

        return new ValidationOutcome(errors, resolvedVendors);
    }

    /**
     * A vendor-registry outage is not an invalid submission, so it is not reported as one: it
     * fails the call outright rather than telling the Project Manager their vendors are wrong.
     */
    private Map<String, OrgUserEnriched> lookupMembers(RequestInfo requestInfo, String tenantId,
                                                       Set<String> organisationIds) {
        if (organisationIds.isEmpty()) {
            return Map.of();
        }
        try {
            return vendorDirectory.membersOf(requestInfo, tenantId, organisationIds);
        } catch (Exception e) {
            throw new CustomException("VENDOR_LOOKUP_FAILED",
                    "Could not confirm the selected vendors against the vendor registry: " + e.getMessage());
        }
    }

    /** validate's two results: what is wrong, and the vendors it confirmed along the way. */
    private static final class ValidationOutcome {
        private final List<VendorAssignmentError> errors;
        private final Map<String, OrgUserEnriched> vendorsByAsset;

        private ValidationOutcome(List<VendorAssignmentError> errors,
                                  Map<String, OrgUserEnriched> vendorsByAsset) {
            this.errors = errors;
            this.vendorsByAsset = vendorsByAsset;
        }

        private static ValidationOutcome failed(List<VendorAssignmentError> errors) {
            return new ValidationOutcome(errors, Map.of());
        }
    }

    // ---------------------------------------------------------------- create

    /**
     * The handover.
     *
     * All-or-nothing still matters more here than anywhere else in this feature -- assignment is
     * one-shot, so a plan that dispatched half its assets could not be finished by re-running --
     * but the atomicity now lives in the persister rather than here: one topic, one mapping,
     * four queryMaps, isTransaction: true. There is no local transaction left to annotate.
     *
     * Two things compensate for what publishing costs us. Every id is derived from its row's
     * natural key, so a replayed or duplicated message rewrites the same rows instead of
     * dispatching twice -- that replaces the guarded `UPDATE ... WHERE status = 'DRAFT'` this
     * method used to depend on, which the persister cannot express because it cannot assert a row
     * count. And awaitPersistence blocks until the rows are visible, so the Project Manager is
     * not told a one-shot submission succeeded when it may not have.
     */
    public VendorAssignmentCreateResponse create(VendorAssignmentRequest request) {
        VendorAssignmentCriteria criteria = request.getCriteria();
        RequestInfo requestInfo = request.getRequestInfo();

        ValidationOutcome outcome = check(request);
        if (!outcome.errors.isEmpty()) {
            throw new CustomException("VENDOR_ASSIGNMENT_INVALID", summarise(outcome.errors));
        }

        Map<String, Object> plan = requirePlan(criteria);
        String activityId = repository.findActivityIdByCode(criteria.getTenantId(), ACTIVITY_CODE_INSTALLATION);
        List<String> reviewers = repository.findAssignedUsersByRole(
                criteria.getTenantId(), criteria.getFieldPlanId(), INSTALLATION_REPORT_APPROVER_QC_TEAM);
        Map<String, Map<String, Object>> templates =
                repository.findTemplates(criteria.getTenantId(), criteria.getFieldPlanId());
        Map<String, String> scope = solutionByFacility(
                repository.findScope(criteria.getTenantId(), criteria.getFieldPlanId()));
        Long scheduledAt = plan.get("start_date") == null
                ? null : ((Number) plan.get("start_date")).longValue();
        Long now = System.currentTimeMillis();
        String userUuid = requestInfo != null && requestInfo.getUserInfo() != null
                ? requestInfo.getUserInfo().getUuid() : null;

        List<VendorAssignmentSubmission> assignments = orEmpty(request.getAssignments());

        // Still synchronous, and deliberately so: a failure to mint Report Numbers must reach the
        // Project Manager, not vanish into a persister log. One call for the whole plan.
        List<String> reportNumbers = generateReportNumbers(requestInfo, criteria.getTenantId(),
                assignments.size());

        List<Map<String, Object>> assetRows = new ArrayList<>();
        List<Map<String, Object>> bomRows = new ArrayList<>();
        List<Map<String, Object>> linkRows = new ArrayList<>();
        Set<String> vendorOrgs = new LinkedHashSet<>();
        int index = 0;

        for (VendorAssignmentSubmission submission : assignments) {
            applyConfirmedVendor(submission, outcome.vendorsByAsset.get(submission.assetKey()));

            String solutionId = scope.get(submission.getFacilityId());
            Map<String, Object> templateData = templates.get(solutionId);

            String activityFacilityId = assetId(criteria, submission);
            String assetName = assetNameFor(submission, templateData);

            assetRows.add(assetRow(criteria, submission, activityFacilityId, activityId,
                    solutionId, scheduledAt, now));
            bomRows.add(bomRow(criteria, submission, activityFacilityId, solutionId, assetName,
                    reportNumbers.get(index), seedBomData(submission, templateData),
                    displayNameCache(submission, assetName), now));

            // How the task becomes visible: one link row per person per asset, for the assigned
            // vendor and for every Installation Reviewer on the plan.
            linkRows.add(linkRow(criteria, activityFacilityId, submission.getVendorUserId(), userUuid, now));
            for (String reviewer : reviewers) {
                linkRows.add(linkRow(criteria, activityFacilityId, reviewer, userUuid, now));
            }

            vendorOrgs.add(submission.getVendorOrgId());
            index++;
        }

        // One message, one persister mapping, one database transaction. Every query in that
        // mapping is an upsert keyed on a natural key, so a replay or a duplicate submit rewrites
        // the same rows rather than dispatching twice -- which is what replaces the guarded
        // `UPDATE ... WHERE status = 'DRAFT'` this method used to rely on. See
        // egov-persister/activity-persister.yml, mapping save-vendor-assignment.
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("RequestInfo", requestInfo);
        payload.put("ActivitiesFacilities", assetRows);
        payload.put("bom", bomRows);
        payload.put("ActivityFacilityUsers", linkRows);
        payload.put("FieldPlan", List.of(planHandoverRow(criteria, userUuid, now)));

        producer.push(configuration.getSaveVendorAssignmentTopic(), payload);
        log.info("published vendor assignment: plan={} sites={} assets={} links={} vendorOrgs={} topic={}",
                criteria.getFieldPlanId(), scope.size(), assetRows.size(), linkRows.size(),
                vendorOrgs.size(), configuration.getSaveVendorAssignmentTopic());

        awaitPersistence(criteria, assetRows.size());

        return VendorAssignmentCreateResponse.builder()
                .fieldPlanId(criteria.getFieldPlanId())
                .planStatus(PLAN_STATUS_PUBLISHED)
                .siteCount(scope.size())
                .assetCount(assignments.size())
                .vendorOrganisations(new ArrayList<>(vendorOrgs))
                .message("Vendor assignments saved and handed over to the installation staff.")
                .build();
    }

    /**
     * Blocks briefly until the published rows are actually in the database, so the Project
     * Manager is told the truth about a submission they cannot repeat.
     *
     * The write is asynchronous now, so without this the API would return 200 the instant the
     * message was queued -- and a persister failure would leave a plan that looks dispatched and
     * is not, with no retry affordance because the UI already said it worked.
     */
    private void awaitPersistence(VendorAssignmentCriteria criteria, int expectedAssets) {
        for (int attempt = 1; attempt <= PERSIST_WAIT_ATTEMPTS; attempt++) {
            int stored = repository.findExistingAssets(criteria.getTenantId(), criteria.getFieldPlanId()).size();
            // Both conditions, not just the row count: the asset rows are queries 1-3 of the
            // mapping and the status flip is query 4, and query 4 is the actual handover. A check
            // that passed on row count alone would report success for a plan whose sites were
            // dispatched but which never left DRAFT -- so the technician sees work the Project
            // Manager's screen still calls editable.
            Map<String, Object> plan = repository.findPlan(criteria.getTenantId(), criteria.getFieldPlanId());
            boolean handedOver = plan != null && PLAN_STATUS_PUBLISHED.equals(asString(plan.get("status")));
            if (stored >= expectedAssets && handedOver) {
                log.info("vendor assignment persisted for plan={} after {} attempt(s)",
                        criteria.getFieldPlanId(), attempt);
                return;
            }
            try {
                Thread.sleep(PERSIST_WAIT_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }
        // Not "failed" -- we genuinely do not know that it failed, and saying so would invite a
        // resubmit of a one-shot action. Deterministic ids make a resubmit harmless if the PM
        // does try, but the honest message is that it is still being applied.
        throw new CustomException("VENDOR_ASSIGNMENT_PENDING",
                "Your vendor assignments were submitted but have not finished saving yet. "
                        + "Reload this installation plan in a moment to confirm -- do not assume "
                        + "the submission was lost.");
    }

    /**
     * Ids derived from the row's natural key rather than randomly generated, so the whole
     * message is idempotent by construction.
     *
     * This is not a stylistic choice. The bom row has to carry its asset's activity_facility_id,
     * and with the write asynchronous there is no longer any way to read back the id an upsert
     * settled on. A random id would therefore produce an orphan bom row every time the asset row
     * already existed: the upsert would keep the original row's id while the bom pointed at the
     * new one. Deriving both from the same natural key makes that impossible.
     *
     * nameUUIDFromBytes is a type-3 (MD5) UUID -- not for anything security-sensitive, but stable
     * across processes and JVM versions, which is exactly the property needed here.
     */
    private String assetId(VendorAssignmentCriteria criteria, VendorAssignmentSubmission submission) {
        return deterministicId("facility-activity", criteria.getTenantId(), criteria.getFieldPlanId(),
                submission.getFacilityId(), submission.getComponentType(),
                String.valueOf(submission.getComponentSequence()));
    }

    private static String deterministicId(String... parts) {
        return UUID.nameUUIDFromBytes(String.join("|", parts).getBytes(StandardCharsets.UTF_8)).toString();
    }

    private Map<String, Object> assetRow(VendorAssignmentCriteria criteria,
                                         VendorAssignmentSubmission submission,
                                         String activityFacilityId, String activityId,
                                         String solutionId, Long scheduledAt, Long now) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", activityFacilityId);
        row.put("tenantId", criteria.getTenantId());
        row.put("fieldPlanId", criteria.getFieldPlanId());
        row.put("activityId", activityId);
        row.put("facilityId", submission.getFacilityId());
        row.put("status", ASSET_STATUS_SCHEDULED);
        row.put("assignedUser", submission.getVendorUserId());
        row.put("scheduledAt", scheduledAt);
        row.put("activatedAt", scheduledAt);
        row.put("componentType", submission.getComponentType());
        row.put("componentSequence", submission.getComponentSequence());
        row.put("solutionId", solutionId);
        row.put("auditDetails", auditMap(null, now, now));
        return row;
    }

    private Map<String, Object> bomRow(VendorAssignmentCriteria criteria,
                                       VendorAssignmentSubmission submission,
                                       String activityFacilityId, String solutionId, String assetName,
                                       String reportNumber, Map<String, Object> data,
                                       Map<String, Object> additionalDetails, Long now) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", deterministicId("bom", activityFacilityId));
        row.put("tenantId", criteria.getTenantId());
        row.put("name", assetName);
        row.put("facilityId", submission.getFacilityId());
        row.put("activityFacilityId", activityFacilityId);
        row.put("solutionId", solutionId);
        row.put("assignUser", submission.getVendorUserId());
        row.put("vendorOrgId", submission.getVendorOrgId());
        row.put("vendorEmail", submission.getVendorEmail());
        row.put("vendorPhone", submission.getVendorPhone());
        row.put("reportNumber", reportNumber);
        row.put("data", data);
        row.put("additionalDetails", additionalDetails);
        row.put("isActive", Boolean.TRUE);
        row.put("auditDetails", auditMap(null, now, now));
        return row;
    }

    private Map<String, Object> linkRow(VendorAssignmentCriteria criteria, String activityFacilityId,
                                        String userId, String actingUser, Long now) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", deterministicId("activity-facility-user", activityFacilityId, userId));
        row.put("tenantId", criteria.getTenantId());
        row.put("activityFacilityId", activityFacilityId);
        row.put("userId", userId);
        row.put("additionalDetails", Map.of());
        row.put("isDeleted", Boolean.FALSE);
        row.put("auditDetails", auditMap(actingUser, now, now));
        return row;
    }

    private Map<String, Object> planHandoverRow(VendorAssignmentCriteria criteria, String userUuid, Long now) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", criteria.getFieldPlanId());
        row.put("tenantId", criteria.getTenantId());
        row.put("status", PLAN_STATUS_PUBLISHED);
        row.put("auditDetails", auditMap(userUuid, null, now));
        return row;
    }

    private static Map<String, Object> auditMap(String by, Long createdTime, Long lastModifiedTime) {
        Map<String, Object> audit = new LinkedHashMap<>();
        audit.put("createdBy", by);
        audit.put("lastModifiedBy", by);
        audit.put("createdTime", createdTime);
        audit.put("lastModifiedTime", lastModifiedTime);
        return audit;
    }

    /**
     * Overwrites the submitted contact details with the ones vendor-registry confirmed, so the
     * vendor notification and the reject-SMS path cannot be sent to an address a caller invented.
     * The submitted value survives only where the registry holds nothing -- an employee record
     * with no email should not blank out an address the frontend already had.
     */
    private void applyConfirmedVendor(VendorAssignmentSubmission submission, OrgUserEnriched member) {
        if (member == null || member.getUser() == null) {
            return;
        }
        submission.setVendorUserName(
                firstNonBlank(member.getUser().getName(), submission.getVendorUserName()));
        submission.setVendorEmail(
                firstNonBlank(member.getUser().getEmailId(), submission.getVendorEmail()));
        submission.setVendorPhone(
                firstNonBlank(member.getUser().getMobileNumber(), submission.getVendorPhone()));
    }

    private static String firstNonBlank(String preferred, String fallback) {
        return StringUtils.hasText(preferred) ? preferred : fallback;
    }

    /**
     * Report Numbers for every bom row. Never entered by a person: system-generated at exactly
     * this point, so a Field Technician's task already carries one when they open it.
     *
     * The format is resolved by idgen from its own registered config against the id name, the
     * same way field-planner generates field plan facility ids. If that format is not registered
     * the call fails -- and because the caller is transactional, the whole submit fails cleanly
     * rather than dispatching numberless reports.
     */
    private List<String> generateReportNumbers(RequestInfo requestInfo, String tenantId, int count) {
        if (count == 0) {
            return List.of();
        }
        try {
            List<String> ids = idGenService.getIdList(requestInfo, tenantId,
                    configuration.getBomReportNumberIdName(), "", count);
            if (ids == null || ids.size() < count) {
                throw new CustomException("IDGEN_ERROR",
                        "egov-idgen returned " + (ids == null ? 0 : ids.size())
                                + " report numbers for " + count + " assets.");
            }
            return ids;
        } catch (CustomException e) {
            throw e;
        } catch (Exception e) {
            throw new CustomException("IDGEN_ERROR",
                    "Could not generate IC Report numbers from egov-idgen (id name "
                            + configuration.getBomReportNumberIdName()
                            + "). Check that this format is registered in idgen. Cause: " + e.getMessage());
        }
    }

    /**
     * Seeds the technician's report from the Project Manager's template, in bom.data's own shape
     * so it is a copy rather than a transformation. The solar asset gets the whole solar section;
     * each machine asset gets just its own line item.
     */
    private Map<String, Object> seedBomData(VendorAssignmentSubmission submission,
                                            Map<String, Object> templateData) {
        if (COMPONENT_SOLAR.equals(submission.getComponentType())) {
            return Map.of(KEY_COMPONENTS, repository.readSection(templateData, KEY_SOLAR_SECTION));
        }
        List<Map<String, Object>> machines = repository.readSection(templateData, KEY_MACHINE_SECTION);
        int position = submission.getComponentSequence() == null ? 0 : submission.getComponentSequence() - 1;
        if (position < 0 || position >= machines.size()) {
            // validate() already rejects an asset set that disagrees with the template, so this
            // is unreachable in practice; an empty component list is a safer fallback than a throw.
            log.warn("machine sequence {} out of range for facility {}",
                    submission.getComponentSequence(), submission.getFacilityId());
            return Map.of(KEY_COMPONENTS, List.of());
        }
        return Map.of(KEY_COMPONENTS, List.of(machines.get(position)));
    }

    /**
     * Names cached onto the bom row so the technician's task list and the reviewer's grid can
     * show "Rajesh Kumar - Solar" without a live lookup per row.
     */
    private Map<String, Object> displayNameCache(VendorAssignmentSubmission submission, String assetName) {
        Map<String, Object> cache = new LinkedHashMap<>();
        cache.put("assetName", assetName);
        cache.put("componentType", submission.getComponentType());
        cache.put("componentSequence", submission.getComponentSequence());
        if (StringUtils.hasText(submission.getVendorOrgName())) {
            cache.put("vendorOrgName", submission.getVendorOrgName());
        }
        if (StringUtils.hasText(submission.getVendorUserName())) {
            cache.put("vendorUserName", submission.getVendorUserName());
        }
        return cache;
    }

    private String assetNameFor(VendorAssignmentSubmission submission, Map<String, Object> templateData) {
        if (COMPONENT_SOLAR.equals(submission.getComponentType())) {
            return SOLAR_ASSET_NAME;
        }
        List<Map<String, Object>> machines = repository.readSection(templateData, KEY_MACHINE_SECTION);
        int position = submission.getComponentSequence() == null ? 0 : submission.getComponentSequence() - 1;
        return position >= 0 && position < machines.size()
                ? machineName(machines.get(position), submission.getComponentSequence())
                : COMPONENT_MACHINE + " " + submission.getComponentSequence();
    }

    private String machineName(Map<String, Object> machine, Integer sequence) {
        Object product = machine == null ? null : machine.get("product");
        String name = product == null ? "" : String.valueOf(product).trim();
        return name.isEmpty() ? COMPONENT_MACHINE + " " + sequence : name;
    }

    // --------------------------------------------------------------- helpers

    /** {facility_id: solution_id} from the scope rows. */
    private static Map<String, String> solutionByFacility(List<Map<String, Object>> scopeRows) {
        Map<String, String> byFacility = new LinkedHashMap<>();
        for (Map<String, Object> row : scopeRows) {
            byFacility.put(asString(row.get("facility_id")), asString(row.get("solution_id")));
        }
        return byFacility;
    }

    private Map<String, Object> requirePlan(VendorAssignmentCriteria criteria) {
        if (criteria == null || !StringUtils.hasText(criteria.getTenantId())
                || !StringUtils.hasText(criteria.getFieldPlanId())) {
            throw new CustomException("INVALID_REQUEST", "tenantId and fieldPlanId are required");
        }
        Map<String, Object> plan = repository.findPlan(criteria.getTenantId(), criteria.getFieldPlanId());
        if (plan == null) {
            throw new CustomException("PLAN_NOT_FOUND",
                    "Installation plan " + criteria.getFieldPlanId() + " not found");
        }
        return plan;
    }

    private static String assetKey(String facilityId, String componentType, Integer componentSequence) {
        return facilityId + "|" + componentType + "|" + componentSequence;
    }

    private static VendorAssignmentError planError(String code, String message) {
        return VendorAssignmentError.builder().code(code).message(message).build();
    }

    private static VendorAssignmentError assetError(VendorAssignmentSubmission submission,
                                                    String code, String message) {
        return VendorAssignmentError.builder()
                .facilityId(submission.getFacilityId())
                .componentType(submission.getComponentType())
                .componentSequence(submission.getComponentSequence())
                .code(code)
                .message(message)
                .build();
    }

    private static String summarise(List<VendorAssignmentError> errors) {
        StringBuilder sb = new StringBuilder(errors.size() + " validation error(s): ");
        for (int i = 0; i < Math.min(errors.size(), 5); i++) {
            if (i > 0) {
                sb.append("; ");
            }
            sb.append(errors.get(i).getCode()).append(" - ").append(errors.get(i).getMessage());
        }
        if (errors.size() > 5) {
            sb.append(" (and ").append(errors.size() - 5).append(" more)");
        }
        return sb.toString();
    }

    private static <T> List<T> orEmpty(List<T> list) {
        return CollectionUtils.isEmpty(list) ? List.of() : list;
    }

    private static String asString(Object value) {
        return value == null ? null : String.valueOf(value);
    }
}
