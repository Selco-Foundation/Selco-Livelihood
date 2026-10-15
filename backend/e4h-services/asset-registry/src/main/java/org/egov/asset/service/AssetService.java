package org.egov.asset.service;

import digit.models.coremodels.AuditDetails;
//import digit.models.coremodels.Document;
import lombok.extern.slf4j.Slf4j;
import org.egov.asset.mapper.AssetRowMapper;
import org.egov.asset.mapper.DocumentRowMapper;
import org.egov.asset.repository.AssetRepository;
import org.egov.asset.util.ErrorConstants;
import org.egov.asset.util.IdgenUtil;
import org.egov.asset.util.OrganisationUtil;
import org.egov.asset.util.ResponseInfoFactory;
import org.egov.asset.web.models.Asset;
import org.egov.asset.web.models.AssetCreateRequest;
import org.egov.asset.web.models.AssetCreateResponse;
import org.egov.asset.web.models.AssetVendorUpdate;
import org.egov.asset.web.models.AssetVendorUpdateRequest;
import org.egov.asset.web.models.AssetVendorUpdateResponse;
import org.egov.asset.web.models.AssetVendorUpdateResult;
import org.egov.asset.web.models.Document;
import org.egov.common.contract.request.RequestInfo;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.util.CollectionUtils;

import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Service
@Slf4j
public class AssetService {

    /** Upper bound when fetching a group's units; a group is a handful of rows, never a page. */
    private static final int MAX_UNITS_PER_GROUP = 500;

    private final JdbcTemplate jdbcTemplate;
    private final AssetRowMapper assetRowMapper;
    private final DocumentRowMapper documentRowMapper;
    private final IdgenUtil idgenUtil;
    private final AssetRepository assetRepository;
    private final ResponseInfoFactory responseInfoFactory;
    private final LivelihoodAssetBoundaryEnricher livelihoodAssetBoundaryEnricher;
    private final AssetLocalizationService assetLocalizationService;
    private final OrganisationUtil organisationUtil;

    @Autowired
    public AssetService(
            JdbcTemplate jdbcTemplate,
            AssetRowMapper assetRowMapper,
            DocumentRowMapper documentRowMapper,
            IdgenUtil idgenUtil,
            AssetRepository assetRepository,
            ResponseInfoFactory responseInfoFactory,
            LivelihoodAssetBoundaryEnricher livelihoodAssetBoundaryEnricher,
            AssetLocalizationService assetLocalizationService,
            OrganisationUtil organisationUtil
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.assetRowMapper = assetRowMapper;
        this.documentRowMapper = documentRowMapper;
        this.idgenUtil = idgenUtil;
        this.assetRepository = assetRepository;
        this.responseInfoFactory = responseInfoFactory;
        this.livelihoodAssetBoundaryEnricher = livelihoodAssetBoundaryEnricher;
        this.assetLocalizationService = assetLocalizationService;
        this.organisationUtil = organisationUtil;
    }

    /**
     * Creates one asset, or a parent together with its {@code children} (e.g. SOLAR + PANEL/BATTERY/INVERTER
     * units). Only a top-level asset registers its own Asset boundary; units take the parent's boundary code
     * and get no boundary/localization of their own. The request is already validated (AssetValidator).
     */
    public AssetCreateResponse createAsset(AssetCreateRequest request) {
        RequestInfo requestInfo = request.getRequestInfo();
        Asset root = request.getAssetDetail().getAsset();
        List<Asset> children = root.getChildren() == null ? Collections.emptyList() : root.getChildren();

        List<Asset> allAssets = new ArrayList<>();
        allAssets.add(root);
        allAssets.addAll(children);
        List<String> ids = idgenUtil.getIdList(requestInfo, root.getTenantId(), "assetId", "", allAssets.size());
        if (ids.size() < allAssets.size())
            throw new CustomException(ErrorConstants.ID_GEN_SERVICE_ERROR_CODE, ErrorConstants.ID_GEN_SERVICE_ERROR_MSG);
        for (int i = 0; i < allAssets.size(); i++) {
            Asset asset = allAssets.get(i);
            asset.setAssetId(ids.get(i));
            enrichNewAsset(asset, requestInfo);
        }

        if (isBlank(root.getParentId())) {
            livelihoodAssetBoundaryEnricher.enrichAndRegister(root, requestInfo);
        } else {
            // Single unit added to an existing parent (validated to exist): share the parent's boundary.
            List<Asset> parents = searchAssets(Asset.builder().tenantId(root.getTenantId()).assetId(root.getParentId()).build(), 1, 0);
            if (!parents.isEmpty()) {
                root.setBoundaryCode(parents.get(0).getBoundaryCode());
            }
        }
        for (Asset child : children) {
            child.setParentId(root.getAssetId());
            child.setBoundaryCode(root.getBoundaryCode());
        }

        // Parent row first so a unit never references a parent that isn't persisted; children are not
        // part of the parent's persisted payload.
        root.setChildren(null);
        assetRepository.pushCreateAsset(root);
        children.forEach(assetRepository::pushCreateAsset);
        root.setChildren(children.isEmpty() ? null : children);

        return AssetCreateResponse.builder()
                .responseInfo(responseInfoFactory.createResponseInfoFromRequestInfo(requestInfo, true))
                .asset(root)
                .build();
    }

