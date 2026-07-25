package com.roslabs.aisales.contact.api;

import com.roslabs.aisales.contact.application.ContactService;
import com.roslabs.aisales.contact.domain.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.time.Instant;
import java.util.*;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1")
public class ContactController {
  private final ContactService service;

  public ContactController(ContactService s) {
    service = s;
  }

  public record Request(
      @NotBlank String firstName,
      String lastName,
      String designation,
      @Pattern(
              regexp = "^$|^\\+?[0-9]{7,15}$",
              message = "must be a plausible international phone number")
          String phoneNumber,
      @Email String email,
      PreferredContactMethod preferredContactMethod,
      boolean doNotContact,
      String notes) {}

  public record Response(
      UUID id,
      UUID businessId,
      String firstName,
      String lastName,
      String fullName,
      String designation,
      String phoneNumber,
      String email,
      String preferredContactMethod,
      boolean doNotContact,
      String notes,
      Instant createdAt,
      Instant updatedAt,
      long version) {}

  public record ManualCall(
      UUID contactId,
      String contactName,
      String phoneNumber,
      String callUri,
      boolean allowed,
      String blockedReason) {}

  @PostMapping("/businesses/{businessId}/contacts")
  ResponseEntity<Response> create(@PathVariable UUID businessId, @Valid @RequestBody Request r) {
    return ResponseEntity.status(201)
        .body(
            map(
                service.create(
                    businessId,
                    r.firstName,
                    r.lastName,
                    r.designation,
                    r.phoneNumber,
                    r.email,
                    value(r.preferredContactMethod),
                    r.notes)));
  }

  @GetMapping("/businesses/{businessId}/contacts")
  List<Response> list(@PathVariable UUID businessId) {
    return service.list(businessId).stream().map(this::map).toList();
  }

  @PutMapping("/contacts/{id}")
  Response update(@PathVariable UUID id, @Valid @RequestBody Request r) {
    return map(
        service.update(
            id,
            r.firstName,
            r.lastName,
            r.designation,
            r.phoneNumber,
            r.email,
            value(r.preferredContactMethod),
            r.doNotContact,
            r.notes));
  }

  @GetMapping("/contacts/{id}/manual-call")
  ManualCall manual(@PathVariable UUID id) {
    var c = service.get(id);
    if (c.isDoNotContact())
      return new ManualCall(
          id,
          c.fullName(),
          c.getPhoneNumber(),
          null,
          false,
          "Contact has requested no further contact");
    if (c.getPhoneNumber() == null || c.getPhoneNumber().isBlank())
      return new ManualCall(id, c.fullName(), null, null, false, "Contact has no phone number");
    return new ManualCall(
        id, c.fullName(), c.getPhoneNumber(), "tel:" + c.getPhoneNumber(), true, null);
  }

  private PreferredContactMethod value(PreferredContactMethod m) {
    return m == null ? PreferredContactMethod.UNKNOWN : m;
  }

  private Response map(Contact c) {
    return new Response(
        c.getId(),
        c.getBusiness().getId(),
        c.getFirstName(),
        c.getLastName(),
        c.fullName(),
        c.getDesignation(),
        c.getPhoneNumber(),
        c.getEmail(),
        c.getPreferredContactMethod().name(),
        c.isDoNotContact(),
        c.getNotes(),
        c.getCreatedAt(),
        c.getUpdatedAt(),
        c.getVersion());
  }
}
