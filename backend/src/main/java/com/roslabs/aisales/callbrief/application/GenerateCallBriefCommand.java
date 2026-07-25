package com.roslabs.aisales.callbrief.application;

public record GenerateCallBriefCommand(
    String businessName,
    String industry,
    String description,
    String problem,
    String solution,
    String designation) {}