    /** Audit details, document ids and the persisted name for a newly created asset. */
    private void enrichNewAsset(Asset asset, RequestInfo requestInfo) {
        if (asset.getAuditDetails() == null) {
            AuditDetails auditDetails = AuditDetails.builder()
                    .createdBy(requestInfo.getUserInfo().getUserName())
                    .createdTime(System.currentTimeMillis())
                    .lastModifiedBy(requestInfo.getUserInfo().getUserName())
                    .lastModifiedTime(System.currentTimeMillis())
                    .build();
            asset.setAuditDetails(auditDetails);
        }
        if (asset.getDocuments() == null) {
            asset.setDocuments(new ArrayList<>());
        }
        if (!asset.getDocuments().isEmpty()) {
            List<String> documentIds = idgenUtil.getIdList(requestInfo, asset.getTenantId(),
                    "documentId", "DOCUMENT-[SEQ_DOCUMENT_ID]", asset.getDocuments().size());
            IntStream.range(0, documentIds.size())
                    .forEach(i -> asset.getDocuments().get(i).setId(documentIds.get(i)));
        }
        if (isBlank(asset.getName()) && asset.getAssetDetails() != null && asset.getAssetDetails().get("name") != null) {
            asset.setName(String.valueOf(asset.getAssetDetails().get("name")));
        }
    }

    public List<Asset> fetchAssetsWithDocuments(Asset request, int limit, int offset) {
        return fetchAssetsWithDocuments(request, limit, offset, false);
    }

    /** @param excludeUnits true returns only top-level assets (parent_id IS NULL), e.g. for end users. */
    public List<Asset> fetchAssetsWithDocuments(Asset request, int limit, int offset, boolean excludeUnits) {
        List<Asset> assets = searchAssets(request, limit, offset, excludeUnits);

        if (!assets.isEmpty()) {
            List<String> assetIds = assets.stream().map(Asset::getAssetId).collect(Collectors.toList());
            Map<String, List<Document>> documentsMap = searchDocumentsByAssetIds(request.getTenantId(), assetIds);

            assets.forEach(asset -> {
                List<Document> documents = documentsMap.getOrDefault(asset.getAssetId(), new ArrayList<>());
                asset.setDocuments(documents);
            });
        }

        return assets;
    }

    public Integer getAssetsCount(Asset request) {
        return getAssetsCount(request, false);
    }

    public Integer getAssetsCount(Asset request, boolean excludeUnits) {
        log.info("AssetService::fetchAssetsWithDocuments called | tenantId={}",
                request.getTenantId());
         Integer count = countAssets(request, excludeUnits);
        log.info("Total Assets count is : " + count);

        return count;
    }

    public List<Asset> searchAssets(Asset asset, int limit, int offset) {
        return searchAssets(asset, limit, offset, false);
    }

