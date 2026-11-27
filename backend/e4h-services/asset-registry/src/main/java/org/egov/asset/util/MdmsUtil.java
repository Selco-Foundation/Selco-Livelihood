package org.egov.asset.util;

import lombok.extern.slf4j.Slf4j;
import org.egov.asset.config.Configuration;
import org.egov.common.contract.request.RequestInfo;
import org.egov.mdms.model.*;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;
import org.springframework.util.CollectionUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

@Slf4j
@Component
public class MdmsUtil {

    private final RestTemplate restTemplate;

    private final Configuration configuration;

    @Autowired
    public MdmsUtil(RestTemplate restTemplate, Configuration configuration) {
        this.restTemplate = restTemplate;
        this.configuration = configuration;
    }


    /**
     * Builds cache for MDMS data, this gets refreshed for every call.
     *
     * @param requestInfo
     * @param tenantId
     * @return
     */
    public Map<String, Object> getMDMSData(RequestInfo requestInfo, String tenantId) {
        MdmsResponse response = fetchMDMSData(requestInfo, tenantId);
        Map<String, Object> masterData = new HashMap<>();
        Map<String, List<String>> eachMasterMap = new HashMap<>();
        if (null != response) {
            if (!CollectionUtils.isEmpty(response.getMdmsRes().keySet())) {
                if (null != response.getMdmsRes().get(AssetConstants.ASSET_MODULE_NAME)) {
                    eachMasterMap = (Map) response.getMdmsRes().get(AssetConstants.ASSET_MODULE_NAME);
                    masterData.put(AssetConstants.ASSET_TYPE_CODE, eachMasterMap.get(AssetConstants.ASSET_TYPE_CODE));
                    masterData.put(AssetConstants.ASSET_COUNT_CODE, eachMasterMap.get(AssetConstants.ASSET_COUNT_CODE));
                    masterData.put(AssetConstants.BRAND_CODE, eachMasterMap.get(AssetConstants.BRAND_CODE));
                    masterData.put(AssetConstants.SYSTEM_CODE, eachMasterMap.get(AssetConstants.SYSTEM_CODE));
                    masterData.put(AssetConstants.WARRANTY_DURATION, eachMasterMap.get(AssetConstants.WARRANTY_DURATION));
                }
            }
        }

        return masterData;
    }


    /**
     * Makes call to the MDMS service to fetch the MDMS data.
     *
     * @param requestInfo
     * @param tenantId
     * @return
     */
    public MdmsResponse fetchMDMSData(RequestInfo requestInfo, String tenantId) {
        StringBuilder uri = new StringBuilder();
        MdmsCriteriaReq request = prepareMDMSRequest(uri, requestInfo, tenantId);
        MdmsResponse response = null;
        try {
            response = restTemplate.postForObject(uri.toString(), request, MdmsResponse.class);
        } catch (Exception e) {
            log.info("Exception while fetching from MDMS: ", e);
            throw new CustomException(ErrorConstants.MDMS_SERVICE_ERROR_CODE, ErrorConstants.MDMS_SERVICE_ERROR_MSG);
        }
        return response;
    }

    /**
     * Prepares request for MDMS in order to fetch all the required masters for asset.
     *
     * @param uri
     * @param requestInfo
     * @param tenantId
     * @return
     */
    public MdmsCriteriaReq prepareMDMSRequest(StringBuilder uri, RequestInfo requestInfo, String tenantId) {
        Map<String, List<String>> mapOfModulesAndMasters = new HashMap<>();
        String[] assetMasters = {AssetConstants.ASSET_TYPE_CODE, AssetConstants.ASSET_COUNT_CODE, AssetConstants.BRAND_CODE,
                AssetConstants.SYSTEM_CODE, AssetConstants.WARRANTY_DURATION};
        mapOfModulesAndMasters.put(AssetConstants.ASSET_MODULE_NAME, Arrays.asList(assetMasters));
        List<ModuleDetail> moduleDetails = new ArrayList<>(mapOfModulesAndMasters.entrySet().stream()
                .map(entry -> {
                    ModuleDetail moduleDetail = new ModuleDetail();
                    moduleDetail.setModuleName(entry.getKey());
                    List<MasterDetail> masterDetails = entry.getValue().stream()
                            .map(master -> MasterDetail.builder()
                                    .name(master)
                                    .build())
                            .toList();

                    moduleDetail.setMasterDetails(masterDetails);
                    return moduleDetail;
                })
                .toList());
        uri.append(configuration.getMdmsHost()).append(configuration.getMdmsSearchEndPoint());
        MdmsCriteria mdmsCriteria = MdmsCriteria.builder().tenantId(tenantId).moduleDetails(moduleDetails).build();
        return MdmsCriteriaReq.builder().requestInfo(requestInfo).mdmsCriteria(mdmsCriteria).build();

    }

