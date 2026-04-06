package com.gyansthal.backend.config;

import com.gyansthal.backend.service.PasswordHashService;
import com.gyansthal.backend.support.DocumentUtils;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.IndexOptions;
import com.mongodb.client.model.Indexes;
import com.mongodb.client.model.UpdateOptions;
import com.mongodb.client.model.Updates;
import java.util.Date;
import java.util.List;
import org.bson.Document;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class MongoBootstrap implements ApplicationRunner {

    private final MongoSupport mongoSupport;
    private final AppProperties appProperties;
    private final PasswordHashService passwordHashService;

    public MongoBootstrap(
            MongoSupport mongoSupport,
            AppProperties appProperties,
            PasswordHashService passwordHashService
    ) {
        this.mongoSupport = mongoSupport;
        this.appProperties = appProperties;
        this.passwordHashService = passwordHashService;
    }

    @Override
    public void run(org.springframework.boot.ApplicationArguments args) {
        ensureIndexes();
        ensureSettings();
        ensureAdminUser();
    }

    private void ensureIndexes() {
        mongoSupport.collection("users").createIndex(Indexes.ascending("email"), new IndexOptions().unique(true));
        mongoSupport.collection("students").createIndex(Indexes.ascending("mobile"), new IndexOptions().unique(true));
        mongoSupport.collection("students").createIndex(Indexes.compoundIndex(
                Indexes.ascending("shift_id"),
                Indexes.ascending("seat_number")
        ));
        mongoSupport.collection("payments").createIndex(Indexes.ascending("receipt_number"), new IndexOptions().unique(true));
        mongoSupport.collection("payments").createIndex(Indexes.compoundIndex(
                Indexes.ascending("student_id"),
                Indexes.ascending("billing_month")
        ));

        MongoCollection<Document> seatAssignments = mongoSupport.collection("seat_assignments");
        try {
            seatAssignments.dropIndex("shift_id_1_seat_number_1_assignment_status_1");
        } catch (Exception ignored) {
        }
        seatAssignments.createIndex(
                Indexes.compoundIndex(Indexes.ascending("shift_id"), Indexes.ascending("seat_number")),
                new IndexOptions()
                        .unique(true)
                        .name("uniq_active_seat_assignment")
                        .partialFilterExpression(new Document("assignment_status", "active"))
        );

        mongoSupport.collection("student_history").createIndex(Indexes.compoundIndex(
                Indexes.ascending("student_id"),
                Indexes.descending("created_at")
        ));
        mongoSupport.collection("admission_requests").createIndex(Indexes.compoundIndex(
                Indexes.ascending("status"),
                Indexes.descending("created_at")
        ));
        mongoSupport.collection("notifications").createIndex(Indexes.compoundIndex(
                Indexes.ascending("read"),
                Indexes.descending("created_at")
        ));
        mongoSupport.collection("settings").createIndex(Indexes.ascending("key"), new IndexOptions().unique(true));
    }

    private void ensureSettings() {
        Document defaultSettings = new Document("key", "app_settings")
                .append("shifts", List.of(
                        new Document("id", 1).append("label", "Shift 1").append("time", "6 AM - 11 AM").append("seat_capacity", 41),
                        new Document("id", 2).append("label", "Shift 2").append("time", "11 AM - 4 PM").append("seat_capacity", 41),
                        new Document("id", 3).append("label", "Shift 3").append("time", "4 PM - 9 PM").append("seat_capacity", 41),
                        new Document("id", 4).append("label", "2 Shift").append("time", "Two Shift Plan").append("seat_capacity", 41),
                        new Document("id", 5).append("label", "Full Shift").append("time", "Full Day Access").append("seat_capacity", 41)
                ))
                .append("disabled_seats", List.of());

        mongoSupport.collection("settings").updateOne(
                new Document("key", "app_settings"),
                new Document("$setOnInsert", defaultSettings),
                new UpdateOptions().upsert(true)
        );
    }

    private void ensureAdminUser() {
        MongoCollection<Document> users = mongoSupport.collection("users");
        Document existing = users.find(new Document("email", appProperties.getAdminEmail())).first();
        if (existing != null) {
            if (!existing.containsKey("session_version")) {
                users.updateOne(
                        new Document("_id", existing.getObjectId("_id")),
                        Updates.set("session_version", 0)
                );
            }
            return;
        }

        String passwordHash = appProperties.getAdminPasswordHash();
        if (passwordHash == null || passwordHash.isBlank()) {
            passwordHash = passwordHashService.encodeDefault("admin1234");
        }

        users.insertOne(new Document("email", appProperties.getAdminEmail())
                .append("password_hash", passwordHash)
                .append("role", "admin")
                .append("status", "active")
                .append("session_version", 0)
                .append("last_login_at", null)
                .append("created_at", Date.from(DocumentUtils.nowUtc())));
    }
}