    public List<Asset> searchAssets(Asset asset, int limit, int offset, boolean excludeUnits) {
        StringBuilder query = new StringBuilder("SELECT * FROM asset WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (asset.getTenantId() != null && !asset.getTenantId().isBlank()) {
            query.append(" AND tenant_id = ?");
            params.add(asset.getTenantId());
        }

        if (asset.getAssetId() != null && !asset.getAssetId().isBlank()) {
            query.append(" AND asset_id = ?");
            params.add(asset.getAssetId());
        }

        if (!CollectionUtils.isEmpty(asset.getAssetTypeSearch())) {
            query.append(" AND asset_type_id IN (").append(createQuery(asset.getAssetTypeSearch())).append(")");
            params.addAll(asset.getAssetTypeSearch());
        }

        if (asset.getWfStatus() != null && !asset.getWfStatus().isBlank()) {
            query.append(" AND wf_status = ?");
            params.add(asset.getWfStatus());
        }

        if (asset.getIsOperational() != null) {
            query.append(" AND is_operational = ?");
            params.add(asset.getIsOperational());
        }

        if (asset.getIsOnmReady() != null) {
            query.append(" AND is_onm_ready = ?");
            params.add(asset.getIsOnmReady());
        }

        if (asset.getFacilityID() != null && !asset.getFacilityID().isBlank()) {
            query.append(" AND facility_id = ?");
            params.add(asset.getFacilityID());
        }

        if (asset.getBoundaryCode() != null && !asset.getBoundaryCode().isBlank()) {
            query.append(" AND boundary_code = ?");
            params.add(asset.getBoundaryCode());
        } else if (!CollectionUtils.isEmpty(asset.getBoundaryCodePrefixes())) {
            query.append(" AND (");
            List<String> prefixes = asset.getBoundaryCodePrefixes();
            for (int i = 0; i < prefixes.size(); i++) {
                if (i > 0) {
                    query.append(" OR ");
                }
                query.append(" LOWER(boundary_code) LIKE ? ");
                params.add(prefixes.get(i).toLowerCase(Locale.ROOT));
            }
            query.append(") ");
        }

        if (asset.getActivityFacilityID() != null && !asset.getActivityFacilityID().isBlank()) {
            query.append(" AND activity_facility_id = ?");
            params.add(asset.getActivityFacilityID());
        }

//        if (asset.getSerialNumber() != null && !asset.getSerialNumber().isBlank()) {
//            query.append(" AND serial_number = ?");
//            params.add(asset.getSerialNumber());
//        }

        if (!CollectionUtils.isEmpty(asset.getSerialNumberSearch())) {
            query.append(" AND serial_number IN (").append(createQuery(asset.getSerialNumberSearch())).append(")");
            params.addAll(asset.getSerialNumberSearch());
        }

        if (asset.getModelNumber() != null && !asset.getModelNumber().isBlank()) {
            query.append(" AND model_number = ?");
            params.add(asset.getModelNumber());
        }

        if (asset.getBrandID()!= null && !asset.getBrandID().isBlank()) {
            query.append(" AND brand_id = ?");
            params.add(asset.getBrandID());
        }

        if (asset.getVendorId() != null && !asset.getVendorId().isBlank()) {
            query.append(" AND vendor_id = ?");
            params.add(asset.getVendorId());
        }

        if (asset.getItemCode() != null && !asset.getItemCode().isBlank()) {
            query.append(" AND item_code = ?");
            params.add(asset.getItemCode());
        }

        appendHierarchyFilters(asset, query, params, excludeUnits);

        query.append(" ORDER BY created_time DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);

        return jdbcTemplate.query(query.toString(), params.toArray(), assetRowMapper.rowMapper);
    }

    public Integer countAssets(Asset asset) {
        return countAssets(asset, false);
    }

    public Integer countAssets(Asset asset, boolean excludeUnits) {
        log.info("AssetService::searchAssets called | tenantId={} assetId={}",
                asset.getTenantId(), asset.getAssetId());
        StringBuilder query = new StringBuilder("SELECT COUNT(*) FROM asset WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (asset.getTenantId() != null && !asset.getTenantId().isBlank()) {
            query.append(" AND tenant_id = ?");
            params.add(asset.getTenantId());
        }

        if (asset.getAssetId() != null && !asset.getAssetId().isBlank()) {
            query.append(" AND asset_id = ?");
            params.add(asset.getAssetId());
        }

        if (asset.getAssetTypeID() != null && !asset.getAssetTypeID().isBlank()) {
            query.append(" AND asset_type_id = ?");
            params.add(asset.getAssetTypeID());
        }

        if (asset.getWfStatus() != null && !asset.getWfStatus().isBlank()) {
            query.append(" AND wf_status = ?");
            params.add(asset.getWfStatus());
        }

        if (asset.getIsOnmReady() != null) {
            query.append(" AND is_onm_ready = ?");
            params.add(asset.getIsOnmReady());
        }

        if (asset.getFacilityID() != null && !asset.getFacilityID().isBlank()) {
            query.append(" AND facility_id = ?");
            params.add(asset.getFacilityID());
        }

        if (asset.getBoundaryCode() != null && !asset.getBoundaryCode().isBlank()) {
            query.append(" AND boundary_code = ?");
            params.add(asset.getBoundaryCode());
        } else if (!CollectionUtils.isEmpty(asset.getBoundaryCodePrefixes())) {
            query.append(" AND (");
            List<String> prefixes = asset.getBoundaryCodePrefixes();
            for (int i = 0; i < prefixes.size(); i++) {
                if (i > 0) {
                    query.append(" OR ");
                }
                query.append(" LOWER(boundary_code) LIKE ? ");
                params.add(prefixes.get(i).toLowerCase(Locale.ROOT));
            }
            query.append(") ");
        }

        if (asset.getActivityFacilityID() != null && !asset.getActivityFacilityID().isBlank()) {
            query.append(" AND activity_facility_id = ?");
            params.add(asset.getActivityFacilityID());
        }

        if (!CollectionUtils.isEmpty(asset.getSerialNumberSearch())) {
            query.append(" AND serial_number IN (").append(createQuery(asset.getSerialNumberSearch())).append(")");
            params.addAll(asset.getSerialNumberSearch());
        }

        if (asset.getModelNumber() != null && !asset.getModelNumber().isBlank()) {
            query.append(" AND model_number = ?");
            params.add(asset.getModelNumber());
        }

        if (asset.getBrandID()!= null && !asset.getBrandID().isBlank()) {
            query.append(" AND brand_id = ?");
            params.add(asset.getBrandID());
        }

        if (asset.getVendorId() != null && !asset.getVendorId().isBlank()) {
            query.append(" AND vendor_id = ?");
            params.add(asset.getVendorId());
        }

        if (asset.getItemCode() != null && !asset.getItemCode().isBlank()) {
            query.append(" AND item_code = ?");
            params.add(asset.getItemCode());
        }

        appendHierarchyFilters(asset, query, params, excludeUnits);

        log.debug("Executing asset search count={} with params={}", query, params);

        return jdbcTemplate.queryForObject(query.toString(), params.toArray(), Integer.class);
    }

    /**
     * Nests each asset's units (rows whose parent_id is that asset) into its children, with their
     * documents. One query for the whole page; assets without units keep children null.
     */
    public void attachChildren(String tenantId, List<Asset> assets) {
        if (CollectionUtils.isEmpty(assets)) {
            return;
        }
        List<String> parentIds = assets.stream().map(Asset::getAssetId).collect(Collectors.toList());
        StringBuilder query = new StringBuilder("SELECT * FROM asset WHERE parent_id IN (")
                .append(createQuery(parentIds)).append(")");
        List<Object> params = new ArrayList<>(parentIds);
        if (!isBlank(tenantId)) {
            query.append(" AND tenant_id = ?");
            params.add(tenantId);
        }
        query.append(" ORDER BY created_time ASC");
        List<Asset> children = jdbcTemplate.query(query.toString(), params.toArray(), assetRowMapper.rowMapper);
        if (children.isEmpty()) {
            return;
        }

        Map<String, List<Document>> documentsMap = searchDocumentsByAssetIds(tenantId,
                children.stream().map(Asset::getAssetId).collect(Collectors.toList()));
        children.forEach(child -> child.setDocuments(documentsMap.getOrDefault(child.getAssetId(), new ArrayList<>())));

        Map<String, List<Asset>> childrenByParent = children.stream()
                .collect(Collectors.groupingBy(Asset::getParentId, LinkedHashMap::new, Collectors.toList()));
        assets.forEach(asset -> {
            List<Asset> units = childrenByParent.get(asset.getAssetId());
            if (units != null) {
                asset.setChildren(units);
            }
        });
    }

    public Map<String, List<Document>> searchDocumentsByAssetIds(String tenantId, List<String> assetIds) {
        if (assetIds == null || assetIds.isEmpty()) {
            return new HashMap<>();
        }

        StringBuilder query = new StringBuilder("SELECT * FROM asset_documents WHERE 1=1");
        List<Object> params = new ArrayList<>();

        if (tenantId != null && !tenantId.isBlank()) {
            query.append(" AND tenant_id = ?");
            params.add(tenantId);
        }
        query.append(" AND asset_id IN (");
        query.append(String.join(",", Collections.nCopies(assetIds.size(), "?")));
        query.append(")");
        params.addAll(assetIds);

        return jdbcTemplate.query(query.toString(), params.toArray(), (rs) -> {
            Map<String, List<Document>> documentsMap = new HashMap<>();
            while (rs.next()) {
                String assetId = rs.getString("asset_id");
                Document document = documentRowMapper.mapDocument(rs);
                documentsMap.computeIfAbsent(assetId, k -> new ArrayList<>()).add(document);
            }
            return documentsMap;
        });
    }

    public Asset getAssetById(String tenantId, String assetId) {
        List<Asset> assets = fetchAssetsWithDocuments(
                Asset.builder().tenantId(tenantId).assetId(assetId).build(),
                1,
                0
        );
        if (assets == null || assets.isEmpty()) {
            throw new CustomException(ErrorConstants.ASSET_NOT_FOUND_CODE, ErrorConstants.ASSET_NOT_FOUND_MSG);
        }
        return assets.get(0);
    }

    public Asset updateAsset(String assetId, AssetCreateRequest request) {
        if (request == null || request.getAssetDetail() == null || request.getAssetDetail().getAsset() == null) {
            throw new CustomException("INVALID_REQUEST", "Asset request cannot be null");
        }
        Asset updated = request.getAssetDetail().getAsset();
        if (!assetId.equals(updated.getAssetId())) {
            throw new CustomException("ASSET_ID_MISMATCH", "Provided assetId does not match the asset's ID");
        }

        // Check whether asset exists in the database
        List<Asset> existingAssets = searchAssets(Asset.builder().assetId(updated.getAssetId()).tenantId(updated.getTenantId()).build(), 10, 0);
        if (existingAssets == null || existingAssets.isEmpty()) {
            throw new CustomException("ASSET_NOT_FOUND", "Asset with ID " + assetId + " does not exist");
        }

        // Preserve fields not sent on partial updates (e.g. approve-time isOnmReady flip)
        Asset existing = existingAssets.get(0);
        mergeForUpdate(updated, existing);

        // Update audit details
        if (updated.getAuditDetails() != null) {
            updated.getAuditDetails().setLastModifiedBy(request.getRequestInfo().getUserInfo().getUserName());
            updated.getAuditDetails().setLastModifiedTime(System.currentTimeMillis());
        }

        // Assign IDs to newly-added documents (existing ones already carry their id from a prior save)
        List<Document> newDocuments = CollectionUtils.isEmpty(updated.getDocuments())
                ? Collections.emptyList()
                : updated.getDocuments().stream()
                        .filter(doc -> doc != null && (doc.getId() == null || doc.getId().isBlank()))
                        .collect(Collectors.toList());
        if (!newDocuments.isEmpty()) {
            List<String> documentIds = idgenUtil.getIdList(request.getRequestInfo(), updated.getTenantId(),
                    "documentId", "DOCUMENT-[SEQ_DOCUMENT_ID]", newDocuments.size());
            IntStream.range(0, newDocuments.size())
                    .forEach(i -> newDocuments.get(i).setId(documentIds.get(i)));
        }

        assetRepository.pushUpdateAsset(updated);
        assetLocalizationService.upsertAssetBoundaryLocalizations(updated, request.getRequestInfo());
        return updated;
    }

    /** Fill null/blank request fields from the persisted row so partial updates do not wipe data. */
    private void mergeForUpdate(Asset updated, Asset existing) {
        if (isBlank(updated.getSystem())) updated.setSystem(existing.getSystem());
        if (isBlank(updated.getFacilityID())) updated.setFacilityID(existing.getFacilityID());
        if (isBlank(updated.getBoundaryCode())) updated.setBoundaryCode(existing.getBoundaryCode());
        if (isBlank(updated.getActivityFacilityID())) updated.setActivityFacilityID(existing.getActivityFacilityID());
        if (isBlank(updated.getAssetTypeID())) updated.setAssetTypeID(existing.getAssetTypeID());
        if (isBlank(updated.getSerialNumber())) updated.setSerialNumber(existing.getSerialNumber());
        if (isBlank(updated.getModelNumber())) updated.setModelNumber(existing.getModelNumber());
        if (isBlank(updated.getBrandID())) updated.setBrandID(existing.getBrandID());
        if (isBlank(updated.getVendorId())) updated.setVendorId(existing.getVendorId());
        if (isBlank(updated.getItemCode())) updated.setItemCode(existing.getItemCode());
        if (updated.getWarrantyStartDate() == null) updated.setWarrantyStartDate(existing.getWarrantyStartDate());
        if (updated.getWarrantyDuration() == null) updated.setWarrantyDuration(existing.getWarrantyDuration());
        if (updated.getWarrantyEndDate() == null) updated.setWarrantyEndDate(existing.getWarrantyEndDate());
        if (isBlank(updated.getWfStatus())) updated.setWfStatus(existing.getWfStatus());
        if (updated.getIsActive() == null) updated.setIsActive(existing.getIsActive());
        if (updated.getIsOperational() == null) updated.setIsOperational(existing.getIsOperational());
        if (updated.getIsOnmReady() == null) updated.setIsOnmReady(existing.getIsOnmReady());
        if (isBlank(updated.getSourceBomId())) updated.setSourceBomId(existing.getSourceBomId());
        if (isBlank(updated.getParentId())) updated.setParentId(existing.getParentId());
        if (isBlank(updated.getName())) {
            Object detailsName = updated.getAssetDetails() != null ? updated.getAssetDetails().get("name") : null;
            updated.setName(detailsName != null && !String.valueOf(detailsName).isBlank()
                    ? String.valueOf(detailsName) : existing.getName());
        }
        if (updated.getAssetDetails() == null) updated.setAssetDetails(existing.getAssetDetails());
        if (updated.getAdditionalDetails() == null) updated.setAdditionalDetails(existing.getAdditionalDetails());
        if (updated.getAuditDetails() == null) updated.setAuditDetails(existing.getAuditDetails());
    }

    /** Parent/child filters shared by search and count: a parent's units, or (excludeUnits) top-level assets only. */
    private void appendHierarchyFilters(Asset asset, StringBuilder query, List<Object> params, boolean excludeUnits) {
        if (!isBlank(asset.getParentId())) {
            query.append(" AND parent_id = ?");
            params.add(asset.getParentId());
        }
        if (excludeUnits) {
            query.append(" AND parent_id IS NULL");
        }
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    /**
     * Repoints one or more asset groups at a new vendor, in a single save.
     *
     * <p>Each entry names a group parent; the new vendor is applied to that asset and
     * to every unit beneath it, because a unit is serviced by whoever services its
     * parent.
     *
     * <p>Everything is validated before anything is written, so one bad vendor cannot
     * leave another group half-remapped. Note this is not a transaction: each write
     * is a Kafka message, so a broker failure part-way can still apply some of them.
     * Re-running the same request is harmless.
     *
     * <p>The vendor stored is the vendor <b>user</b> uuid, matching what ingestion
     * writes, so im-services can assign new tickets straight to that person. Tickets
     * raised before the change keep their original vendor and are not touched.
     */
    public AssetVendorUpdateResponse updateAssetVendors(AssetVendorUpdateRequest request) {
        List<AssetVendorUpdate> updates = request.getAssetVendorUpdates();
        if (CollectionUtils.isEmpty(updates)) {
            throw new CustomException(ErrorConstants.ASSET_VENDOR_UPDATE_INVALID_CODE,
                    "At least one asset vendor update is required");
        }

        Set<String> seenAssetIds = new LinkedHashSet<>();
        for (AssetVendorUpdate update : updates) {
            if (!seenAssetIds.add(update.getAssetId())) {
                throw new CustomException(ErrorConstants.ASSET_VENDOR_UPDATE_INVALID_CODE,
                        "Asset " + update.getAssetId() + " appears more than once in the request");
            }
        }

        RequestInfo requestInfo = request.getRequestInfo();
        String tenantId = request.getTenantId();

        // --- validate everything first -------------------------------------------
        Map<String, List<Asset>> groupsByAssetId = new LinkedHashMap<>();
        Set<String> validatedVendors = new HashSet<>();

        for (AssetVendorUpdate update : updates) {
            Asset parent = getAssetById(tenantId, update.getAssetId());
            String resolvedTenantId = tenantId != null && !tenantId.isBlank()
                    ? tenantId : parent.getTenantId();

            // One validation per distinct vendor, not per group.
            String vendorKey = update.getOrganisationId() + "|" + update.getVendorId();
            if (validatedVendors.add(vendorKey)) {
                organisationUtil.validateVendorUser(requestInfo, resolvedTenantId,
                        update.getOrganisationId(), update.getVendorId());
            }

            List<Asset> group = new ArrayList<>();
            group.add(parent);
            group.addAll(findUnits(resolvedTenantId, parent.getAssetId()));
            groupsByAssetId.put(update.getAssetId(), group);
        }

        // --- then write ------------------------------------------------------------
        String updatedBy = requestInfo != null && requestInfo.getUserInfo() != null
                ? requestInfo.getUserInfo().getUserName() : null;
        long updatedAt = System.currentTimeMillis();

        List<AssetVendorUpdateResult> results = new ArrayList<>();
        for (AssetVendorUpdate update : updates) {
            List<Asset> group = groupsByAssetId.get(update.getAssetId());
            List<String> updatedAssetIds = new ArrayList<>();

            for (Asset asset : group) {
                asset.setVendorId(update.getVendorId());
                applyAudit(asset, updatedBy, updatedAt);
                // children is request/response only; leave it off the persisted payload
                asset.setChildren(null);
                assetRepository.pushUpdateAsset(asset);
                updatedAssetIds.add(asset.getAssetId());
            }

            log.info("Remapped asset group {} to vendor user {} (org {}), {} asset(s) updated",
                    update.getAssetId(), update.getVendorId(), update.getOrganisationId(),
                    updatedAssetIds.size());

            results.add(AssetVendorUpdateResult.builder()
                    .assetId(update.getAssetId())
                    .vendorId(update.getVendorId())
                    .organisationId(update.getOrganisationId())
                    .updatedAssetIds(updatedAssetIds)
                    .build());
        }

        return AssetVendorUpdateResponse.builder()
                .responseInfo(responseInfoFactory.createResponseInfoFromRequestInfo(requestInfo, true))
                .assetVendorUpdates(results)
                .build();
    }

    /** The units of a group. Empty for a standalone asset, which is not an error. */
    private List<Asset> findUnits(String tenantId, String parentAssetId) {
        Asset criteria = Asset.builder().tenantId(tenantId).parentId(parentAssetId).build();
        List<Asset> units = searchAssets(criteria, MAX_UNITS_PER_GROUP, 0);
        return units == null ? List.of() : units;
    }

    private void applyAudit(Asset asset, String updatedBy, long updatedAt) {
        AuditDetails auditDetails = asset.getAuditDetails();
        if (auditDetails == null) {
            auditDetails = AuditDetails.builder().build();
            asset.setAuditDetails(auditDetails);
        }
        auditDetails.setLastModifiedBy(updatedBy);
        auditDetails.setLastModifiedTime(updatedAt);
    }

    private String createQuery(Collection<String> ids) {
        StringBuilder builder = new StringBuilder();
        int length = ids.size();
        for (int i = 0; i < length; i++) {
            builder.append(" ? ");
            if (i != length - 1) builder.append(",");
        }
        return builder.toString();
    }
}
