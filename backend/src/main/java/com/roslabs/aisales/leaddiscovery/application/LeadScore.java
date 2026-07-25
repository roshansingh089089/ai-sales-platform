package com.roslabs.aisales.leaddiscovery.application;

import java.util.List;

public record LeadScore(int score, Qualification qualification, List<String> reasons) {}
