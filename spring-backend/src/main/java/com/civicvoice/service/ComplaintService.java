package com.civicvoice.service;

import com.civicvoice.dto.ComplaintRequest;
import com.civicvoice.model.Complaint;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDate;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class ComplaintService {

    private static final Logger log = LoggerFactory.getLogger(ComplaintService.class);

    private final List<Complaint> complaints = new ArrayList<>();
    private final AtomicInteger sequence = new AtomicInteger(1000);
    private final RestClient restClient = RestClient.builder().build();
    private final String flaskUrl;

    private static final Set<String> VALID_STATUSES = Set.of("Pending", "In Progress", "Resolved");

    public ComplaintService(@Value("${flask.nlp.url:http://localhost:5001/analyze}") String flaskUrl) {
        this.flaskUrl = flaskUrl;
        seed();
    }

    // ─── Seed Data ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private void seed() {
        Object[][] data = {
            {"CV-1001", "Pothole damage near school entrance", "Large potholes on the main road are causing accidents near the school zone. Multiple vehicles have been damaged.", "Roads", "Negative", "High", "Pending", "Ward 4", "2026-08-25", List.of("pothole", "road"), List.of("damaged", "accidents"), List.of("danger", "accident")},
            {"CV-1002", "Water pipeline leakage outside residential building", "Water leakage has continued for three days outside our building. Large puddles are forming causing waterlogging.", "Water Supply", "Negative", "High", "In Progress", "Ward 2", "2026-08-24", List.of("water", "leakage", "pipeline"), List.of("leakage", "bad"), List.of()},
            {"CV-1003", "Regular garbage collection improved", "Garbage collection is regular now. Thank you for the improvement in our area.", "Garbage/Waste Management", "Positive", "Low", "Resolved", "Ward 1", "2026-08-23", List.of("garbage"), List.of("thank", "improved"), List.of()},
            {"CV-1004", "Street lights not working behind market", "Street lights are not working on the lane behind the main market. The area is completely dark after 7 PM.", "Streetlights", "Negative", "Medium", "Pending", "Ward 3", "2026-08-22", List.of("street light", "streetlight"), List.of("not working", "poor"), List.of()},
            {"CV-1005", "Power outage since last night", "No electricity since last night in our area. Essential appliances are not working. Please restore power urgently.", "Electricity", "Negative", "High", "Resolved", "Ward 5", "2026-08-21", List.of("electricity", "power"), List.of("not working", "urgent"), List.of("emergency", "unsafe")},
            {"CV-1006", "Blocked drain causing flooding near bus stop", "Drain is blocked and rainwater is collecting near the bus stop causing waterlogging. Pedestrians are unable to pass.", "Drainage", "Negative", "High", "In Progress", "Ward 6", "2026-08-20", List.of("drain", "flooding", "waterlogging"), List.of("overflow", "bad"), List.of("flood")},
            {"CV-1007", "Public park well maintained — appreciation", "The public park on sector 7 is clean and well maintained. Residents are very happy.", "Sanitation", "Positive", "Low", "Resolved", "Ward 2", "2026-08-19", List.of("sanitation"), List.of("clean", "happy"), List.of()},
            {"CV-1008", "Overflowing dustbins throughout the street", "Dustbins are overflowing for a week on our street. The garbage is spreading on the road causing health hazards.", "Garbage/Waste Management", "Negative", "Medium", "Pending", "Ward 7", "2026-08-18", List.of("dustbin", "garbage", "waste"), List.of("overflow", "bad"), List.of()},
            {"CV-1009", "Broken road surface causing accidents", "The road surface near the flyover is completely broken. Two-wheelers are skidding and accidents are frequent.", "Roads", "Negative", "High", "In Progress", "Ward 8", "2026-08-17", List.of("road", "crack"), List.of("broken", "poor"), List.of("accident", "danger")},
            {"CV-1010", "Exposed electrical wire near children's school", "There is an exposed electrical wire hanging low near the school gate. This is extremely dangerous for children.", "Electricity", "Negative", "High", "Pending", "Ward 3", "2026-08-16", List.of("wire", "electricity"), List.of("dangerous", "poor"), List.of("exposed wire", "unsafe", "danger")}
        };

        for (Object[] d : data) {
            Complaint c = new Complaint();
            c.setId((String) d[0]);
            c.setTitle((String) d[1]);
            c.setText((String) d[2]);
            c.setDepartment((String) d[3]);
            c.setAiDepartment((String) d[3]);
            c.setSentiment((String) d[4]);
            c.setPriority((String) d[5]);
            c.setStatus((String) d[6]);
            c.setLocation((String) d[7]);
            c.setCreatedAt((String) d[8]);
            c.setUpdatedAt((String) d[8]);
            c.setSummary(buildSummary((String) d[2]));
            c.setMatchedKeywords((List<String>) d[9]);
            c.setSentimentIndicators((List<String>) d[10]);
            c.setPriorityIndicators((List<String>) d[11]);
            complaints.add(c);
        }
    }

    private String buildSummary(String text) {
        String[] words = text.trim().split("\\s+");
        String joined = String.join(" ", Arrays.copyOf(words, Math.min(words.length, 18)));
        return words.length > 18 ? joined + "..." : joined;
    }

    // ─── CRUD ────────────────────────────────────────────────────────────────

    public synchronized List<Complaint> all() {
        return new ArrayList<>(complaints);
    }

    public synchronized Optional<Complaint> find(String id) {
        return complaints.stream().filter(c -> c.getId().equals(id)).findFirst();
    }

    @SuppressWarnings("unchecked")
    public synchronized Complaint create(ComplaintRequest request) {
        Map<String, Object> analysis = null;
        try {
            analysis = restClient.post()
                .uri(flaskUrl)
                .body(Map.of("text", request.getText()))
                .retrieve()
                .body(Map.class);
            log.info("NLP analysis completed for new complaint");
        } catch (Exception e) {
            log.warn("Flask NLP service unavailable, using defaults: {}", e.getMessage());
        }

        Complaint c = new Complaint();
        c.setId("CV-" + sequence.incrementAndGet());
        c.setTitle(request.getTitle());
        c.setCitizenName(request.getCitizenName());
        c.setContact(request.getContact());
        c.setText(request.getText());
        c.setLocation(request.getLocation());
        c.setStatus("Pending");
        c.setCreatedAt(LocalDate.now().toString());
        c.setUpdatedAt(LocalDate.now().toString());

        if (analysis == null) {
            c.setDepartment("Other");
            c.setAiDepartment("Other");
            c.setSentiment("Neutral");
            c.setPriority("Low");
            c.setSummary(buildSummary(request.getText()));
            c.setMatchedKeywords(List.of());
            c.setSentimentIndicators(List.of());
            c.setPriorityIndicators(List.of());
        } else {
            String dept = String.valueOf(analysis.getOrDefault("department", "Other"));
            c.setDepartment(dept);
            c.setAiDepartment(dept);
            c.setSentiment(String.valueOf(analysis.getOrDefault("sentiment", "Neutral")));
            c.setPriority(String.valueOf(analysis.getOrDefault("priority", "Low")));
            c.setSummary(String.valueOf(analysis.getOrDefault("summary", buildSummary(request.getText()))));
            c.setMatchedKeywords(toStringList(analysis.get("matched_keywords")));
            c.setSentimentIndicators(toStringList(analysis.get("sentiment_indicators")));
            c.setPriorityIndicators(toStringList(analysis.get("priority_indicators")));
        }

        complaints.add(0, c);
        return c;
    }

    public synchronized Complaint updateStatus(String id, String status) {
        if (!VALID_STATUSES.contains(status)) {
            throw new IllegalArgumentException("Invalid status. Allowed values: Pending, In Progress, Resolved");
        }
        return find(id).map(c -> {
            c.setStatus(status);
            c.setUpdatedAt(LocalDate.now().toString());
            log.info("Complaint {} status updated to {}", id, status);
            return c;
        }).orElseThrow(() -> new NoSuchElementException("Complaint not found: " + id));
    }

    // ─── Analytics ────────────────────────────────────────────────────────────

    public synchronized Map<String, Object> stats() {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("total", complaints.size());
        m.put("pending", complaints.stream().filter(c -> "Pending".equals(c.getStatus())).count());
        m.put("inProgress", complaints.stream().filter(c -> "In Progress".equals(c.getStatus())).count());
        m.put("resolved", complaints.stream().filter(c -> "Resolved".equals(c.getStatus())).count());
        m.put("highPriority", complaints.stream().filter(c -> "High".equals(c.getPriority())).count());

        // Department breakdown
        Map<String, Long> byDept = complaints.stream()
            .collect(Collectors.groupingBy(c -> c.getDepartment() != null ? c.getDepartment() : "Other", Collectors.counting()));
        m.put("byDepartment", byDept);

        // Sentiment breakdown
        Map<String, Long> bySentiment = complaints.stream()
            .collect(Collectors.groupingBy(c -> c.getSentiment() != null ? c.getSentiment() : "Neutral", Collectors.counting()));
        m.put("bySentiment", bySentiment);

        // Priority breakdown
        Map<String, Long> byPriority = complaints.stream()
            .collect(Collectors.groupingBy(c -> c.getPriority() != null ? c.getPriority() : "Low", Collectors.counting()));
        m.put("byPriority", byPriority);

        // Status breakdown
        Map<String, Long> byStatus = complaints.stream()
            .collect(Collectors.groupingBy(c -> c.getStatus() != null ? c.getStatus() : "Pending", Collectors.counting()));
        m.put("byStatus", byStatus);

        // Recent 5 complaints
        m.put("recent", complaints.stream().limit(5).collect(Collectors.toList()));

        return m;
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    @SuppressWarnings("unchecked")
    private List<String> toStringList(Object obj) {
        if (obj instanceof List) {
            return ((List<?>) obj).stream().map(Object::toString).collect(Collectors.toList());
        }
        return List.of();
    }
}
