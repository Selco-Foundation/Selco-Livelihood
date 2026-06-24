package org.egov.asset.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import com.fasterxml.jackson.databind.node.NullNode;
import org.egov.asset.repository.ServiceRequestRepository;
import org.egov.asset.web.models.boundary.Boundary;
import org.egov.asset.web.models.boundary.BoundaryCreateRequest;
import org.egov.asset.web.models.boundary.BoundaryRelation;
import org.egov.asset.web.models.boundary.BoundaryRelationshipRequest;
import org.egov.common.contract.request.RequestInfo;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.List;
import java.util.Map;

@Service
@Slf4j
@RequiredArgsConstructor
public class AssetBoundaryService {

    private final ServiceRequestRepository serviceRequestRepository;

    @Value("${egov.boundary.host}")
    private String boundaryHost;

    @Value("${egov.boundary.create.path:/boundary-service/boundary/_create}")
    private String boundaryCreatePath;

    @Value("${egov.boundary.relationship.create.path:/boundary-service/boundary-relationships/_create}")
    private String boundaryRelationshipCreatePath;

    @Value("${egov.boundary.hierarchy.type:SELCO}")
    private String hierarchyType;

    public void createAssetBoundary(
            RequestInfo requestInfo,
            String tenantId,
            String assetBoundaryCode,
            String facilityBoundaryCode
    ) {
        log.info("Creating asset boundary {} under facility boundary {}", assetBoundaryCode, facilityBoundaryCode);

        BoundaryCreateRequest boundaryCreateRequest = BoundaryCreateRequest.builder()
                .requestInfo(requestInfo)
                .boundary(List.of(
                        Boundary.builder()
                                .tenantId(tenantId)
                                .code(assetBoundaryCode)
                                .geometry(NullNode.getInstance())
                                .build()
                ))
                .build();
        post(boundaryCreatePath, boundaryCreateRequest);

        BoundaryRelationshipRequest relationshipRequest = BoundaryRelationshipRequest.builder()
                .requestInfo(requestInfo)
                .boundaryRelationship(
                        BoundaryRelation.builder()
                                .tenantId(tenantId)
                                .boundaryType("Asset")
                                .code(assetBoundaryCode)
                                .parent(facilityBoundaryCode)
                                .hierarchyType(hierarchyType)
                                .build()
                )
                .build();
        post(boundaryRelationshipCreatePath, relationshipRequest);
    }

    private void post(String path, Object request) {
        String uri = UriComponentsBuilder
                .fromUriString(boundaryHost)
                .path(path)
                .toUriString();
        serviceRequestRepository.fetchResult(new StringBuilder(uri), request, Map.class);
    }
}
