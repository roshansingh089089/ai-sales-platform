package com.roslabs.aisales.task.application;

import com.roslabs.aisales.task.domain.*;
import com.roslabs.aisales.task.infrastructure.TaskRepository;
import jakarta.persistence.EntityNotFoundException;
import java.time.Instant;
import java.util.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class TaskService {
  private final TaskRepository repository;

  public TaskService(TaskRepository r) {
    repository = r;
  }

  @Transactional(readOnly = true)
  public List<Task> list(TaskStatus status, Instant dueBefore) {
    if (status != null && dueBefore != null)
      return repository.findByStatusAndDueAtBeforeOrderByDueAt(status, dueBefore);
    if (status != null) return repository.findByStatusOrderByDueAt(status);
    return repository.findAll();
  }

  @Transactional
  public Task status(UUID id, TaskStatus status) {
    var t =
        repository.findById(id).orElseThrow(() -> new EntityNotFoundException("Task not found"));
    t.setStatus(status);
    return t;
  }
}
