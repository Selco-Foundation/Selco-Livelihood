package org.egov.im.util;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.springframework.util.StreamUtils;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * Loads Livelihood email templates from {@code classpath:templates/livelihood/{templateCode}.html}.
 * Each file's {@code <title>} holds the subject line; everything else is the body — the two are
 * parsed apart once and cached, so the subject text is never left behind in the body. Templates are
 * HTML and too large/structured to live in {@code egov-localization} or as Java string constants.
 */
@Component
@Slf4j
public class LivelihoodEmailTemplateLoader {

    private static final String TEMPLATE_PATH_FORMAT = "templates/livelihood/%s.html";
    private static final Pattern TITLE_PATTERN =
            Pattern.compile("<title>(.*?)</title>", Pattern.CASE_INSENSITIVE | Pattern.DOTALL);

    private final Map<String, EmailTemplate> cache = new ConcurrentHashMap<>();

    public String getSubject(String templateCode) {
        EmailTemplate template = cache.computeIfAbsent(templateCode, this::readTemplate);
        return template != null ? template.subject() : null;
    }

    public String getBody(String templateCode) {
        EmailTemplate template = cache.computeIfAbsent(templateCode, this::readTemplate);
        return template != null ? template.body() : null;
    }

    private EmailTemplate readTemplate(String templateCode) {
        String path = String.format(TEMPLATE_PATH_FORMAT, templateCode);
        String raw;
        try (InputStream in = new ClassPathResource(path).getInputStream()) {
            raw = StreamUtils.copyToString(in, StandardCharsets.UTF_8);
        } catch (IOException e) {
            log.error("Missing Livelihood email template file: {}", path, e);
            return null;
        }
        Matcher matcher = TITLE_PATTERN.matcher(raw);
        String subject = matcher.find() ? matcher.group(1).trim() : null;
        if (subject == null) {
            log.warn("Livelihood email template {} has no <title> subject", templateCode);
        }
        // Strip the whole <title>...</title> tag out of what becomes the body, so the subject
        // text is never sent twice.
        String body = matcher.replaceFirst("").trim();
        return new EmailTemplate(subject, body);
    }

    private record EmailTemplate(String subject, String body) {
    }
}
