package com.roslabs.aisales.task.infrastructure;

import com.roslabs.aisales.task.domain.*;
import java.time.Instant;
import java.util.*;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, UUID> {
  List<Task> findByStatusAndDueAtBeforeOrderByDueAt(TaskStatus status, Instant dueAt);

  List<Task> findByStatusOrderByDueAt(TaskStatus status);
}
