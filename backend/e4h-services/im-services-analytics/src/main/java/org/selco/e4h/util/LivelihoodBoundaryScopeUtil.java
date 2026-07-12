package org.selco.e4h.util;

import org.springframework.util.StringUtils;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

import static org.selco.e4h.util.IMConstants.ROLE_LIVELIHOOD_POC;

public final class LivelihoodBoundaryScopeUtil {

    private LivelihoodBoundaryScopeUtil() {}

    public static List<String> toBoundaryPrefixes(List<String> stateBoundaryCodes) {
        if (stateBoundaryCodes == null || stateBoundaryCodes.isEmpty()) {
            return Collections.emptyList();
        }
        return stateBoundaryCodes.stream()
                .map(LivelihoodBoundaryScopeUtil::toEsStateCode)
                .filter(StringUtils::hasText)
                .distinct()
                .collect(Collectors.toList());
    }

    public static String toEsStateCode(String boundaryCode) {
        String code = toStateBoundaryCode(boundaryCode);
        return StringUtils.hasText(code) ? code.toUpperCase(Locale.ROOT) : code;
    }

    public static String toStateBoundaryCode(String boundaryCode) {
        if (!StringUtils.hasText(boundaryCode)) {
            return boundaryCode;
        }
        String normalized = boundaryCode.trim().replace('.', '_');
        List<String> segments = Arrays.stream(normalized.split("_"))
                .filter(StringUtils::hasText)
                .collect(Collectors.toList());
        if (segments.size() >= 2) {
            return segments.get(0) + "_" + segments.get(1);
        }
        return normalized;
    }

    public static String resolveBoundaryForHrmsRole(String role, String boundaryCode) {
        if (!StringUtils.hasText(boundaryCode) || !ROLE_LIVELIHOOD_POC.equals(role)) {
            return boundaryCode;
        }
        return toStateBoundaryCode(boundaryCode);
    }
}
