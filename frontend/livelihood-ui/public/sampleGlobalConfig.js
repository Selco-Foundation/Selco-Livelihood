var globalConfigs = (function () {
  var stateTenantId = "in";
  var gmaps_api_key = "";
  var contextPath = "livelihood-ui";
  var configModuleName = "commonUiConfig";
  var centralInstanceEnabled = false;
  var localeRegion = "IN";
  var localeDefault = "en";
  var mdmsContextV1 = "egov-mdms-service";
  var mdmsContextV2 = "mdms-v2";
  var footerBWLogoURL = "";
  var footerLogoURL = "";
  var digitHomeURL = "https://www.digit.org/";
  var assetS3Bucket = "";
  var invalidEmployeeRoles = [];
  var jwtToken = "ZWdvdi11c2VyLWNsaWVudDo=";

  var getConfig = function (key) {
    if (key === "STATE_LEVEL_TENANT_ID") {
      return stateTenantId;
    }
    if (key === "GMAPS_API_KEY") {
      return gmaps_api_key;
    }
    if (key === "ENABLE_SINGLEINSTANCE") {
      return centralInstanceEnabled;
    }
    if (key === "DIGIT_FOOTER_BW") {
      return footerBWLogoURL;
    }
    if (key === "DIGIT_FOOTER") {
      return footerLogoURL;
    }
    if (key === "DIGIT_HOME_URL") {
      return digitHomeURL;
    }
    if (key === "S3BUCKET") {
      return assetS3Bucket;
    }
    if (key === "CONTEXT_PATH") {
      return contextPath;
    }
    if (key === "UICONFIG_MODULENAME") {
      return configModuleName;
    }
    if (key === "LOCALE_REGION") {
      return localeRegion;
    }
    if (key === "LOCALE_DEFAULT") {
      return localeDefault;
    }
    if (key === "MDMS_V1_CONTEXT_PATH") {
      return mdmsContextV1;
    }
    if (key === "MDMS_V2_CONTEXT_PATH") {
      return mdmsContextV2;
    }
    if (key === "INVALIDROLES") {
      return invalidEmployeeRoles;
    }
    if (key === "JWT_TOKEN") {
      return jwtToken;
    }
  };

  return {
    getConfig,
  };
})();
