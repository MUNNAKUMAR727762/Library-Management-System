package com.gyansthal.backend.service;

import com.gyansthal.backend.config.AppProperties;
import com.gyansthal.backend.config.MongoSupport;
import com.gyansthal.backend.support.ApiException;
import com.gyansthal.backend.support.DocumentUtils;
import com.mongodb.client.FindIterable;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.model.FindOneAndUpdateOptions;
import com.mongodb.client.model.ReturnDocument;
import com.mongodb.client.model.Sorts;
import com.mongodb.client.result.DeleteResult;
import com.mongodb.client.result.InsertOneResult;
import java.io.StringWriter;
import java.time.LocalDate;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.ArrayList;
import java.util.Date;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.regex.Pattern;
import org.bson.Document;
import org.bson.conversions.Bson;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.MultiValueMap;
import org.springframework.web.multipart.MultipartFile;
import static com.mongodb.client.model.Filters.and;
import static com.mongodb.client.model.Filters.eq;
import static com.mongodb.client.model.Filters.in;
import static com.mongodb.client.model.Filters.lte;
import static com.mongodb.client.model.Filters.ne;
import static com.mongodb.client.model.Filters.or;
import static com.mongodb.client.model.Filters.regex;
import static com.mongodb.client.model.Updates.addToSet;
import static com.mongodb.client.model.Updates.combine;
import static com.mongodb.client.model.Updates.pull;
import static com.mongodb.client.model.Updates.set;

@Service
public class LibraryService {

    private static final Pattern MOBILE_PATTERN = Pattern.compile("^[6-9]\\d{9}$");
    private static final Pattern AADHAR_PATTERN = Pattern.compile("^\\d{12}$");
    private static final Pattern MONTH_PATTERN = Pattern.compile("^\\d{4}-\\d{2}$");
    private static final DateTimeFormatter DATE_FORMAT = DateTimeFormatter.ISO_LOCAL_DATE;

    private final MongoSupport mongoSupport;
    private final AppProperties appProperties;
    private final PhotoService photoService;
    private final AuthService authService;

    public LibraryService(
            MongoSupport mongoSupport,
            AppProperties appProperties,
            PhotoService photoService,
            AuthService authService
    ) {
        this.mongoSupport = mongoSupport;
        this.appProperties = appProperties;
        this.photoService = photoService;
        this.authService = authService;
    }

    public Map<String, Object> getSettings() {
        return serialize(getSettingsDocument());
    }

    public Map<String, Object> dashboardSummary(int activeShift) {
        cleanupOrphanPayments();
        List<Map<String, Object>> seats = buildSeats(activeShift);
        List<Document> payments = mongoSupport.collection("payments").find().into(new ArrayList<>());
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalSeats", seats.size());
        summary.put("occupied", seats.stream().filter(seat -> "occupied".equals(seat.get("status"))).count());
        summary.put("available", seats.stream().filter(seat -> "available".equals(seat.get("status"))).count());
        summary.put("pendingSeats", seats.stream().filter(seat -> "pending".equals(seat.get("status"))).count());
        summary.put("totalStudents", mongoSupport.collection("students").countDocuments());
        summary.put("monthlyRevenue", payments.stream()
                .filter(payment -> "paid".equals(payment.getString("payment_status")))
                .mapToInt(payment -> numberValue(payment.get("amount_paid")))
                .sum());
        summary.put("pendingPayments", payments.stream()
                .filter(payment -> !"paid".equals(payment.getString("payment_status")))
                .count());
        return summary;
    }

