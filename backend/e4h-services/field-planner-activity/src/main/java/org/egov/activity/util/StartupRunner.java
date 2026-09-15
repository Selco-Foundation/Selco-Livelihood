package org.egov.activity.util;

import lombok.extern.slf4j.Slf4j;
import org.egov.activity.config.ActivityConfiguration;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.HashMap;
import java.util.Map;

@Component
@Slf4j
public class StartupRunner implements CommandLineRunner {

    private final ActivityConfiguration activityConfiguration;
    private final Map<String, String> configMap = new HashMap<>();

    public StartupRunner(ActivityConfiguration activityConfiguration) {
        this.activityConfiguration = activityConfiguration;
    }

    @Override
    public void run(String... args) throws Exception {
        log.info("Application started - BOM configuration loaded");
        configMap.put("202526PASF0000104", activityConfiguration.getIccreportTextileLighting());
        configMap.put("202526PASF0000379", activityConfiguration.getIccreportPulverizer());
        configMap.put("202526PASF0000540", activityConfiguration.getIccreportPrinter());
        configMap.put("202526PASF0000135", activityConfiguration.getIccreportSewingMachine());
        configMap.put("202526PASF0000214", activityConfiguration.getIccreportLskLaptop());
        configMap.put("202526PASF0000141", activityConfiguration.getIccreportEriSpinning());
        configMap.put("202526PASF0000382", activityConfiguration.getIccreportPaddyIntegratedProcessing());
        configMap.put("202526PASF0000395", activityConfiguration.getIccreportMultiStageProcessingMillet());
        configMap.put("202526PASF0000248", activityConfiguration.getIccreportRefrigerator());
        configMap.put("202526PASF0000387", activityConfiguration.getIccreportMultiStageProcessing());
        configMap.put("202526PASF0000460", activityConfiguration.getIccreportTextileLighting());
        configMap.put("202526PASF0000317", activityConfiguration.getIccreportRoaster());
        configMap.put("202526PASF0000371", activityConfiguration.getIccreportRiceHuller());
        configMap.put("202526PASF0000390", activityConfiguration.getIccreportOilMill());

        // MACHINE-component installation reports use a fixed template, not a solution-specific one.
        configMap.put("MACHINE", activityConfiguration.getMachineInstallationReportKey());
    }

    public Map<String, String> getConfigMap() {
        return configMap;
    }
}

