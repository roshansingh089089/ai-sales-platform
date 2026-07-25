package com.roslabs.aisales.task.domain;

import com.roslabs.aisales.business.domain.Business;
import com.roslabs.aisales.callactivity.domain.CallActivity;
import com.roslabs.aisales.contact.domain.Contact;
import com.roslabs.aisales.shared.domain.AuditableEntity;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;

@Entity
@Table(name = "tasks")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Task extends AuditableEntity {
  @ManyToOne(fetch = FetchType.LAZY, optional = false)
  private Business business;

  @ManyToOne(fetch = FetchType.LAZY)
  private Contact contact;

  @ManyToOne(fetch = FetchType.LAZY)
  private CallActivity callActivity;

  @Column(nullable = false)
  private String title;

  @Column(columnDefinition = "text")
  private String description;

  @Column(nullable = false)
  private Instant dueAt;

  @Enumerated(EnumType.STRING)
  private TaskPriority priority;

  @Enumerated(EnumType.STRING)
  private TaskStatus status;

  public Task(
      Business b,
      Contact c,
      CallActivity a,
      String title,
      String description,
      Instant dueAt,
      TaskPriority priority) {
    business = b;
    contact = c;
    callActivity = a;
    this.title = title;
    this.description = description;
    this.dueAt = dueAt;
    this.priority = priority;
    status = TaskStatus.OPEN;
  }

  public void setStatus(TaskStatus status) {
    this.status = status;
  }
}