    public Map<String, Object> dashboardCharts() {
        cleanupOrphanPayments();
        List<Map<String, Object>> shiftUsage = new ArrayList<>();
        for (Map.Entry<Integer, Document> entry : getShiftMap().entrySet()) {
            List<Map<String, Object>> seats = buildSeats(entry.getKey());
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("name", entry.getValue().getString("label"));
            row.put("occupied", seats.stream().filter(seat -> "occupied".equals(seat.get("status"))).count());
            row.put("available", seats.stream().filter(seat -> "available".equals(seat.get("status"))).count());
            row.put("pending", seats.stream().filter(seat -> "pending".equals(seat.get("status"))).count());
            shiftUsage.add(row);
        }

        List<Document> payments = mongoSupport.collection("payments").find().into(new ArrayList<>());
        List<Map<String, Object>> paymentStatus = List.of(
                statusRow("Paid", payments, "paid"),
                statusRow("Pending", payments, "pending"),
                statusRow("Due Soon", payments, "due_soon"),
                statusRow("Overdue", payments, "overdue")
        );

        Map<String, Integer> revenueMap = new LinkedHashMap<>();
        for (Document payment : payments) {
            if ("paid".equals(payment.getString("payment_status"))) {
                String month = payment.getString("billing_month");
                revenueMap.put(month, revenueMap.getOrDefault(month, 0) + numberValue(payment.get("amount_paid")));
            }
        }

        List<Map<String, Object>> revenue = new ArrayList<>();
        revenueMap.entrySet().stream().sorted(Map.Entry.comparingByKey()).forEach(entry -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("month", entry.getKey());
            row.put("revenue", entry.getValue());
            revenue.add(row);
        });

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("shiftUsage", shiftUsage);
        result.put("paymentStatus", paymentStatus);
        result.put("revenue", revenue);
        return result;
    }

    public Map<String, Object> databaseStorageStats() {
        long limitBytes = appProperties.getAtlasStorageLimitBytes();
        long usedBytes = 0L;
        long objects = 0L;
        long collections = 0L;
        long avgObjectSize = 0L;
        List<Map<String, Object>> collectionBreakdown = new ArrayList<>();

        try {
            Document stats = mongoSupport.database().runCommand(new Document("dbStats", 1));
            usedBytes = numberLongValue(stats.get("dataSize")) + numberLongValue(stats.get("storageSize")) + numberLongValue(stats.get("indexSize"));
            collections = numberLongValue(stats.get("collections"));
            objects = numberLongValue(stats.get("objects"));
            avgObjectSize = numberLongValue(stats.get("avgObjSize"));

            for (String collectionName : mongoSupport.database().listCollectionNames()) {
                try {
                    Document collStats = mongoSupport.database().runCommand(new Document("collStats", collectionName));
                    Map<String, Object> row = new LinkedHashMap<>();
                    row.put("name", collectionName);
                    row.put("documentCount", numberLongValue(collStats.get("count")));
                    row.put("sizeBytes", numberLongValue(collStats.get("size")));
                    row.put("storageBytes", numberLongValue(collStats.get("storageSize")));
                    row.put("indexBytes", numberLongValue(collStats.get("totalIndexSize")));
                    collectionBreakdown.add(row);
                } catch (Exception ignored) {
                }
            }
        } catch (Exception ignored) {
            for (String collectionName : mongoSupport.database().listCollectionNames()) {
                List<Document> documents = mongoSupport.collection(collectionName).find().into(new ArrayList<>());
                long documentCount = documents.size();
                long estimatedSize = 0L;
                for (int index = 0; index < Math.min(documents.size(), 25); index++) {
                    estimatedSize += serialize(documents.get(index)).toString().getBytes().length;
                }
                if (documentCount > 25 && estimatedSize > 0) {
                    estimatedSize = (estimatedSize / 25) * documentCount;
                }
                usedBytes += estimatedSize;
                objects += documentCount;
                collections += 1;
                Map<String, Object> row = new LinkedHashMap<>();
                row.put("name", collectionName);
                row.put("documentCount", documentCount);
                row.put("sizeBytes", estimatedSize);
                row.put("storageBytes", estimatedSize);
                row.put("indexBytes", 0);
                collectionBreakdown.add(row);
            }
            if (objects > 0) {
                avgObjectSize = usedBytes / objects;
            }
        }

        long photoBytes = mongoSupport.collection("student_photos.files")
                .find()
                .into(new ArrayList<>())
                .stream()
                .mapToLong(file -> numberLongValue(file.get("length")))
                .sum();

        Map<String, Object> photoUsage = new LinkedHashMap<>();
        photoUsage.put("fileCount", mongoSupport.collection("student_photos.files").countDocuments());
        photoUsage.put("chunkCount", mongoSupport.collection("student_photos.chunks").countDocuments());
        photoUsage.put("totalBytes", photoBytes);

        long remainingBytes = Math.max(limitBytes - usedBytes, 0);
        double percentUsed = limitBytes == 0 ? 0 : Math.round(((double) usedBytes / (double) limitBytes) * 10000.0) / 100.0;

        collectionBreakdown.sort((left, right) -> Long.compare(
                numberLongValue(right.get("storageBytes")),
                numberLongValue(left.get("storageBytes"))
        ));

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("usedBytes", usedBytes);
        result.put("remainingBytes", remainingBytes);
        result.put("limitBytes", limitBytes);
        result.put("percentUsed", percentUsed);
        result.put("collections", collections);
        result.put("objects", objects);
        result.put("avgObjectSize", avgObjectSize);
        result.put("collectionBreakdown", collectionBreakdown);
        result.put("photoUsage", photoUsage);
        return result;
    }

    public List<Map<String, Object>> buildSeats(Integer shiftId) {
        Document settings = getSettingsDocument();
        Set<String> disabledSeats = getDisabledSeats();
        List<Document> assignments = mongoSupport.collection("seat_assignments")
                .find(eq("assignment_status", "active"))
                .into(new ArrayList<>());
        Map<String, Document> students = new HashMap<>();
        mongoSupport.collection("students").find().forEach(student -> students.put(student.getObjectId("_id").toHexString(), student));

        Map<String, Document> assignmentMap = new HashMap<>();
        for (Document assignment : assignments) {
            assignmentMap.put(assignment.getInteger("shift_id") + ":" + assignment.getInteger("seat_number"), assignment);
        }

        List<Map<String, Object>> seats = new ArrayList<>();
        for (Document shift : settings.getList("shifts", Document.class, List.of())) {
            int currentShiftId = shift.getInteger("id");
            if (shiftId != null && currentShiftId != shiftId) {
                continue;
            }
            int seatCapacity = numberValue(shift.get("seat_capacity"));
            for (int seatNumber = 1; seatNumber <= seatCapacity; seatNumber++) {
                String status = "available";
                String studentId = null;
                String studentName = null;
                String seatKey = currentShiftId + ":" + seatNumber;
                Document assignment = assignmentMap.get(seatKey);
                if (disabledSeats.contains(seatKey)) {
                    status = "disabled";
                } else if (assignment != null) {
                    studentId = stringValue(assignment.get("student_id"));
                    Document student = students.get(studentId);
                    if (student != null) {
                        status = "active".equals(student.getString("status")) ? "occupied" : "pending";
                        studentName = student.getString("name");
                    }
                }

                Map<String, Object> seat = new LinkedHashMap<>();
                seat.put("number", seatNumber);
                seat.put("shift", currentShiftId);
                seat.put("status", status);
                seat.put("studentId", studentId);
                seat.put("studentName", studentName);
                seats.add(seat);
            }
        }
        return seats;
    }

    public Map<String, Object> getAdmissionLink(int shiftId, int seatNumber) {
        Map<String, Object> seat = buildSeats(shiftId).stream()
                .filter(item -> numberValue(item.get("shift")) == shiftId && numberValue(item.get("number")) == seatNumber)
                .findFirst()
                .orElse(null);
        if (seat == null) {
            throw new ApiException("Seat not found", HttpStatus.NOT_FOUND);
        }
        if (!"available".equals(seat.get("status"))) {
            throw new ApiException("Seat is not available for admissions", HttpStatus.BAD_REQUEST);
        }
        String token = authService.createAdmissionLinkToken(seatNumber, shiftId);
        Map<String, Object> link = new LinkedHashMap<>();
        link.put("token", token);
        link.put("url", normalizeBaseUrl(appProperties.getAppBaseUrl()) + "/admit?token=" + token);
        link.put("expiresInSeconds", appProperties.getAdmissionLinkExpiresInSeconds());
        return link;
    }

    public Map<String, Object> disableSeat(int shiftId, int seatNumber) {
        if (findActiveAssignment(shiftId, seatNumber) != null) {
            throw new ApiException("Cannot disable an occupied seat", HttpStatus.BAD_REQUEST);
        }
        Document updated = mongoSupport.collection("settings").findOneAndUpdate(
                eq("key", "app_settings"),
                addToSet("disabled_seats", new Document("shift_id", shiftId).append("seat_number", seatNumber)),
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
        );
        return serialize(updated);
    }

    public Map<String, Object> enableSeat(int shiftId, int seatNumber) {
        Document updated = mongoSupport.collection("settings").findOneAndUpdate(
                eq("key", "app_settings"),
                pull("disabled_seats", new Document("shift_id", shiftId).append("seat_number", seatNumber)),
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
        );
        return serialize(updated);
    }

    private Document getSettingsDocument() {
        Document settings = mongoSupport.collection("settings").find(eq("key", "app_settings")).first();
        if (settings == null) {
            throw new ApiException("Settings not found", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        return settings;
    }

    private Set<String> getDisabledSeats() {
        Set<String> disabled = new HashSet<>();
        for (Document item : getSettingsDocument().getList("disabled_seats", Document.class, List.of())) {
            disabled.add(item.getInteger("shift_id") + ":" + item.getInteger("seat_number"));
        }
        return disabled;
    }

    private Map<Integer, Document> getShiftMap() {
        Map<Integer, Document> shiftMap = new LinkedHashMap<>();
        for (Document shift : getSettingsDocument().getList("shifts", Document.class, List.of())) {
            shiftMap.put(shift.getInteger("id"), shift);
        }
        return shiftMap;
    }

    private Document findActiveAssignment(int shiftId, int seatNumber) {
        return mongoSupport.collection("seat_assignments")
                .find(and(eq("shift_id", shiftId), eq("seat_number", seatNumber), eq("assignment_status", "active")))
                .first();
    }

    private Map<String, Object> statusRow(String name, List<Document> payments, String status) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("name", name);
        row.put("value", payments.stream().filter(payment -> status.equals(payment.getString("payment_status"))).count());
        return row;
    }

    public Map<String, Object> createStudent(Map<String, Object> payload, String actorName) {
        requireFields(payload, "name", "mobile", "seat_number", "admission_date", "monthly_fee");

        List<Integer> shiftIds = parseShiftIds(payload);
        int seatNumber = asInt(payload.get("seat_number"), "Seat");
        for (int shiftId : shiftIds) {
            validateSeat(shiftId, seatNumber);
        }

        Document student = new Document("name", validateRequiredText(stringValue(payload.get("name")), "Student name"))
                .append("mobile", validateMobile(stringValue(payload.get("mobile")), "Mobile number"))
                .append("father_name", validateOptionalText(stringValue(payload.get("father_name")), "Father name", 120))
                .append("father_number", validateOptionalMobile(stringValue(payload.get("father_number")), "Father mobile number"))
                .append("aadhar_number", validateOptionalAadhar(stringValue(payload.get("aadhar_number"))))
                .append("photo_url", validateOptionalText(stringValue(payload.get("photo_url")), "Photo URL", 500))
                .append("seat_number", seatNumber)
                .append("shift_id", shiftIds.getFirst())
                .append("shift_ids", shiftIds)
                .append("admission_date", validateDate(stringValue(payload.get("admission_date")), "Admission date"))
                .append("monthly_fee", validateFee(payload.get("monthly_fee")))
                .append("status", validateStudentStatus(stringValue(payload.getOrDefault("status", "active"))))
                .append("admission_source", stringValue(payload.getOrDefault("admission_source", "admin")))
                .append("created_at", now())
                .append("updated_at", now());

        try {
            InsertOneResult inserted = mongoSupport.collection("students").insertOne(student);
            String studentId = inserted.getInsertedId().asObjectId().getValue().toHexString();
            try {
                assignStudentShifts(studentId, seatNumber, shiftIds);
            } catch (RuntimeException ex) {
                mongoSupport.collection("students").deleteOne(eq("_id", inserted.getInsertedId().asObjectId().getValue()));
                throw ex;
            }

            appendStudentHistory(
                    studentId,
                    "admission",
                    "Admitted to Seat #" + seatNumber + ", Shift selection saved",
                    student.getString("admission_source"),
                    actorName,
                    new Document("seat_number", seatNumber)
                            .append("shift_ids", joinInts(shiftIds))
                            .append("monthly_fee", student.get("monthly_fee"))
                            .append("status", student.get("status"))
            );

            Document created = mongoSupport.collection("students").find(eq("_id", inserted.getInsertedId().asObjectId().getValue())).first();
            if (created != null) {
                ensureStudentPaymentSchedule(created, null);
            }
            return serializeStudent(created, true, null);
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            if (isDuplicateKey(ex)) {
                throw new ApiException("A student with this mobile number already exists", HttpStatus.BAD_REQUEST);
            }
            throw ex;
        }
    }

    public Map<String, Object> updateStudent(String studentId, Map<String, Object> payload, String actorName) {
        Document existingStudent = requireStudent(studentId);
        Document updateFields = new Document();
        List<Integer> requestedShiftIds = null;

        if (payload.containsKey("name")) {
            updateFields.append("name", validateRequiredText(stringValue(payload.get("name")), "Student name"));
        }
        if (payload.containsKey("mobile")) {
            updateFields.append("mobile", validateMobile(stringValue(payload.get("mobile")), "Mobile number"));
        }
        if (payload.containsKey("father_name")) {
            updateFields.append("father_name", validateOptionalText(stringValue(payload.get("father_name")), "Father name", 120));
        }
        if (payload.containsKey("father_number")) {
            updateFields.append("father_number", validateOptionalMobile(stringValue(payload.get("father_number")), "Father mobile number"));
        }
        if (payload.containsKey("aadhar_number")) {
            updateFields.append("aadhar_number", validateOptionalAadhar(stringValue(payload.get("aadhar_number"))));
        }
        if (payload.containsKey("photo_url")) {
            updateFields.append("photo_url", validateOptionalText(stringValue(payload.get("photo_url")), "Photo URL", 500));
        }
        if (payload.containsKey("admission_date")) {
            updateFields.append("admission_date", validateDate(stringValue(payload.get("admission_date")), "Admission date"));
        }
        if (payload.containsKey("monthly_fee")) {
            updateFields.append("monthly_fee", validateFee(payload.get("monthly_fee")));
        }
        if (payload.containsKey("status")) {
            updateFields.append("status", validateStudentStatus(stringValue(payload.get("status"))));
        }
        if (payload.containsKey("shift_ids") || payload.containsKey("shift_id")) {
            requestedShiftIds = parseShiftIds(payload);
        }
        updateFields.append("updated_at", now());

        if (requestedShiftIds != null) {
            int currentSeatNumber = numberValue(existingStudent.get("seat_number"));
            for (int shiftId : requestedShiftIds) {
                validateSeat(shiftId, currentSeatNumber);
            }
            releaseStudentSeat(studentId);
            try {
                assignStudentShifts(studentId, currentSeatNumber, requestedShiftIds);
            } catch (RuntimeException ex) {
                assignStudentShifts(studentId, currentSeatNumber, readShiftIds(existingStudent));
                throw ex;
            }
            updateFields.append("shift_ids", requestedShiftIds);
            updateFields.append("shift_id", requestedShiftIds.getFirst());
        }

        try {
            Document updated = mongoSupport.collection("students").findOneAndUpdate(
                    eq("_id", DocumentUtils.objectId(studentId)),
                    new Document("$set", updateFields),
                    new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
            );
            if (updated == null) {
                throw new ApiException("Student not found", HttpStatus.NOT_FOUND);
            }

            Document changedFields = new Document();
            for (String key : updateFields.keySet()) {
                if ("updated_at".equals(key)) {
                    continue;
                }
                changedFields.append(key, new Document("from", existingStudent.get(key)).append("to", updateFields.get(key)));
            }
            appendStudentHistory(
                    studentId,
                    "edit",
                    "Student record updated",
                    String.join(", ", changedFields.keySet()),
                    actorName,
                    changedFields
            );
            return serializeStudent(updated, true, null);
        } catch (Exception ex) {
            if (isDuplicateKey(ex)) {
                throw new ApiException("A student with this mobile number already exists", HttpStatus.BAD_REQUEST);
            }
            throw ex;
        }
    }

    public void deleteStudent(String studentId) {
        Document student = requireStudent(studentId);
        List<Document> relatedRequests = mongoSupport.collection("admission_requests")
                .find(eq("student_id", studentId))
                .into(new ArrayList<>());
        List<String> relatedRequestIds = relatedRequests.stream()
                .map(request -> request.getObjectId("_id").toHexString())
                .toList();
        Set<String> photoIds = new LinkedHashSet<>();
        if (student.getString("photo_file_id") != null && !student.getString("photo_file_id").isBlank()) {
            photoIds.add(student.getString("photo_file_id"));
        }
        for (Document request : relatedRequests) {
            String photoId = request.getString("photo_file_id");
            if (photoId != null && !photoId.isBlank()) {
                photoIds.add(photoId);
            }
        }

        mongoSupport.collection("payments").deleteMany(eq("student_id", studentId));
        mongoSupport.collection("seat_assignments").deleteMany(eq("student_id", studentId));
        mongoSupport.collection("student_history").deleteMany(eq("student_id", studentId));

        List<Bson> notificationFilters = new ArrayList<>();
        notificationFilters.add(and(eq("entity_type", "student"), eq("entity_id", studentId)));
        notificationFilters.add(and(eq("entity_type", "payment_reminder"), regex("entity_id", "^" + Pattern.quote(studentId) + ":")));
        if (!relatedRequestIds.isEmpty()) {
            notificationFilters.add(and(eq("entity_type", "admission_request"), in("entity_id", relatedRequestIds)));
        }
        mongoSupport.collection("notifications").deleteMany(or(notificationFilters));
        if (!relatedRequestIds.isEmpty()) {
            List<org.bson.types.ObjectId> requestObjectIds = relatedRequestIds.stream().map(DocumentUtils::objectId).toList();
            mongoSupport.collection("admission_requests").deleteMany(in("_id", requestObjectIds));
        }
        mongoSupport.collection("students").deleteOne(eq("_id", DocumentUtils.objectId(studentId)));

        for (String photoId : photoIds) {
            photoService.deleteFileSilently(photoId);
        }

        addNotification(
                "seat_available",
                "Seat " + numberValue(student.get("seat_number")) + " is now available for shifts " + joinInts(readShiftIds(student)),
                "seat",
                numberValue(student.get("shift_id")) + ":" + numberValue(student.get("seat_number"))
        );
    }

    public Map<String, Object> changeStudentSeat(String studentId, int seatNumber, List<Integer> shiftIds, String actorName) {
        for (int shiftId : shiftIds) {
            validateSeat(shiftId, seatNumber);
        }

        Document student = requireStudent(studentId);
        int oldSeat = numberValue(student.get("seat_number"));
        List<Integer> oldShiftIds = readShiftIds(student);
        releaseStudentSeat(studentId);
        try {
            assignStudentShifts(studentId, seatNumber, shiftIds);
        } catch (RuntimeException ex) {
            assignStudentShifts(studentId, oldSeat, oldShiftIds);
            throw ex;
        }

        mongoSupport.collection("students").updateOne(
                eq("_id", DocumentUtils.objectId(studentId)),
                combine(
                        set("seat_number", seatNumber),
                        set("shift_id", shiftIds.getFirst()),
                        set("shift_ids", shiftIds),
                        set("updated_at", now())
                )
        );

        appendStudentHistory(
                studentId,
                "seat_change",
                "Seat changed from #" + oldSeat + " to #" + seatNumber,
                "Shifts " + joinInts(oldShiftIds) + " to " + joinInts(shiftIds),
                actorName,
                new Document("old_seat", oldSeat)
                        .append("new_seat", seatNumber)
                        .append("old_shift_ids", joinInts(oldShiftIds))
                        .append("new_shift_ids", joinInts(shiftIds))
        );

        return serializeStudent(requireStudent(studentId), true, null);
    }

    public List<Map<String, Object>> getStudentHistory(String studentId) {
        requireStudent(studentId);
        return loadStudentHistory(studentId);
    }

    public List<Map<String, Object>> listStudents() {
        List<Document> students = mongoSupport.collection("students")
                .find()
                .sort(Sorts.descending("created_at"))
                .into(new ArrayList<>());
        for (Document student : students) {
            ensureStudentPaymentSchedule(student, null);
        }
        return students.stream().map(student -> serializeStudent(student, false, null)).toList();
    }

    public Map<String, Object> getStudent(String studentId) {
        return serializeStudent(requireStudent(studentId), true, null);
    }

    public Map<String, Object> getStudentDetail(String studentId) {
        Document student = requireStudent(studentId);
        ensureStudentPaymentSchedule(student, null);
        Map<String, Object> detail = new LinkedHashMap<>();
        detail.put("student", serializeStudent(student, true, null));
        detail.put("payments", listPayments(studentId));
        detail.put("assignments", listStudentAssignments(studentId));
        return detail;
    }

    public List<Map<String, Object>> listPayments(String studentId) {
        cleanupOrphanPayments();
        Map<String, Document> students = new HashMap<>();
        Bson filter = new Document();
        if (studentId != null && !studentId.isBlank()) {
            Document student = requireStudent(studentId);
            ensureStudentPaymentSchedule(student, null);
            students.put(studentId, student);
            filter = eq("student_id", studentId);
        } else {
            ensureAllStudentPaymentSchedules();
            mongoSupport.collection("students").find().forEach(student -> students.put(student.getObjectId("_id").toHexString(), student));
        }

        List<Document> payments = mongoSupport.collection("payments")
                .find(filter)
                .sort(Sorts.descending("payment_date"))
                .into(new ArrayList<>());
        return payments.stream().map(payment -> serializePayment(payment, students.get(stringValue(payment.get("student_id"))))).toList();
    }

    public Map<String, Object> createPayment(Map<String, Object> payload, String actorName) {
        requireFields(payload, "student_id", "billing_month", "fee_amount", "amount_paid", "payment_method", "payment_status", "payment_date");
        String studentId = stringValue(payload.get("student_id"));
        Document student = requireStudent(studentId);

        int feeAmount = validateFee(payload.get("fee_amount"));
        int amountPaid = validateAmountPaid(payload.get("amount_paid"));
        String paymentDate = validateDate(stringValue(payload.get("payment_date")), "Payment date");
        String requestedStatus = validatePaymentStatus(stringValue(payload.get("payment_status")));
        String billingMonth = validateMonth(stringValue(payload.get("billing_month")), "Billing month");

        Document payment = new Document("student_id", studentId)
                .append("billing_month", billingMonth)
                .append("fee_amount", feeAmount)
                .append("amount_paid", amountPaid)
                .append("payment_method", validatePaymentMethod(stringValue(payload.get("payment_method"))))
                .append("payment_status", resolveManualPaymentStatus(feeAmount, amountPaid, paymentDate, requestedStatus))
                .append("payment_date", paymentDate)
                .append("notes", validateOptionalText(stringValue(payload.get("notes")), "Notes", 300))
                .append("receipt_number", defaultReceiptNumber(stringValue(payload.get("receipt_number"))))
                .append("created_at", now())
                .append("updated_at", now());

        Document existingMonthPayment = mongoSupport.collection("payments")
                .find(and(eq("student_id", studentId), eq("billing_month", billingMonth)))
                .first();
        if (existingMonthPayment != null) {
            Document duplicateReceipt = mongoSupport.collection("payments")
                    .find(and(eq("receipt_number", payment.getString("receipt_number")), ne("_id", existingMonthPayment.getObjectId("_id"))))
                    .first();
            if (duplicateReceipt != null) {
                throw new ApiException("Receipt number already exists. Please use a unique receipt number.", HttpStatus.BAD_REQUEST);
            }
            Document updated = mongoSupport.collection("payments").findOneAndUpdate(
                    eq("_id", existingMonthPayment.getObjectId("_id")),
                    new Document("$set", payment.append("auto_generated", false)),
                    new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
            );
            appendStudentHistory(
                    studentId,
                    "payment",
                    "Payment updated for " + billingMonth,
                    payment.getString("receipt_number") + " • " + payment.getString("payment_method").toUpperCase(),
                    actorName,
                    new Document("billing_month", billingMonth)
                            .append("receipt_number", payment.getString("receipt_number"))
                            .append("amount_paid", amountPaid)
                            .append("fee_amount", feeAmount)
                            .append("payment_status", payment.getString("payment_status"))
            );
            if ("paid".equals(payment.getString("payment_status"))) {
                markPaymentReminderResolved(studentId, billingMonth);
            }
            return serializePayment(updated, student);
        }

        if (mongoSupport.collection("payments").find(eq("receipt_number", payment.getString("receipt_number"))).first() != null) {
            throw new ApiException("Receipt number already exists. Please use a unique receipt number.", HttpStatus.BAD_REQUEST);
        }
        InsertOneResult inserted = mongoSupport.collection("payments").insertOne(payment);
        appendStudentHistory(
                studentId,
                "payment",
                "Payment recorded for " + billingMonth,
                payment.getString("receipt_number") + " • " + payment.getString("payment_method").toUpperCase(),
                actorName,
                new Document("billing_month", billingMonth)
                        .append("receipt_number", payment.getString("receipt_number"))
                        .append("amount_paid", amountPaid)
                        .append("fee_amount", feeAmount)
                        .append("payment_status", payment.getString("payment_status"))
        );
        if ("paid".equals(payment.getString("payment_status"))) {
            markPaymentReminderResolved(studentId, billingMonth);
        } else {
            addNotification(
                    payment.getString("payment_status"),
                    student.getString("name") + " payment is marked " + payment.getString("payment_status").replace('_', ' '),
                    "student",
                    studentId
            );
        }
        Document created = mongoSupport.collection("payments").find(eq("_id", inserted.getInsertedId().asObjectId().getValue())).first();
        return serializePayment(created, student);
    }

    public Map<String, Object> updatePayment(String paymentId, Map<String, Object> payload, String actorName) {
        Document existingPayment = requirePayment(paymentId);
        Document updateFields = new Document();

        if (payload.containsKey("billing_month")) {
            updateFields.append("billing_month", validateMonth(stringValue(payload.get("billing_month")), "Billing month"));
        }
        if (payload.containsKey("fee_amount")) {
            updateFields.append("fee_amount", validateFee(payload.get("fee_amount")));
        }
        if (payload.containsKey("amount_paid")) {
            updateFields.append("amount_paid", validateAmountPaid(payload.get("amount_paid")));
        }
        if (payload.containsKey("payment_method")) {
            updateFields.append("payment_method", validatePaymentMethod(stringValue(payload.get("payment_method"))));
        }
        if (payload.containsKey("payment_status")) {
            updateFields.append("payment_status", validatePaymentStatus(stringValue(payload.get("payment_status"))));
        }
        if (payload.containsKey("payment_date")) {
            updateFields.append("payment_date", validateDate(stringValue(payload.get("payment_date")), "Payment date"));
        }
        if (payload.containsKey("notes")) {
            updateFields.append("notes", validateOptionalText(stringValue(payload.get("notes")), "Notes", 300));
        }
        if (payload.containsKey("receipt_number")) {
            updateFields.append("receipt_number", validateReceiptNumber(stringValue(payload.get("receipt_number")), true));
        }
        updateFields.append("updated_at", now());

        if (updateFields.containsKey("receipt_number")) {
            Document duplicate = mongoSupport.collection("payments")
                    .find(and(eq("receipt_number", updateFields.getString("receipt_number")), ne("_id", DocumentUtils.objectId(paymentId))))
                    .first();
            if (duplicate != null) {
                throw new ApiException("Receipt number already exists. Please use a unique receipt number.", HttpStatus.BAD_REQUEST);
            }
        }

        if (payload.containsKey("fee_amount") || payload.containsKey("amount_paid") || payload.containsKey("payment_date") || payload.containsKey("payment_status")) {
            int feeAmount = updateFields.containsKey("fee_amount") ? numberValue(updateFields.get("fee_amount")) : numberValue(existingPayment.get("fee_amount"));
            int amountPaid = updateFields.containsKey("amount_paid") ? numberValue(updateFields.get("amount_paid")) : numberValue(existingPayment.get("amount_paid"));
            String paymentDate = updateFields.containsKey("payment_date") ? updateFields.getString("payment_date") : existingPayment.getString("payment_date");
            String requestedStatus = updateFields.containsKey("payment_status") ? updateFields.getString("payment_status") : existingPayment.getString("payment_status");
            updateFields.put("payment_status", resolveManualPaymentStatus(feeAmount, amountPaid, paymentDate, requestedStatus));
        }

        Document updated = mongoSupport.collection("payments").findOneAndUpdate(
                eq("_id", DocumentUtils.objectId(paymentId)),
                new Document("$set", updateFields),
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
        );
        if (updated == null) {
            throw new ApiException("Payment not found", HttpStatus.NOT_FOUND);
        }

        String studentId = stringValue(existingPayment.get("student_id"));
        Document metadata = new Document();
        for (String key : updateFields.keySet()) {
            if ("updated_at".equals(key)) {
                continue;
            }
            metadata.append(key, new Document("from", existingPayment.get(key)).append("to", updateFields.get(key)));
        }
        appendStudentHistory(
                studentId,
                "payment",
                "Payment updated for " + stringValue(updated.getOrDefault("billing_month", existingPayment.get("billing_month"))),
                stringValue(updateFields.getOrDefault("receipt_number", existingPayment.get("receipt_number"))),
                actorName,
                metadata
        );
        if ("paid".equals(updated.getString("payment_status"))) {
            markPaymentReminderResolved(studentId, updated.getString("billing_month"));
        }
        Document student = mongoSupport.collection("students").find(eq("_id", DocumentUtils.objectId(studentId))).first();
        return serializePayment(updated, student);
    }

    public void deletePayment(String paymentId) {
        DeleteResult deleted = mongoSupport.collection("payments").deleteOne(eq("_id", DocumentUtils.objectId(paymentId)));
        if (deleted.getDeletedCount() == 0) {
            throw new ApiException("Payment not found", HttpStatus.NOT_FOUND);
        }
    }

    public List<Map<String, Object>> listNotifications() {
        cleanupOrphanPayments();
        ensureAllStudentPaymentSchedules();
        ensureUpcomingPaymentNotifications();

        List<Map<String, Object>> notifications = new ArrayList<>();
        mongoSupport.collection("notifications")
                .find()
                .sort(Sorts.descending("created_at"))
                .forEach(notification -> {
                    Map<String, Object> item = serialize(notification);
                    item.put("id", item.remove("_id"));
                    item.put("time", item.get("created_at"));
                    Map<String, String> target = notificationTarget(notification);
                    item.put("target_path", target.get("target_path"));
                    item.put("target_label", target.get("target_label"));
                    notifications.add(item);
                });
        return notifications;
    }

    public Map<String, Object> readNotification(String notificationId) {
        Document updated = mongoSupport.collection("notifications").findOneAndUpdate(
                eq("_id", DocumentUtils.objectId(notificationId)),
                set("read", true),
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
        );
        if (updated == null) {
            throw new ApiException("Notification not found", HttpStatus.NOT_FOUND);
        }
        Map<String, Object> item = serialize(updated);
        item.put("id", item.remove("_id"));
        return item;
    }

    public List<Map<String, Object>> listAdmissionRequests() {
        List<Map<String, Object>> requests = new ArrayList<>();
        mongoSupport.collection("admission_requests")
                .find()
                .sort(Sorts.descending("created_at"))
                .forEach(request -> {
                    Map<String, Object> item = serialize(request);
                    item.put("id", item.remove("_id"));
                    requests.add(item);
                });
        return requests;
    }

    public Map<String, Object> createAdmissionRequest(MultiValueMap<String, String> form, MultipartFile photo) {
        requireFormFields(form, "name", "mobile", "token");
        Map<String, Object> tokenPayload = verifyAdmissionFormToken(form.getFirst("token"));
        int seatNumber = asInt(tokenPayload.get("seat_number"), "Seat");
        int shiftId = asInt(tokenPayload.get("shift_id"), "Shift");
        validateSeat(shiftId, seatNumber);

        List<String> rawShiftIds = form.get("shift_ids");
        List<Integer> selectedShiftIds = rawShiftIds == null || rawShiftIds.isEmpty()
                ? List.of(shiftId)
                : validateShiftIds(rawShiftIds.stream().map(value -> asInt(value, "Shift")).toList());

        for (int selectedShiftId : selectedShiftIds) {
            if (!Set.of(1, 2, 3).contains(selectedShiftId)) {
                throw new ApiException("Students can select only Shift 1, Shift 2, or Shift 3", HttpStatus.BAD_REQUEST);
            }
            validateSeat(selectedShiftId, seatNumber);
        }

        for (int selectedShiftId : selectedShiftIds) {
            boolean unavailable = buildSeats(selectedShiftId).stream()
                    .anyMatch(seat -> numberValue(seat.get("number")) == seatNumber
                            && numberValue(seat.get("shift")) == selectedShiftId
                            && !"available".equals(seat.get("status")));
            if (unavailable) {
                throw new ApiException("Seat " + seatNumber + " is not available for one of the selected shifts", HttpStatus.BAD_REQUEST);
            }
        }

        Document photoMetadata = photoService.storeStudentPhoto(photo);
        Document document = new Document("name", validateRequiredText(form.getFirst("name"), "Student name"))
                .append("mobile", validateMobile(form.getFirst("mobile"), "Mobile number"))
                .append("father_name", validateOptionalText(form.getFirst("father_name"), "Father name", 120))
                .append("father_number", validateOptionalMobile(form.getFirst("father_number"), "Father mobile number"))
                .append("aadhar_number", validateOptionalAadhar(form.getFirst("aadhar_number")))
                .append("notes", validateOptionalText(form.getFirst("notes"), "Notes", 300));
        document.putAll(photoMetadata);
        document.append("seat_number", seatNumber)
                .append("shift_id", shiftId)
                .append("shift_ids", selectedShiftIds)
                .append("status", "pending")
                .append("created_at", now())
                .append("updated_at", now());

        InsertOneResult inserted = mongoSupport.collection("admission_requests").insertOne(document);
        String requestId = inserted.getInsertedId().asObjectId().getValue().toHexString();
        addNotification(
                "admission_pending",
                "New admission request from " + document.getString("name") + " for Seat " + seatNumber + ", Shifts " + joinInts(selectedShiftIds),
                "admission_request",
                requestId
        );

        Document created = mongoSupport.collection("admission_requests").find(eq("_id", inserted.getInsertedId().asObjectId().getValue())).first();
        Map<String, Object> item = serialize(created);
        item.put("id", item.remove("_id"));
        return item;
    }

    public Map<String, Object> admissionFormDetails(String token) {
        Map<String, Object> tokenPayload = verifyAdmissionFormToken(token);
        int shiftId = asInt(tokenPayload.get("shift_id"), "Shift");
        int seatNumber = asInt(tokenPayload.get("seat_number"), "Seat");
        Document settings = getSettingsDocument();
        Document shift = settings.getList("shifts", Document.class, List.of()).stream()
                .filter(item -> shiftId == item.getInteger("id"))
                .findFirst()
                .orElseThrow(() -> new ApiException("Shift not found", HttpStatus.NOT_FOUND));

        boolean available = buildSeats(shiftId).stream()
                .anyMatch(seat -> numberValue(seat.get("number")) == seatNumber && "available".equals(seat.get("status")));

        List<Map<String, Object>> shiftOptions = new ArrayList<>();
        for (Document item : settings.getList("shifts", Document.class, List.of())) {
            if (!Set.of(1, 2, 3).contains(item.getInteger("id"))) {
                continue;
            }
            boolean optionAvailable = buildSeats(item.getInteger("id")).stream()
                    .anyMatch(seat -> numberValue(seat.get("number")) == seatNumber
                            && numberValue(seat.get("shift")) == item.getInteger("id")
                            && "available".equals(seat.get("status")));
            Map<String, Object> option = new LinkedHashMap<>();
            option.put("id", item.getInteger("id"));
            option.put("label", item.getString("label"));
            option.put("time", item.getString("time"));
            option.put("available", optionAvailable);
            shiftOptions.add(option);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("seatNumber", seatNumber);
        result.put("shiftId", shiftId);
        result.put("shiftIds", List.of(shiftId));
        result.put("shiftLabel", shift.getString("label"));
        result.put("shiftTime", shift.getString("time"));
        result.put("shiftOptions", shiftOptions);
        result.put("available", available);
        result.put("token", token);
        result.put("submitUrl", normalizeBaseUrl(appProperties.getAppBaseUrl()) + "/admit?token=" + token);
        return result;
    }

    public Map<String, Object> approveAdmissionRequest(String requestId, Map<String, Object> payload, String actorName, String reviewerId) {
        Object monthlyFeeValue = payload.get("monthly_fee");
        if (monthlyFeeValue == null || stringValue(monthlyFeeValue).isBlank()) {
            throw new ApiException("monthly_fee is required", HttpStatus.BAD_REQUEST);
        }

        int monthlyFee = validateFee(monthlyFeeValue);
        String admissionDate = validateDate(stringValue(payload.getOrDefault("admission_date", LocalDate.now().toString())), "Admission date");
        String status = validateStudentStatus(stringValue(payload.getOrDefault("status", "active")));
        List<Integer> shiftIds = payload.containsKey("shift_ids") ? parseShiftIds(payload) : List.of();
        String paymentStartMonth = validateMonth(stringValue(payload.getOrDefault("payment_start_month", admissionDate.substring(0, 7))), "First billing month");
        String paymentMethod = validatePaymentMethod(stringValue(payload.getOrDefault("payment_method", "cash")));
        String paymentStatus = validatePaymentStatus(stringValue(payload.getOrDefault("payment_status", "paid")));
        String paymentDate = validateDate(stringValue(payload.getOrDefault("payment_date", admissionDate)), "Payment date");
        String receiptNumber = validateReceiptNumber(stringValue(payload.get("receipt_number")), true);
        String paymentNotes = validateOptionalText(stringValue(payload.get("payment_notes")), "Payment notes", 300);

        if (mongoSupport.collection("payments").find(eq("receipt_number", receiptNumber)).first() != null) {
            throw new ApiException("Receipt number already exists. Please use a unique receipt number.", HttpStatus.BAD_REQUEST);
        }

        Document request = mongoSupport.collection("admission_requests").find(eq("_id", DocumentUtils.objectId(requestId))).first();
        if (request == null) {
            throw new ApiException("Admission request not found", HttpStatus.NOT_FOUND);
        }
        if (!"pending".equals(request.getString("status"))) {
            throw new ApiException("Only pending requests can be approved", HttpStatus.BAD_REQUEST);
        }
        if (shiftIds.isEmpty()) {
            shiftIds = validateShiftIds(readShiftIds(request));
        }

        Document student = new Document("name", request.getString("name"))
                .append("mobile", request.getString("mobile"))
                .append("father_name", stringValue(request.get("father_name")))
                .append("father_number", stringValue(request.get("father_number")))
                .append("aadhar_number", stringValue(request.get("aadhar_number")))
                .append("photo_file_id", stringValue(request.get("photo_file_id")))
                .append("photo_filename", stringValue(request.get("photo_filename")))
                .append("photo_content_type", stringValue(request.get("photo_content_type")))
                .append("photo_size", numberValue(request.get("photo_size")))
                .append("seat_number", numberValue(request.get("seat_number")))
                .append("shift_id", shiftIds.getFirst())
                .append("shift_ids", shiftIds)
                .append("admission_date", admissionDate)
                .append("monthly_fee", monthlyFee)
                .append("status", status)
                .append("admission_source", "public_qr")
                .append("created_at", now())
                .append("updated_at", now());

        if (mongoSupport.collection("students").find(eq("mobile", student.getString("mobile"))).first() != null) {
            throw new ApiException(
                    "A student with this mobile number already exists. Please review the existing student record instead of approving again.",
                    HttpStatus.BAD_REQUEST
            );
        }

        InsertOneResult inserted;
        try {
            inserted = mongoSupport.collection("students").insertOne(student);
        } catch (Exception ex) {
            if (isDuplicateKey(ex)) {
                throw new ApiException(
                        "A student with this mobile number already exists. Please review the existing student record instead of approving again.",
                        HttpStatus.BAD_REQUEST
                );
            }
            throw ex;
        }

        String studentId = inserted.getInsertedId().asObjectId().getValue().toHexString();
        try {
            assignStudentShifts(studentId, numberValue(student.get("seat_number")), shiftIds);
        } catch (RuntimeException ex) {
            mongoSupport.collection("students").deleteOne(eq("_id", inserted.getInsertedId().asObjectId().getValue()));
            throw ex;
        }

        mongoSupport.collection("admission_requests").updateOne(
                eq("_id", DocumentUtils.objectId(requestId)),
                new Document("$set", new Document("status", "approved")
                        .append("reviewed_at", now())
                        .append("reviewed_by", reviewerId)
                        .append("student_id", studentId)
                        .append("updated_at", now()))
        );

        appendStudentHistory(
                studentId,
                "admission",
                "Admitted to Seat #" + numberValue(student.get("seat_number")) + " with selected shifts",
                "public_qr",
                actorName,
                new Document("seat_number", student.get("seat_number"))
                        .append("shift_ids", joinInts(shiftIds))
                        .append("monthly_fee", monthlyFee)
                        .append("status", status)
                        .append("student_mobile", student.getString("mobile"))
                        .append("father_name", student.getString("father_name"))
                        .append("father_number", student.getString("father_number"))
                        .append("aadhar_number", student.getString("aadhar_number"))
        );

        createPaymentRecords(
                studentId,
                student.getString("name"),
                monthlyFee,
                paymentStartMonth,
                1,
                paymentMethod,
                paymentStatus,
                paymentDate,
                receiptNumber,
                paymentNotes,
                actorName
        );
        ensureStudentPaymentSchedule(requireStudent(studentId), paymentStartMonth);
        markRelatedNotificationsRead("admission_request", requestId);
        return serializeStudent(requireStudent(studentId), true, null);
    }

    public Map<String, Object> rejectAdmissionRequest(String requestId, String reason, String reviewerId) {
        Document updated = mongoSupport.collection("admission_requests").findOneAndUpdate(
                and(eq("_id", DocumentUtils.objectId(requestId)), eq("status", "pending")),
                new Document("$set", new Document("status", "rejected")
                        .append("rejection_reason", reason == null ? "" : reason)
                        .append("reviewed_at", now())
                        .append("reviewed_by", reviewerId)
                        .append("updated_at", now())),
                new FindOneAndUpdateOptions().returnDocument(ReturnDocument.AFTER)
        );
        if (updated == null) {
            throw new ApiException("Pending admission request not found", HttpStatus.NOT_FOUND);
        }
        markRelatedNotificationsRead("admission_request", requestId);
        Map<String, Object> item = serialize(updated);
        item.put("id", item.remove("_id"));
        return item;
    }

    public Map<String, Object> cleanupRejectedRequestPhotos() {
        LocalDate cutoffDate = LocalDate.now().minusDays(appProperties.getRejectedPhotoRetentionDays());
        Date cutoff = java.sql.Date.valueOf(cutoffDate);
        FindIterable<Document> rejectedRequests = mongoSupport.collection("admission_requests").find(and(
                eq("status", "rejected"),
                lte("reviewed_at", cutoff),
                ne("photo_file_id", "")
        ));
        int removed = 0;
        int updated = 0;
        for (Document request : rejectedRequests) {
            String fileId = request.getString("photo_file_id");
            if (fileId != null && !fileId.isBlank()) {
                photoService.deleteFileSilently(fileId);
                removed++;
            }
            mongoSupport.collection("admission_requests").updateOne(
                    eq("_id", request.getObjectId("_id")),
                    new Document("$set", new Document("photo_cleanup_completed_at", now())
                            .append("photo_file_id", "")
                            .append("photo_filename", "")
                            .append("photo_content_type", "")
                            .append("photo_size", 0))
            );
            updated++;
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("removedFiles", removed);
        result.put("updatedRequests", updated);
        return result;
    }

    public List<Map<String, Object>> exportCollectionRows(String name) {
        return switch (name) {
            case "students" -> listStudents();
            case "payments" -> listPayments(null);
            default -> throw new ApiException("Export collection is not supported", HttpStatus.BAD_REQUEST);
        };
    }

    public String exportCollectionCsv(String name) {
        List<Map<String, Object>> rows = exportCollectionRows(name);
        if (rows.isEmpty()) {
            return "";
        }
        Set<String> fieldNames = new LinkedHashSet<>();
        for (Map<String, Object> row : rows) {
            for (Map.Entry<String, Object> entry : row.entrySet()) {
                if (!(entry.getValue() instanceof Map) && !(entry.getValue() instanceof List)) {
                    fieldNames.add(entry.getKey());
                }
            }
        }

        StringWriter writer = new StringWriter();
        List<String> headers = new ArrayList<>(fieldNames);
        writer.append(String.join(",", headers)).append('\n');
        for (Map<String, Object> row : rows) {
            List<String> values = new ArrayList<>();
            for (String header : headers) {
                values.add(csvValue(row.get(header)));
            }
            writer.append(String.join(",", values)).append('\n');
        }
        return writer.toString();
    }

    public PhotoService.StoredFile loadFile(String fileId) {
        return photoService.loadFile(fileId);
    }

    private void assignSeat(String studentId, int shiftId, int seatNumber) {
        if (findActiveAssignment(shiftId, seatNumber) != null) {
            throw new ApiException("Seat is already occupied", HttpStatus.BAD_REQUEST);
        }
        if (getDisabledSeats().contains(shiftId + ":" + seatNumber)) {
            throw new ApiException("Seat is disabled", HttpStatus.BAD_REQUEST);
        }
        mongoSupport.collection("seat_assignments").insertOne(
                new Document("student_id", studentId)
                        .append("shift_id", shiftId)
                        .append("seat_number", seatNumber)
                        .append("assignment_status", "active")
                        .append("created_at", now())
        );
    }

    private void assignStudentShifts(String studentId, int seatNumber, List<Integer> shiftIds) {
        List<Integer> assigned = new ArrayList<>();
        try {
            for (int shiftId : shiftIds) {
                assignSeat(studentId, shiftId, seatNumber);
                assigned.add(shiftId);
            }
        } catch (RuntimeException ex) {
            for (int shiftId : assigned) {
                mongoSupport.collection("seat_assignments").updateMany(
                        and(eq("student_id", studentId), eq("shift_id", shiftId), eq("seat_number", seatNumber), eq("assignment_status", "active")),
                        combine(set("assignment_status", "released"), set("released_at", now()))
                );
            }
            throw ex;
        }
    }

    private void releaseStudentSeat(String studentId) {
        mongoSupport.collection("seat_assignments").updateMany(
                and(eq("student_id", studentId), eq("assignment_status", "active")),
                combine(set("assignment_status", "released"), set("released_at", now()))
        );
    }

    private void addNotification(String type, String message, String entityType, String entityId) {
        mongoSupport.collection("notifications").insertOne(
                new Document("type", type)
                        .append("message", message)
                        .append("entity_type", entityType)
                        .append("entity_id", entityId)
                        .append("read", false)
                        .append("created_at", now())
        );
    }

    private void appendStudentHistory(
            String studentId,
            String eventType,
            String description,
            String details,
            String actorName,
            Document metadata
    ) {
        mongoSupport.collection("student_history").insertOne(
                new Document("student_id", studentId)
                        .append("type", eventType)
                        .append("description", description)
                        .append("details", details)
                        .append("actor_name", actorName == null ? "System" : actorName)
                        .append("metadata", metadata == null ? new Document() : metadata)
                        .append("created_at", now())
        );
    }

    private List<Map<String, Object>> loadStudentHistory(String studentId) {
        List<Map<String, Object>> history = new ArrayList<>();
        mongoSupport.collection("student_history")
                .find(eq("student_id", studentId))
                .sort(Sorts.descending("created_at"))
                .forEach(item -> {
                    Map<String, Object> serialized = serialize(item);
                    serialized.put("id", serialized.remove("_id"));
                    serialized.put("date", serialized.remove("created_at"));
                    history.add(serialized);
                });
        return history;
    }

    private Map<String, Object> serializeStudent(Document student, boolean includeHistory, Map<String, List<Map<String, Object>>> historyMap) {
        Map<String, Object> result = serialize(student);
        result.put("id", result.remove("_id"));
        if (!result.containsKey("shift_ids") || !(result.get("shift_ids") instanceof List<?> list) || list.isEmpty()) {
            if (result.get("shift_id") != null) {
                result.put("shift_ids", List.of(result.get("shift_id")));
            } else {
                result.put("shift_ids", List.of());
            }
        }
        if (includeHistory) {
            String id = stringValue(result.get("id"));
            result.put("history", historyMap == null ? loadStudentHistory(id) : historyMap.getOrDefault(id, List.of()));
        }
        return result;
    }

    private Map<String, Object> serializePayment(Document payment, Document student) {
        Map<String, Object> item = serialize(payment);
        item.put("id", item.remove("_id"));
        item.put("studentName", student == null ? "Unknown" : student.getString("name"));
        item.put("seatNumber", student == null ? null : student.get("seat_number"));
        item.put("shift", student == null ? null : student.get("shift_id"));
        item.put("shift_ids", student == null ? List.of() : readShiftIds(student));
        return item;
    }

    private List<Map<String, Object>> listStudentAssignments(String studentId) {
        List<Map<String, Object>> assignments = new ArrayList<>();
        mongoSupport.collection("seat_assignments")
                .find(eq("student_id", studentId))
                .sort(Sorts.descending("created_at"))
                .forEach(assignment -> {
                    Map<String, Object> item = serialize(assignment);
                    item.put("id", item.remove("_id"));
                    assignments.add(item);
                });
        return assignments;
    }

    private Map<String, String> notificationTarget(Document notification) {
        String notificationType = notification.getString("type");
        String entityType = notification.getString("entity_type");
        String entityId = notification.getString("entity_id");
        Map<String, String> target = new LinkedHashMap<>();
        if ("admission_request".equals(entityType) || "admission_pending".equals(notificationType)) {
            target.put("target_path", "/admissions");
            target.put("target_label", "Open Admissions");
            return target;
        }
        if ("payment_reminder".equals(entityType) || Set.of("payment_due", "due_soon", "overdue").contains(notificationType)) {
            if (entityId != null && entityId.contains(":")) {
                String[] parts = entityId.split(":", 2);
                target.put("target_path", "/students?studentId=" + parts[0] + "&tab=payments&billingMonth=" + parts[1]);
                target.put("target_label", "Open Student Payment");
                return target;
            }
            target.put("target_path", "/payments");
            target.put("target_label", "Open Payments");
            return target;
        }
        if ("seat".equals(entityType) || "seat_available".equals(notificationType)) {
            target.put("target_path", "/seats");
            target.put("target_label", "Open Seats");
            return target;
        }
        if ("student".equals(entityType)) {
            target.put("target_path", entityId == null || entityId.isBlank() ? "/students" : "/students?studentId=" + entityId);
            target.put("target_label", entityId == null || entityId.isBlank() ? "Open Students" : "Open Student");
            return target;
        }
        target.put("target_path", "/");
        target.put("target_label", "Open Dashboard");
        return target;
    }

    private void ensureUpcomingPaymentNotifications() {
        List<Document> students = mongoSupport.collection("students").find(eq("status", "active")).into(new ArrayList<>());
        for (Document student : students) {
            ensureStudentPaymentSchedule(student, null);
            String studentId = student.getObjectId("_id").toHexString();
            List<Document> payments = mongoSupport.collection("payments").find(eq("student_id", studentId)).into(new ArrayList<>());
            for (Document payment : payments) {
                if ("paid".equals(payment.getString("payment_status"))) {
                    markPaymentReminderResolved(studentId, payment.getString("billing_month"));
                    continue;
                }
                String notificationType = payment.getString("payment_status");
                if (!Set.of("due_soon", "overdue").contains(notificationType)) {
                    continue;
                }
                String reminderKey = studentId + ":" + payment.getString("billing_month");
                Document existing = mongoSupport.collection("notifications")
                        .find(and(eq("entity_type", "payment_reminder"), eq("entity_id", reminderKey), eq("read", false)))
                        .first();
                if (existing != null) {
                    continue;
                }
                addNotification(notificationType, buildPaymentReminderMessage(student, payment), "payment_reminder", reminderKey);
            }
        }
    }

    private void ensureStudentPaymentSchedule(Document student, String anchorMonth) {
        if (student == null || student.get("admission_date") == null) {
            return;
        }
        String startMonth = (anchorMonth == null || anchorMonth.isBlank())
                ? stringValue(student.get("admission_date")).substring(0, 7)
                : anchorMonth;
        if (startMonth.length() != 7) {
            return;
        }

        YearMonth current = YearMonth.parse(startMonth);
        YearMonth lastTarget = YearMonth.now().plusMonths(1);
        while (!current.isAfter(lastTarget)) {
            String billingMonth = current.toString();
            String dueDate = buildDueDateForMonth(billingMonth, getStudentDueDay(student));
            String computedStatus = generatedPaymentStatus(dueDate);
            String studentId = student.getObjectId("_id").toHexString();
            Document existingPayment = mongoSupport.collection("payments")
                    .find(and(eq("student_id", studentId), eq("billing_month", billingMonth)))
                    .first();
            if (existingPayment == null) {
                mongoSupport.collection("payments").insertOne(
                        new Document("student_id", studentId)
                                .append("billing_month", billingMonth)
                                .append("fee_amount", numberValue(student.get("monthly_fee")))
                                .append("amount_paid", 0)
                                .append("payment_method", "cash")
                                .append("payment_status", computedStatus)
                                .append("payment_date", dueDate)
                                .append("notes", "Auto-generated monthly ledger entry")
                                .append("receipt_number", "AUTO-" + studentId.substring(Math.max(studentId.length() - 4, 0)) + "-" + billingMonth.replace("-", ""))
                                .append("auto_generated", true)
                                .append("created_at", now())
                                .append("updated_at", now())
                );
            } else {
                String normalizedStatus = numberValue(existingPayment.get("amount_paid")) >= numberValue(student.get("monthly_fee"))
                        ? "paid"
                        : computedStatus;
                Document updates = new Document();
                if (!Objects.equals(existingPayment.get("fee_amount"), numberValue(student.get("monthly_fee")))) {
                    updates.append("fee_amount", numberValue(student.get("monthly_fee")));
                }
                if (!Objects.equals(existingPayment.getString("payment_status"), normalizedStatus)) {
                    updates.append("payment_status", normalizedStatus);
                }
                if (!Objects.equals(existingPayment.getString("payment_date"), dueDate)) {
                    updates.append("payment_date", dueDate);
                }
                if (!updates.isEmpty()) {
                    updates.append("updated_at", now());
                    mongoSupport.collection("payments").updateOne(eq("_id", existingPayment.getObjectId("_id")), new Document("$set", updates));
                }
            }
            current = current.plusMonths(1);
        }
    }

    private void ensureAllStudentPaymentSchedules() {
        mongoSupport.collection("students").find().forEach(student -> ensureStudentPaymentSchedule(student, null));
    }

    private int getStudentDueDay(Document student) {
        String studentId = student.getObjectId("_id").toHexString();
        Document latestPaid = mongoSupport.collection("payments")
                .find(and(eq("student_id", studentId), eq("payment_status", "paid")))
                .sort(Sorts.orderBy(Sorts.descending("payment_date"), Sorts.descending("billing_month")))
                .first();
        String baseDate = latestPaid != null ? latestPaid.getString("payment_date") : stringValue(student.get("admission_date"));
        try {
            return LocalDate.parse(baseDate, DATE_FORMAT).getDayOfMonth();
        } catch (DateTimeParseException ex) {
            return 1;
        }
    }

    private String buildDueDateForMonth(String billingMonth, int dueDay) {
        YearMonth yearMonth = YearMonth.parse(billingMonth);
        int safeDay = Math.max(1, Math.min(dueDay, yearMonth.lengthOfMonth()));
        return yearMonth.atDay(safeDay).toString();
    }

    private String generatedPaymentStatus(String dueDateText) {
        LocalDate today = LocalDate.now();
        LocalDate dueDate = LocalDate.parse(dueDateText, DATE_FORMAT);
        LocalDate reminderDate = dueDate.minusDays(2);
        if (today.isAfter(dueDate)) {
            return "overdue";
        }
        if (!today.isBefore(reminderDate)) {
            return "due_soon";
        }
        return "pending";
    }

    private String resolveManualPaymentStatus(int feeAmount, int amountPaid, String paymentDate, String requestedStatus) {
        if (amountPaid > feeAmount) {
            throw new ApiException("Amount paid cannot be greater than fee amount", HttpStatus.BAD_REQUEST);
        }
        if ("paid".equals(requestedStatus) && amountPaid < feeAmount) {
            throw new ApiException("Paid status requires amount paid to match the fee amount", HttpStatus.BAD_REQUEST);
        }
        if (amountPaid >= feeAmount) {
            return "paid";
        }
        return generatedPaymentStatus(paymentDate);
    }

    private String buildPaymentReminderMessage(Document student, Document payment) {
        Map<Integer, Document> shiftMap = getShiftMap();
        String shiftLabel = readShiftIds(student).stream()
                .map(shiftId -> shiftMap.containsKey(shiftId) ? shiftMap.get(shiftId).getString("label") : "Shift " + shiftId)
                .reduce((left, right) -> left + ", " + right)
                .orElse("Shift");
        return "Reminder: collect " + payment.getString("billing_month") + " payment from " + student.getString("name")
                + " by " + payment.getString("payment_date") + " (Seat " + numberValue(student.get("seat_number")) + ", " + shiftLabel + ")";
    }

    private void markPaymentReminderResolved(String studentId, String billingMonth) {
        String reminderKey = studentId + ":" + billingMonth;
        mongoSupport.collection("notifications").updateMany(
                and(eq("entity_type", "payment_reminder"), eq("entity_id", reminderKey), eq("read", false)),
                combine(set("read", true), set("updated_at", now()))
        );
    }

    private void markRelatedNotificationsRead(String entityType, String entityId) {
        mongoSupport.collection("notifications").updateMany(
                and(eq("entity_type", entityType), eq("entity_id", entityId)),
                set("read", true)
        );
    }

    private int cleanupOrphanPayments() {
        Set<String> validStudentIds = new HashSet<>();
        mongoSupport.collection("students").find().projection(new Document("_id", 1)).forEach(student -> validStudentIds.add(student.getObjectId("_id").toHexString()));

        List<org.bson.types.ObjectId> orphanIds = new ArrayList<>();
        mongoSupport.collection("payments").find().projection(new Document("_id", 1).append("student_id", 1)).forEach(payment -> {
            String studentId = stringValue(payment.get("student_id"));
            if (!validStudentIds.contains(studentId)) {
                orphanIds.add(payment.getObjectId("_id"));
            }
        });

        if (orphanIds.isEmpty()) {
            return 0;
        }
        DeleteResult deleted = mongoSupport.collection("payments").deleteMany(in("_id", orphanIds));
        return (int) deleted.getDeletedCount();
    }

    private void createPaymentRecords(
            String studentId,
            String studentName,
            int monthlyFee,
            String startMonth,
            int monthsCount,
            String paymentMethod,
            String paymentStatus,
            String paymentDate,
            String receiptNumber,
            String notes,
            String actorName
    ) {
        if (monthsCount <= 0) {
            return;
        }
        YearMonth start = YearMonth.parse(startMonth);
        long nextNumber = mongoSupport.collection("payments").countDocuments() + 1;
        List<Document> documents = new ArrayList<>();
        for (int offset = 0; offset < monthsCount; offset++) {
            YearMonth billingMonth = start.plusMonths(offset);
            String normalizedMonth = billingMonth.toString();
            String currentReceipt = receiptNumber == null || receiptNumber.isBlank()
                    ? "REC-" + String.format("%05d", nextNumber)
                    : buildReceiptNumber(receiptNumber, offset + 1, monthsCount);
            Document payment = new Document("student_id", studentId)
                    .append("billing_month", normalizedMonth)
                    .append("fee_amount", monthlyFee)
                    .append("amount_paid", "paid".equals(paymentStatus) ? monthlyFee : 0)
                    .append("payment_method", paymentMethod)
                    .append("payment_status", paymentStatus)
                    .append("payment_date", paymentDate)
                    .append("notes", notes)
                    .append("receipt_number", currentReceipt)
                    .append("created_at", now())
                    .append("updated_at", now());
            documents.add(payment);

            appendStudentHistory(
                    studentId,
                    "payment",
                    normalizedMonth + " payment created for " + studentName,
                    paymentStatus,
                    actorName,
                    new Document("billing_month", normalizedMonth)
                            .append("receipt_number", currentReceipt)
                            .append("fee_amount", monthlyFee)
                            .append("amount_paid", payment.get("amount_paid"))
                            .append("payment_status", paymentStatus)
            );
            nextNumber++;
        }
        if (!documents.isEmpty()) {
            mongoSupport.collection("payments").insertMany(documents);
        }
    }

    private String buildReceiptNumber(String seed, int sequence, int totalCount) {
        if (seed == null || seed.isBlank()) {
            return "REC-" + String.format("%05d", sequence);
        }
        if (totalCount <= 1) {
            return seed;
        }
        return seed + "-" + String.format("%02d", sequence);
    }

    private Map<String, Object> verifyAdmissionFormToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ApiException("Admission link is invalid or expired", HttpStatus.BAD_REQUEST);
        }
        Map<String, Object> tokenPayload = authService.verifyAdmissionLinkToken(token);
        if (tokenPayload == null) {
            throw new ApiException("Admission link is invalid or expired", HttpStatus.BAD_REQUEST);
        }
        return tokenPayload;
    }

    private String defaultReceiptNumber(String value) {
        String normalized = validateReceiptNumber(value, false);
        return normalized.isBlank() ? nextReceiptNumber() : normalized;
    }

    private String nextReceiptNumber() {
        long count = mongoSupport.collection("payments").countDocuments() + 1;
        return "REC-" + String.format("%05d", count);
    }

    private Document requireStudent(String studentId) {
        Document student = mongoSupport.collection("students").find(eq("_id", DocumentUtils.objectId(studentId))).first();
        if (student == null) {
            throw new ApiException("Student not found", HttpStatus.NOT_FOUND);
        }
        return student;
    }

    private Document requirePayment(String paymentId) {
        Document payment = mongoSupport.collection("payments").find(eq("_id", DocumentUtils.objectId(paymentId))).first();
        if (payment == null) {
            throw new ApiException("Payment not found", HttpStatus.NOT_FOUND);
        }
        return payment;
    }

    private void requireFields(Map<String, Object> payload, String... fieldNames) {
        List<String> missing = new ArrayList<>();
        for (String field : fieldNames) {
            Object value = payload.get(field);
            if (value == null || stringValue(value).isBlank()) {
                missing.add(field);
            }
        }
        if (!missing.isEmpty()) {
            throw new ApiException("Missing fields: " + String.join(", ", missing), HttpStatus.BAD_REQUEST);
        }
    }

    private void requireFormFields(MultiValueMap<String, String> form, String... fieldNames) {
        List<String> missing = new ArrayList<>();
        for (String field : fieldNames) {
            String value = form.getFirst(field);
            if (value == null || value.isBlank()) {
                missing.add(field);
            }
        }
        if (!missing.isEmpty()) {
            throw new ApiException("Missing fields: " + String.join(", ", missing), HttpStatus.BAD_REQUEST);
        }
    }

    private List<Integer> parseShiftIds(Map<String, Object> payload) {
        Object rawShiftIds = payload.get("shift_ids");
        List<Integer> values = new ArrayList<>();
        if (rawShiftIds instanceof List<?> list) {
            for (Object item : list) {
                values.add(asInt(item, "Shift"));
            }
        } else if (payload.containsKey("shift_id") && !stringValue(payload.get("shift_id")).isBlank()) {
            values.add(asInt(payload.get("shift_id"), "Shift"));
        }
        return validateShiftIds(values);
    }

    private List<Integer> validateShiftIds(List<Integer> values) {
        List<Integer> normalized = new ArrayList<>();
        Set<Integer> seen = new HashSet<>();
        for (Integer rawValue : values) {
            int shiftId = validateShift(rawValue);
            if (seen.add(shiftId)) {
                normalized.add(shiftId);
            }
        }
        if (normalized.isEmpty()) {
            throw new ApiException("At least one shift must be selected", HttpStatus.BAD_REQUEST);
        }
        if (normalized.size() > 3) {
            throw new ApiException("You can select up to 3 shifts only", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private List<Integer> readShiftIds(Document document) {
        Object shiftIds = document.get("shift_ids");
        if (shiftIds instanceof List<?> list && !list.isEmpty()) {
            List<Integer> values = new ArrayList<>();
            for (Object item : list) {
                values.add(asInt(item, "Shift"));
            }
            return values;
        }
        if (document.get("shift_id") != null) {
            return List.of(numberValue(document.get("shift_id")));
        }
        return List.of();
    }

    private int validateShift(int shiftId) {
        if (!getShiftMap().containsKey(shiftId)) {
            throw new ApiException("Shift does not exist", HttpStatus.BAD_REQUEST);
        }
        return shiftId;
    }

    private void validateSeat(int shiftId, int seatNumber) {
        Document shift = getShiftMap().get(shiftId);
        if (shift == null) {
            throw new ApiException("Shift does not exist", HttpStatus.BAD_REQUEST);
        }
        int capacity = numberValue(shift.get("seat_capacity"));
        if (seatNumber < 1 || seatNumber > capacity) {
            throw new ApiException("Seat must be between 1 and " + capacity + " for the selected shift", HttpStatus.BAD_REQUEST);
        }
    }

    private int validateFee(Object value) {
        int amount = asInt(value, "Fee amount");
        if (amount <= 0 || amount > 50000) {
            throw new ApiException("Fee amount must be between 1 and 50000", HttpStatus.BAD_REQUEST);
        }
        return amount;
    }

    private int validateAmountPaid(Object value) {
        int amount = asInt(value, "Amount paid");
        if (amount < 0 || amount > 50000) {
            throw new ApiException("Amount paid must be between 0 and 50000", HttpStatus.BAD_REQUEST);
        }
        return amount;
    }

    private String validateRequiredText(String value, String label) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() < 2) {
            throw new ApiException(label + " is required", HttpStatus.BAD_REQUEST);
        }
        if (normalized.length() > 120) {
            throw new ApiException(label + " is too long", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String validateOptionalText(String value, String label, int maxLength) {
        String normalized = value == null ? "" : value.trim();
        if (normalized.length() > maxLength) {
            throw new ApiException(label + " is too long", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String validateReceiptNumber(String value, boolean required) {
        String normalized = value == null ? "" : value.trim().toUpperCase();
        if (normalized.isBlank()) {
            if (required) {
                throw new ApiException("Receipt number is required", HttpStatus.BAD_REQUEST);
            }
            return "";
        }
        if (normalized.length() > 40) {
            throw new ApiException("Receipt number is too long", HttpStatus.BAD_REQUEST);
        }
        if (!normalized.matches("^[A-Z0-9/_-]+$")) {
            throw new ApiException("Receipt number can only include letters, numbers, slash, dash, and underscore", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String validateMobile(String value, String label) {
        String normalized = value == null ? "" : value.trim();
        if (!MOBILE_PATTERN.matcher(normalized).matches()) {
            throw new ApiException(label + " must be a valid 10-digit Indian mobile number", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String validateOptionalMobile(String value, String label) {
        String normalized = value == null ? "" : value.trim();
        if (!normalized.isBlank() && !MOBILE_PATTERN.matcher(normalized).matches()) {
            throw new ApiException(label + " must be a valid 10-digit Indian mobile number", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String validateOptionalAadhar(String value) {
        String normalized = value == null ? "" : value.trim();
        if (!normalized.isBlank() && !AADHAR_PATTERN.matcher(normalized).matches()) {
            throw new ApiException("Aadhar number must be 12 digits", HttpStatus.BAD_REQUEST);
        }
        return normalized;
    }

    private String validateDate(String value, String label) {
        try {
            LocalDate.parse(value, DATE_FORMAT);
            return value;
        } catch (DateTimeParseException ex) {
            throw new ApiException(label + " must be in YYYY-MM-DD format", HttpStatus.BAD_REQUEST);
        }
    }

    private String validateMonth(String value, String label) {
        if (!MONTH_PATTERN.matcher(value).matches()) {
            throw new ApiException(label + " must be in YYYY-MM format", HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    private String validatePaymentMethod(String value) {
        if (!Set.of("cash", "upi").contains(value)) {
            throw new ApiException("Payment method must be cash or upi", HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    private String validatePaymentStatus(String value) {
        if (!Set.of("paid", "pending", "due_soon", "overdue").contains(value)) {
            throw new ApiException("Payment status is invalid", HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    private String validateStudentStatus(String value) {
        if (!Set.of("active", "pending", "expired").contains(value)) {
            throw new ApiException("Student status is invalid", HttpStatus.BAD_REQUEST);
        }
        return value;
    }

    private int asInt(Object value, String label) {
        return DocumentUtils.asInt(value, label);
    }

    private int numberValue(Object value) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Integer.parseInt(text);
        }
        return 0;
    }

    private long numberLongValue(Object value) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            return Long.parseLong(text);
        }
        return 0L;
    }

    private String stringValue(Object value) {
        return DocumentUtils.asString(value);
    }

    private Date now() {
        return Date.from(DocumentUtils.nowUtc());
    }

    private Map<String, Object> serialize(Document document) {
        return DocumentUtils.serializeDocument(document);
    }

    private String joinInts(List<Integer> values) {
        return values.stream().map(String::valueOf).reduce((left, right) -> left + ", " + right).orElse("");
    }

    private boolean isDuplicateKey(Exception ex) {
        Throwable current = ex;
        while (current != null) {
            String name = current.getClass().getSimpleName();
            if ("DuplicateKeyException".equals(name) || "MongoWriteException".equals(name)) {
                return true;
            }
            current = current.getCause();
        }
        return false;
    }

    private String csvValue(Object value) {
        String text = value == null ? "" : String.valueOf(value);
        if (text.contains(",") || text.contains("\"") || text.contains("\n")) {
            return "\"" + text.replace("\"", "\"\"") + "\"";
        }
        return text;
    }

    private String normalizeBaseUrl(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }
        return value.endsWith("/") ? value.substring(0, value.length() - 1) : value;
    }
}
