package com.civicvoice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class ComplaintRequest {
    @NotBlank(message = "Title is required")
    @Size(min = 5, max = 150, message = "Title must be between 5 and 150 characters")
    private String title;

    private String citizenName;

    private String contact;

    @NotBlank(message = "Complaint description is required")
    @Size(min = 20, max = 2000, message = "Description must be between 20 and 2000 characters")
    private String text;

    @NotBlank(message = "Location is required")
    private String location;

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
}
