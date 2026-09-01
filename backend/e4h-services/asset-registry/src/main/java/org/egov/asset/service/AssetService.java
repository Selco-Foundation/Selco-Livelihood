package org.egov.asset.service;

import digit.models.coremodels.AuditDetails;
//import digit.models.coremodels.Document;
import lombok.extern.slf4j.Slf4j;
import org.egov.asset.mapper.AssetRowMapper;
import org.egov.asset.mapper.DocumentRowMapper;
import org.egov.asset.repository.AssetRepository;
import org.egov.asset.util.ErrorConstants;
import org.egov.asset.util.IdgenUtil;
import org.egov.asset.util.ResponseInfoFactory;
import org.egov.asset.web.models.Asset;
import org.egov.asset.web.models.AssetCreateRequest;
import org.egov.asset.web.models.AssetCreateResponse;
import org.egov.asset.web.models.Document;
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

    private final JdbcTemplate jdbcTemplate;
    private final AssetRowMapper assetRowMapper;
    private final DocumentRowMapper documentRowMapper;
    private final IdgenUtil idgenUtil;
    private final AssetRepository assetRepository;
    private final ResponseInfoFactory responseInfoFactory;
    private final LivelihoodAssetBoundaryEnricher livelihoodAssetBoundaryEnricher;
    private final AssetLocalizationService assetLocalizationService;

    @Autowired
    public AssetService(
            JdbcTemplate jdbcTemplate,
            AssetRowMapper assetRowMapper,
            DocumentRowMapper documentRowMapper,
            IdgenUtil idgenUtil,
            AssetRepository assetRepository,
            ResponseInfoFactory responseInfoFactory,
            LivelihoodAssetBoundaryEnricher livelihoodAssetBoundaryEnricher,
            AssetLocalizationService assetLocalizationService
    ) {
        this.jdbcTemplate = jdbcTemplate;
        this.assetRowMapper = assetRowMapper;
        this.documentRowMapper = documentRowMapper;
        this.idgenUtil = idgenUtil;
        this.assetRepository = assetRepository;
        this.responseInfoFactory = responseInfoFactory;
        this.livelihoodAssetBoundaryEnricher = livelihoodAssetBoundaryEnricher;
        this.assetLocalizationService = assetLocalizationService;
    }

    public AssetCreateResponse createAsset(AssetCreateRequest request) {
        List<String> ids = idgenUtil.getIdList(request.getRequestInfo(), request.getAssetDetail().getAsset().getTenantId(),
                "assetId", "", 1);
        List<String> documentIds = idgenUtil.getIdList(request.getRequestInfo(), request.getAssetDetail().getAsset().getTenantId(),
                "documentId", "DOCUMENT-[SEQ_DOCUMENT_ID]", request.getAssetDetail().getAsset().getDocuments().size());
        if (!ids.isEmpty())
            request.getAssetDetail().getAsset().setAssetId(ids.get(0));
        else
            throw new CustomException(ErrorConstants.ID_GEN_SERVICE_ERROR_CODE, ErrorConstants.ID_GEN_SERVICE_ERROR_MSG);
        if (request.getAssetDetail().getAsset().getAuditDetails() == null) {
            AuditDetails auditDetails = AuditDetails.builder()
                    .createdBy(request.getRequestInfo().getUserInfo().getUserName())
                    .createdTime(System.currentTimeMillis())
                    .lastModifiedBy(request.getRequestInfo().getUserInfo().getUserName())
                    .lastModifiedTime(System.currentTimeMillis())
                    .build();
            request.getAssetDetail().getAsset().setAuditDetails(auditDetails);
        }
        IntStream.range(0, documentIds.size())
                .forEach(i -> request.getAssetDetail().getAsset().getDocuments().get(i).setId(documentIds.get(i)));

        livelihoodAssetBoundaryEnricher.enrichAndRegister(
                request.getAssetDetail().getAsset(),
                request.getRequestInfo()
        );

        assetRepository.pushCreateAsset(request.getAssetDetail().getAsset());
        return AssetCreateResponse.builder()
                .responseInfo(responseInfoFactory.createResponseInfoFromRequestInfo(request.getRequestInfo(), true))
                .asset(request.getAssetDetail().getAsset())
                .build();
    }

    public List<Asset> fetchAssetsWithDocuments(Asset request, int limit, int offset) {
        List<Asset> assets = searchAssets(request, limit, offset);

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
        log.info("AssetService::fetchAssetsWithDocuments called | tenantId={}",
                request.getTenantId());
         Integer count = countAssets(request);
        log.info("Total Assets count is : " + count);

        return count;
    }

    public List<Asset> searchAssets(Asset asset, int limit, int offset) {
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

        query.append(" ORDER BY created_time DESC LIMIT ? OFFSET ?");
        params.add(limit);
        params.add(offset);

        return jdbcTemplate.query(query.toString(), params.toArray(), assetRowMapper.rowMapper);
    }

    public Integer countAssets(Asset asset) {
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

        log.debug("Executing asset search count={} with params={}", query, params);

        return jdbcTemplate.queryForObject(query.toString(), params.toArray(), Integer.class);
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
        if (updated.getAssetDetails() == null) updated.setAssetDetails(existing.getAssetDetails());
        if (updated.getAdditionalDetails() == null) updated.setAdditionalDetails(existing.getAdditionalDetails());
        if (updated.getAuditDetails() == null) updated.setAuditDetails(existing.getAuditDetails());
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
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
