package com.civicvoice.controller;

import com.civicvoice.dto.ComplaintRequest;
import com.civicvoice.model.Complaint;
import com.civicvoice.service.ComplaintService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ComplaintController {

    private final ComplaintService service;

    public ComplaintController(ComplaintService service) {
        this.service = service;
    }

    @GetMapping("/health")
    public Map<String, String> health() {
        return Map.of("status", "ok", "service", "civicvoice-backend");
    }

    @GetMapping("/complaints")
    public List<Complaint> all() {
        return service.all();
    }

    @GetMapping("/complaints/{id}")
    public ResponseEntity<Complaint> get(@PathVariable String id) {
        return service.find(id)
            .map(ResponseEntity::ok)
            .orElse(ResponseEntity.notFound().build());
    }

    @PostMapping("/complaints")
    public ResponseEntity<Complaint> create(@Valid @RequestBody ComplaintRequest request) {
        Complaint created = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    @PutMapping("/complaints/{id}/status")
    public ResponseEntity<Complaint> updateStatus(
            @PathVariable String id,
            @RequestBody Map<String, String> body) {
        String status = body.getOrDefault("status", "");
        Complaint updated = service.updateStatus(id, status);
        return ResponseEntity.ok(updated);
    }

    @GetMapping("/dashboard/stats")
    public Map<String, Object> stats() {
        return service.stats();
    }
}