    /**
     * Fetches active Livelihood ItemCode master data used to validate asset.itemCode.
     */
    @SuppressWarnings("unchecked")
    public List<Map<String, Object>> getLivelihoodItemCodeData(RequestInfo requestInfo, String tenantId) {
        StringBuilder uri = new StringBuilder();
        Map<String, List<String>> mapOfModulesAndMasters = new HashMap<>();
        mapOfModulesAndMasters.put(AssetConstants.LIVELIHOOD_MODULE,
                List.of(AssetConstants.ITEM_CODE_MASTER));

        List<ModuleDetail> moduleDetails = mapOfModulesAndMasters.entrySet().stream()
                .map(entry -> {
                    ModuleDetail moduleDetail = new ModuleDetail();
                    moduleDetail.setModuleName(entry.getKey());
                    List<MasterDetail> masterDetails = entry.getValue().stream()
                            .map(master -> MasterDetail.builder().name(master).build())
                            .toList();
                    moduleDetail.setMasterDetails(masterDetails);
                    return moduleDetail;
                })
                .toList();

        uri.append(configuration.getMdmsHost()).append(configuration.getMdmsSearchEndPoint());
        MdmsCriteria mdmsCriteria = MdmsCriteria.builder().tenantId(tenantId).moduleDetails(moduleDetails).build();
        MdmsCriteriaReq request = MdmsCriteriaReq.builder().requestInfo(requestInfo).mdmsCriteria(mdmsCriteria).build();

        MdmsResponse response;
        try {
            response = restTemplate.postForObject(uri.toString(), request, MdmsResponse.class);
        } catch (Exception e) {
            log.error("Exception while fetching Livelihood ItemCode from MDMS", e);
            throw new CustomException(ErrorConstants.MDMS_SERVICE_ERROR_CODE, ErrorConstants.MDMS_SERVICE_ERROR_MSG);
        }

        if (response == null || CollectionUtils.isEmpty(response.getMdmsRes())) {
            return Collections.emptyList();
        }

        Object moduleData = response.getMdmsRes().get(AssetConstants.LIVELIHOOD_MODULE);
        if (!(moduleData instanceof Map<?, ?> moduleMap)) {
            return Collections.emptyList();
        }

        Object itemCodes = moduleMap.get(AssetConstants.ITEM_CODE_MASTER);
        if (itemCodes instanceof List<?> list) {
            return (List<Map<String, Object>>) list;
        }
        return Collections.emptyList();
    }

    /** Active system type codes (asset-registry.SystemSchema). */
    public Set<String> getSystemCodes(RequestInfo requestInfo, String tenantId) {
        ModuleDetail moduleDetail = new ModuleDetail();
        moduleDetail.setModuleName(AssetConstants.ASSET_MODULE_NAME);
        moduleDetail.setMasterDetails(List.of(MasterDetail.builder().name(AssetConstants.SYSTEM_CODE).build()));
        MdmsCriteria mdmsCriteria = MdmsCriteria.builder().tenantId(tenantId).moduleDetails(List.of(moduleDetail)).build();
        MdmsCriteriaReq request = MdmsCriteriaReq.builder().requestInfo(requestInfo).mdmsCriteria(mdmsCriteria).build();
        String uri = configuration.getMdmsHost() + configuration.getMdmsSearchEndPoint();

        MdmsResponse response;
        try {
            response = restTemplate.postForObject(uri, request, MdmsResponse.class);
        } catch (Exception e) {
            log.error("Exception while fetching the system types from MDMS", e);
            throw new CustomException(ErrorConstants.MDMS_SERVICE_ERROR_CODE, ErrorConstants.MDMS_SERVICE_ERROR_MSG);
        }

        Set<String> codes = new HashSet<>();
        if (response == null || CollectionUtils.isEmpty(response.getMdmsRes())) {
            return codes;
        }
        Object moduleData = response.getMdmsRes().get(AssetConstants.ASSET_MODULE_NAME);
        if (!(moduleData instanceof Map<?, ?> masters) || !(masters.get(AssetConstants.SYSTEM_CODE) instanceof List<?> records)) {
            return codes;
        }
        for (Object record : records) {
            if (record instanceof Map<?, ?> row && row.get("System") instanceof List<?> systems) {
                for (Object item : systems) {
                    if (item instanceof Map<?, ?> system && system.get("code") != null
                            && !Boolean.FALSE.equals(system.get("active"))) {
                        codes.add(String.valueOf(system.get("code")).trim());
                    }
                }
            }
        }
        return codes;
    }

    public String resolveItemCodeDisplayName(RequestInfo requestInfo, String tenantId, String itemCode) {
        if (itemCode == null || itemCode.isBlank()) {
            return null;
        }
        return getLivelihoodItemCodeData(requestInfo, tenantId).stream()
                .filter(row -> itemCode.equalsIgnoreCase(String.valueOf(row.get("code")).trim()))
                .map(row -> row.get("name"))
                .filter(Objects::nonNull)
                .map(String::valueOf)
                .map(String::trim)
                .filter(name -> !name.isEmpty())
                .findFirst()
                .orElse(null);
    }

}