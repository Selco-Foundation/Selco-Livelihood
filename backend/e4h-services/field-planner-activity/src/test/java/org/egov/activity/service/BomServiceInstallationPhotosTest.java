package org.egov.activity.service;

import org.egov.activity.web.models.BomPdfDocument;
import org.egov.activity.web.models.InstallationImageMaster;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;

class BomServiceInstallationPhotosTest {

    private static InstallationImageMaster image(String code, String description, String shortTitle) {
        return InstallationImageMaster.builder().code(code).description(description).shortTitle(shortTitle).active(true).build();
    }

    private static Map<String, Object> upload(String documentType, String fileStoreId) {
        return Map.of("documentType", documentType, "fileStoreId", fileStoreId);
    }

    @Test
    void groupsUploadsByQuestionCodeWithDescriptionsAndKeepsThePositionalEntries() {
        List<InstallationImageMaster> images = List.of(
                image("5", "Clear image of cable routing.", "Cable Routing"),
                image("18", "Clear image of GIPB.", null),
                image("15", "RMS site photo with geotagging.", "RMS Site Photo (Geotag)"));
        List<Map<String, Object>> uploads = List.of(
                upload("INSTALLATION_IMAGE-5", "a"),
                upload("INSTALLATION_IMAGE-18", "b"),
                upload("INSTALLATION_IMAGE-5", "c"),
                upload("INSTALLATION_IMAGE-99", "ignored"),
                upload("INSTALLATION_IMAGE-1", "not a question here"));

        List<BomPdfDocument> grouped = BomService.groupInstallationPhotos(images, uploads);

        assertEquals(List.of("INSTALLATION_PHOTO-5", "INSTALLATION_PHOTO-18", "INSTALLATION_PHOTO-15",
                        "INSTALLATION_IMAGE-1", "INSTALLATION_IMAGE-2", "INSTALLATION_IMAGE-3"),
                grouped.stream().map(BomPdfDocument::getDocumentType).toList());
        // By code: the full description even when a short title exists (QA); an unanswered question keeps an empty list.
        assertEquals(List.of("Clear image of cable routing.", "Clear image of GIPB.", "RMS site photo with geotagging."),
                grouped.subList(0, 3).stream().map(BomPdfDocument::getDocumentName).toList());
        assertEquals(List.of("a", "c"), grouped.get(0).getFileStoreIds());
        assertEquals(List.of("b"), grouped.get(1).getFileStoreIds());
        assertEquals(List.of(), grouped.get(2).getFileStoreIds());
        // By position: unchanged for the older layouts (description as the title, same photos).
        assertEquals("Clear image of cable routing.", grouped.get(3).getDocumentName());
        assertEquals(List.of("a", "c"), grouped.get(3).getFileStoreIds());
        assertEquals(List.of("b"), grouped.get(4).getFileStoreIds());
    }

    @Test
    void noQuestionsGiveNoEntries() {
        assertEquals(List.of(), BomService.groupInstallationPhotos(List.of(), List.of(upload("INSTALLATION_IMAGE-1", "a"))));
    }
}
