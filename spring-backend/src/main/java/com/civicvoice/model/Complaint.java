package com.civicvoice.model;

import java.util.List;

public class Complaint {
    private String id;
    private String title;
    private String citizenName;
    private String contact;
    private String text;
    private String location;
    private String department;
    private String aiDepartment;
    private String sentiment;
    private String priority;
    private String summary;
    private String status;
    private String createdAt;
    private String updatedAt;
    private List<String> matchedKeywords;
    private List<String> sentimentIndicators;
    private List<String> priorityIndicators;

    public Complaint() {}

    public String getId() { return id; }
    public void setId(String v) { id = v; }

    public String getTitle() { return title; }
    public void setTitle(String v) { title = v; }

    public String getCitizenName() { return citizenName; }
    public void setCitizenName(String v) { citizenName = v; }

    public String getContact() { return contact; }
    public void setContact(String v) { contact = v; }

    public String getText() { return text; }
    public void setText(String v) { text = v; }

    public String getLocation() { return location; }
    public void setLocation(String v) { location = v; }

    public String getDepartment() { return department; }
    public void setDepartment(String v) { department = v; }

    public String getAiDepartment() { return aiDepartment; }
    public void setAiDepartment(String v) { aiDepartment = v; }

    public String getSentiment() { return sentiment; }
    public void setSentiment(String v) { sentiment = v; }

    public String getPriority() { return priority; }
    public void setPriority(String v) { priority = v; }

    public String getSummary() { return summary; }
    public void setSummary(String v) { summary = v; }

    public String getStatus() { return status; }
    public void setStatus(String v) { status = v; }

    public String getCreatedAt() { return createdAt; }
    public void setCreatedAt(String v) { createdAt = v; }

    public String getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(String v) { updatedAt = v; }

    public List<String> getMatchedKeywords() { return matchedKeywords; }
    public void setMatchedKeywords(List<String> v) { matchedKeywords = v; }

    public List<String> getSentimentIndicators() { return sentimentIndicators; }
    public void setSentimentIndicators(List<String> v) { sentimentIndicators = v; }

    public List<String> getPriorityIndicators() { return priorityIndicators; }
    public void setPriorityIndicators(List<String> v) { priorityIndicators = v; }
}
