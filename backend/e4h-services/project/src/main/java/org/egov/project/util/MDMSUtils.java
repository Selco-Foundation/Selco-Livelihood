package org.egov.project.util;

import com.jayway.jsonpath.JsonPath;
import com.jayway.jsonpath.PathNotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.exception.ExceptionUtils;
import org.egov.common.contract.request.RequestInfo;
import org.egov.common.http.client.ServiceRequestClient;
import org.egov.common.models.project.Project;
import org.egov.common.models.project.ProjectRequest;
import org.egov.mdms.model.MasterDetail;
import org.egov.mdms.model.MdmsCriteria;
import org.egov.mdms.model.MdmsCriteriaReq;
import org.egov.mdms.model.ModuleDetail;
import org.egov.project.config.ProjectConfiguration;
import org.egov.tracer.model.CustomException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedList;
import java.util.List;

import static org.egov.project.util.ProjectConstants.*;

@Component
@Slf4j
@RequiredArgsConstructor
public class MDMSUtils {

    public static final String FILTER_CODE = "$.*.code";
    public static final String FILTER_ACTIVE_TRUE = "$.[?(@.active==true)]";
    private final ServiceRequestClient serviceRequestRepository;
    private final ProjectConfiguration config;

    public Object mDMSCall(ProjectRequest request, String tenantId) {
        return fetchMdms(getMDMSRequest(request.getRequestInfo(), tenantId, request));
    }

    /* Returns the prefix of project names, e.g. "JUS" in JUS-98234-1-26-27 */
    public String getJustificationCodePrefix(RequestInfo requestInfo, String tenantId) {
        MasterDetail masterDetail = MasterDetail.builder().name(MASTER_JUSTIFICATION_CODE_PREFIX)
                .filter(FILTER_ACTIVE_TRUE).build();
        ModuleDetail moduleDetail = ModuleDetail.builder().masterDetails(List.of(masterDetail))
                .moduleName(config.getMdmsModule()).build();
        MdmsCriteria mdmsCriteria = MdmsCriteria.builder().moduleDetails(List.of(moduleDetail)).tenantId(tenantId)
                .build();
        Object mdmsData = fetchMdms(MdmsCriteriaReq.builder().mdmsCriteria(mdmsCriteria).requestInfo(requestInfo).build());

        List<String> prefixes;
        try {
            prefixes = JsonPath.read(mdmsData,
                    "$.MdmsRes." + config.getMdmsModule() + "." + MASTER_JUSTIFICATION_CODE_PREFIX + ".*.prefix");
        } catch (PathNotFoundException e) {
            prefixes = List.of();
        }
        if (prefixes.isEmpty()) {
            throw new CustomException("JUSTIFICATION_CODE_PREFIX_NOT_FOUND",
                    "No active justification code prefix configured in MDMS");
        }
        return prefixes.get(0);
    }

    private Object fetchMdms(MdmsCriteriaReq mdmsCriteriaReq) {
        try {
            return serviceRequestRepository.fetchResult(getMdmsSearchUrl(), mdmsCriteriaReq, LinkedHashMap.class);
        } catch (Exception e) {
            log.error("error while calling mdms", ExceptionUtils.getStackTrace(e));
            throw new CustomException("MDMS_ERROR", "error while calling mdms");
        }
    }

    public MdmsCriteriaReq getMDMSRequest(RequestInfo requestInfo, String tenantId, ProjectRequest request) {

        ModuleDetail projectMDMSModuleDetail = getMDMSModuleRequestData(request);
        ModuleDetail projectDepartmentModuleDetail = getDepartmentModuleRequestData(request);
        ModuleDetail projectTypeModuleDetail = getProjectTypeModuleRequestData(request);
        ModuleDetail stateInfoModuleDetail = getStateInfoModuleRequestData(request);
        ModuleDetail projectTenantModuleDetail = getTenantModuleRequestData(request);
        ModuleDetail attendanceModuleDetail = getAttendanceModuleRequestData(request);

        List<ModuleDetail> moduleDetails = new LinkedList<>();
        moduleDetails.add(projectMDMSModuleDetail);
        moduleDetails.add(projectDepartmentModuleDetail);
        moduleDetails.add(projectTypeModuleDetail);
        moduleDetails.add(stateInfoModuleDetail);
        moduleDetails.add(projectTenantModuleDetail);
        moduleDetails.add(attendanceModuleDetail);

        MdmsCriteria mdmsCriteria = MdmsCriteria.builder().moduleDetails(moduleDetails).tenantId(tenantId)
                .build();

        MdmsCriteriaReq mdmsCriteriaReq = MdmsCriteriaReq.builder().mdmsCriteria(mdmsCriteria)
                .requestInfo(requestInfo).build();
        return mdmsCriteriaReq;
    }

    private ModuleDetail getMDMSModuleRequestData(ProjectRequest request) {
        List<MasterDetail> projectMDMSMasterDetails = new ArrayList<>();

        MasterDetail projectTypeMasterDetails = MasterDetail.builder().name(MASTER_PROJECTTYPE)
                .filter(FILTER_ACTIVE_TRUE)
                .build();
        MasterDetail natureOfWorkMasterDetails = MasterDetail.builder().name(MASTER_NATUREOFWORK)
                .filter(FILTER_ACTIVE_TRUE)
                .build();
        projectMDMSMasterDetails.add(projectTypeMasterDetails);
        projectMDMSMasterDetails.add(natureOfWorkMasterDetails);


        ModuleDetail projectMDMSModuleDetail = ModuleDetail.builder().masterDetails(projectMDMSMasterDetails)
                .moduleName(config.getMdmsModule()).build();

        return projectMDMSModuleDetail;
    }

    private ModuleDetail getDepartmentModuleRequestData(ProjectRequest request) {
        List<Project> projects = request.getProjects();
        List<MasterDetail> projectDepartmentMasterDetails = new ArrayList<>();

        MasterDetail departmentMasterDetails = MasterDetail.builder().name(MASTER_DEPARTMENT)
                .filter(FILTER_ACTIVE_TRUE).build();
        projectDepartmentMasterDetails.add(departmentMasterDetails);

        ModuleDetail projectDepartmentModuleDetail = ModuleDetail.builder().masterDetails(projectDepartmentMasterDetails)
                .moduleName(MDMS_COMMON_MASTERS_MODULE_NAME).build();

        return projectDepartmentModuleDetail;
    }

    public StringBuilder getMdmsSearchUrl() {
        return new StringBuilder().append(config.getMdmsHost()).append(config.getMdmsEndPoint());
    }

    private ModuleDetail getTenantModuleRequestData(ProjectRequest request) {
        List<MasterDetail> tenantMasterDetails = new ArrayList<>();

        MasterDetail tenantMasterDetail = MasterDetail.builder().name(MASTER_TENANTS)
                .filter(FILTER_CODE).build();

        tenantMasterDetails.add(tenantMasterDetail);

        ModuleDetail tenantModuleDetail = ModuleDetail.builder().masterDetails(tenantMasterDetails)
                .moduleName(MDMS_TENANT_MODULE_NAME).build();

        return tenantModuleDetail;
    }

    private ModuleDetail getAttendanceModuleRequestData(ProjectRequest request) {
        List<MasterDetail> attendanceMasterDetails = new ArrayList<>();

        MasterDetail attendanceSessionsMasterDetails = MasterDetail.builder().name(MASTER_ATTENDANCE_SESSION)
                .filter(FILTER_CODE)
                .build();

        attendanceMasterDetails.add(attendanceSessionsMasterDetails);

        ModuleDetail attendanceModuleDetail = ModuleDetail.builder().masterDetails(attendanceMasterDetails)
                .moduleName(MDMS_HCM_ATTENDANCE_MODULE_NAME).build();

        return attendanceModuleDetail;
    }

    private ModuleDetail getProjectTypeModuleRequestData(ProjectRequest request) {
        List<Project> projects = request.getProjects();
        List<MasterDetail> projectDepartmentMasterDetails = new ArrayList<>();

        MasterDetail departmentMasterDetails = MasterDetail.builder().name(MASTER_PROJECTTYPE)
                .filter(FILTER_ACTIVE_TRUE).build();
        projectDepartmentMasterDetails.add(departmentMasterDetails);

        ModuleDetail projectDepartmentModuleDetail = ModuleDetail.builder().masterDetails(projectDepartmentMasterDetails)
                .moduleName(MDMS_COMMON_MASTERS_MODULE_NAME).build();

        return projectDepartmentModuleDetail;
    }

    private ModuleDetail getStateInfoModuleRequestData(ProjectRequest request) {
        List<Project> projects = request.getProjects();
        List<MasterDetail> projectDepartmentMasterDetails = new ArrayList<>();

        MasterDetail departmentMasterDetails = MasterDetail.builder().name(MASTER_STATEINFO)
                .filter(FILTER_ACTIVE_TRUE).build();
        projectDepartmentMasterDetails.add(departmentMasterDetails);

        ModuleDetail projectDepartmentModuleDetail = ModuleDetail.builder().masterDetails(projectDepartmentMasterDetails)
                .moduleName(MDMS_COMMON_MASTERS_MODULE_NAME).build();

        return projectDepartmentModuleDetail;
    }

}