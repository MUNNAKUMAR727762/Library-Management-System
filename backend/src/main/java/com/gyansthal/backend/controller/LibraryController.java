package com.gyansthal.backend.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.gyansthal.backend.config.AppProperties;
import com.gyansthal.backend.service.AuthService;
import com.gyansthal.backend.service.LibraryService;
import com.gyansthal.backend.service.PhotoService;
import jakarta.servlet.http.HttpServletRequest;
import java.util.LinkedHashMap;
import java.util.Map;
import org.bson.Document;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.MultiValueMap;

@RestController
@RequestMapping("/api")
public class LibraryController {

    private final AuthService authService;
    private final LibraryService libraryService;
    private final AppProperties appProperties;
    private final ObjectMapper objectMapper;

    public LibraryController(
            AuthService authService,
            LibraryService libraryService,
            AppProperties appProperties,
            ObjectMapper objectMapper
    ) {
        this.authService = authService;
        this.libraryService = libraryService;
        this.appProperties = appProperties;
        this.objectMapper = objectMapper;
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> health() {
        boolean databaseOk;
        Map<String, Object> storage;
        try {
            storage = libraryService.databaseStorageStats();
            databaseOk = true;
        } catch (Exception ex) {
            storage = Map.of();
            databaseOk = false;
        }
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("ok", true);
        payload.put("database", Map.of("ping", databaseOk));
        payload.put("storage", storage);
        return ResponseEntity.ok(payload);
    }

    @PostMapping("/auth/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody(required = false) Map<String, Object> payload) {
        Map<String, Object> request = payload == null ? Map.of() : payload;
        String email = String.valueOf(request.getOrDefault("email", "")).trim().toLowerCase();
        String password = String.valueOf(request.getOrDefault("password", ""));
        Document user = authService.authenticate(email, password);
        if (user == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid credentials"));
        }

        String token = authService.createSessionToken(
                user.getObjectId("_id").toHexString(),
                user.getString("email"),
                user.getString("role"),
                ((Number) user.getOrDefault("session_version", 0)).intValue()
        );

        ResponseCookie cookie = ResponseCookie.from(appProperties.getJwtCookieName(), token)
                .httpOnly(true)
                .secure(appProperties.isCookieSecure())
                .sameSite("Lax")
                .maxAge(appProperties.getJwtExpiresInSeconds())
                .path("/")
                .build();

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("user", Map.of(
                "id", user.getObjectId("_id").toHexString(),
                "email", user.getString("email"),
                "role", user.getString("role")
        ));

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(body);
    }

    @PostMapping("/auth/logout")
    public ResponseEntity<Map<String, Object>> logout() {
        ResponseCookie cookie = ResponseCookie.from(appProperties.getJwtCookieName(), "")
                .httpOnly(true)
                .secure(appProperties.isCookieSecure())
                .sameSite("Lax")
                .maxAge(0)
                .path("/")
                .build();
        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(Map.of("ok", true));
    }

    @GetMapping("/auth/me")
    public ResponseEntity<Map<String, Object>> me(HttpServletRequest request) {
        Document user = authService.getCurrentUser(request);
        if (user == null) {
            return ResponseEntity.ok(Map.of("user", null));
        }
        return ResponseEntity.ok(Map.of(
                "user", Map.of(
                        "id", user.getObjectId("_id").toHexString(),
                        "email", user.getString("email"),
                        "role", user.getString("role")
                )
        ));
    }

    @GetMapping("/settings")
    public ResponseEntity<Map<String, Object>> settings(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("settings", libraryService.getSettings()));
    }

    @GetMapping("/dashboard/summary")
    public ResponseEntity<Map<String, Object>> dashboardSummary(@RequestParam(defaultValue = "1") int shift, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("summary", libraryService.dashboardSummary(shift)));
    }

    @GetMapping("/dashboard/charts")
    public ResponseEntity<Map<String, Object>> dashboardCharts(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("charts", libraryService.dashboardCharts()));
    }

    @GetMapping("/dashboard/storage")
    public ResponseEntity<Map<String, Object>> dashboardStorage(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("storage", libraryService.databaseStorageStats()));
    }

    @PostMapping("/maintenance/cleanup-rejected-photos")
    public ResponseEntity<Map<String, Object>> cleanupRejectedPhotos(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("cleanup", libraryService.cleanupRejectedRequestPhotos()));
    }

    @GetMapping("/export/{collectionName}")
    public ResponseEntity<ByteArrayResource> exportData(
            @PathVariable String collectionName,
            @RequestParam(defaultValue = "json") String format,
            HttpServletRequest request
    ) throws Exception {
        authService.requireUser(request);
        byte[] bytes;
        String filename;
        MediaType mediaType;
        if ("csv".equalsIgnoreCase(format)) {
            bytes = libraryService.exportCollectionCsv(collectionName).getBytes();
            filename = collectionName + ".csv";
            mediaType = MediaType.parseMediaType("text/csv");
        } else {
            bytes = objectMapper.writerWithDefaultPrettyPrinter().writeValueAsBytes(libraryService.exportCollectionRows(collectionName));
            filename = collectionName + ".json";
            mediaType = MediaType.APPLICATION_JSON;
        }
        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(new ByteArrayResource(bytes));
    }

    @GetMapping("/seats")
    public ResponseEntity<Map<String, Object>> seats(@RequestParam(required = false) Integer shift, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("seats", libraryService.buildSeats(shift)));
    }

    @GetMapping("/seats/{shiftId}/{seatNumber}/admission-link")
    public ResponseEntity<Map<String, Object>> admissionLink(
            @PathVariable int shiftId,
            @PathVariable int seatNumber,
            HttpServletRequest request
    ) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("link", libraryService.getAdmissionLink(shiftId, seatNumber)));
    }

    @PatchMapping("/seats/{shiftId}/{seatNumber}/disable")
    public ResponseEntity<Map<String, Object>> disableSeat(@PathVariable int shiftId, @PathVariable int seatNumber, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("settings", libraryService.disableSeat(shiftId, seatNumber)));
    }

    @PatchMapping("/seats/{shiftId}/{seatNumber}/enable")
    public ResponseEntity<Map<String, Object>> enableSeat(@PathVariable int shiftId, @PathVariable int seatNumber, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("settings", libraryService.enableSeat(shiftId, seatNumber)));
    }

    @GetMapping("/students")
    public ResponseEntity<Map<String, Object>> students(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("students", libraryService.listStudents()));
    }

    @GetMapping("/students/{studentId}")
    public ResponseEntity<Map<String, Object>> student(@PathVariable String studentId, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("student", libraryService.getStudent(studentId)));
    }

    @GetMapping("/students/{studentId}/details")
    public ResponseEntity<Map<String, Object>> studentDetails(@PathVariable String studentId, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(libraryService.getStudentDetail(studentId));
    }

    @PostMapping("/students")
    public ResponseEntity<Map<String, Object>> createStudent(@RequestBody(required = false) Map<String, Object> payload, HttpServletRequest request) {
        Document user = authService.requireUser(request);
        Map<String, Object> student = libraryService.createStudent(payload == null ? Map.of() : payload, authService.currentActorName(user));
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("student", student));
    }

    @PatchMapping("/students/{studentId}")
    public ResponseEntity<Map<String, Object>> updateStudent(
            @PathVariable String studentId,
            @RequestBody(required = false) Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Document user = authService.requireUser(request);
        return ResponseEntity.ok(Map.of("student", libraryService.updateStudent(studentId, payload == null ? Map.of() : payload, authService.currentActorName(user))));
    }

    @DeleteMapping("/students/{studentId}")
    public ResponseEntity<Map<String, Object>> deleteStudent(@PathVariable String studentId, HttpServletRequest request) {
        authService.requireUser(request);
        libraryService.deleteStudent(studentId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @PostMapping("/students/{studentId}/change-seat")
    public ResponseEntity<Map<String, Object>> changeStudentSeat(
            @PathVariable String studentId,
            @RequestBody(required = false) Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Document user = authService.requireUser(request);
        Map<String, Object> body = payload == null ? Map.of() : payload;
        int seatNumber = ((Number) body.get("seat_number")).intValue();
        @SuppressWarnings("unchecked") java.util.List<Number> rawShiftIds = (java.util.List<Number>) body.get("shift_ids");
        java.util.List<Integer> shiftIds = rawShiftIds.stream().map(Number::intValue).toList();
        return ResponseEntity.ok(Map.of("student", libraryService.changeStudentSeat(studentId, seatNumber, shiftIds, authService.currentActorName(user))));
    }

    @GetMapping("/students/{studentId}/history")
    public ResponseEntity<Map<String, Object>> studentHistory(@PathVariable String studentId, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("history", libraryService.getStudentHistory(studentId)));
    }

    @GetMapping("/payments")
    public ResponseEntity<Map<String, Object>> payments(@RequestParam(name = "student_id", required = false) String studentId, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("payments", libraryService.listPayments(studentId)));
    }

    @PostMapping("/payments")
    public ResponseEntity<Map<String, Object>> createPayment(@RequestBody(required = false) Map<String, Object> payload, HttpServletRequest request) {
        Document user = authService.requireUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(Map.of("payment", libraryService.createPayment(payload == null ? Map.of() : payload, authService.currentActorName(user))));
    }

    @PatchMapping("/payments/{paymentId}")
    public ResponseEntity<Map<String, Object>> updatePayment(
            @PathVariable String paymentId,
            @RequestBody(required = false) Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Document user = authService.requireUser(request);
        return ResponseEntity.ok(Map.of("payment", libraryService.updatePayment(paymentId, payload == null ? Map.of() : payload, authService.currentActorName(user))));
    }

    @DeleteMapping("/payments/{paymentId}")
    public ResponseEntity<Map<String, Object>> deletePayment(@PathVariable String paymentId, HttpServletRequest request) {
        authService.requireUser(request);
        libraryService.deletePayment(paymentId);
        return ResponseEntity.ok(Map.of("ok", true));
    }

    @GetMapping("/notifications")
    public ResponseEntity<Map<String, Object>> notifications(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("notifications", libraryService.listNotifications()));
    }

    @PatchMapping("/notifications/{notificationId}/read")
    public ResponseEntity<Map<String, Object>> readNotification(@PathVariable String notificationId, HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("notification", libraryService.readNotification(notificationId)));
    }

    @GetMapping("/admission-requests")
    public ResponseEntity<Map<String, Object>> admissionRequests(HttpServletRequest request) {
        authService.requireUser(request);
        return ResponseEntity.ok(Map.of("requests", libraryService.listAdmissionRequests()));
    }

    @GetMapping("/files/{fileId}")
    public ResponseEntity<ByteArrayResource> file(@PathVariable String fileId, HttpServletRequest request) {
        authService.requireUser(request);
        PhotoService.StoredFile file = libraryService.loadFile(fileId);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.filename() + "\"")
                .body(new ByteArrayResource(file.bytes()));
    }

    @PostMapping(path = "/public/admission-requests", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> createAdmissionRequest(
            @RequestParam MultiValueMap<String, String> form,
            @RequestPart(name = "photo", required = false) MultipartFile photo
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(Map.of("request", libraryService.createAdmissionRequest(form, photo)));
    }

    @GetMapping("/public/admission-form")
    public ResponseEntity<Map<String, Object>> publicAdmissionForm(@RequestParam String token) {
        return ResponseEntity.ok(Map.of("form", libraryService.admissionFormDetails(token)));
    }

    @PostMapping("/admission-requests/{requestId}/approve")
    public ResponseEntity<Map<String, Object>> approveAdmissionRequest(
            @PathVariable String requestId,
            @RequestBody(required = false) Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Document user = authService.requireUser(request);
        return ResponseEntity.ok(Map.of("student", libraryService.approveAdmissionRequest(
                requestId,
                payload == null ? Map.of() : payload,
                authService.currentActorName(user),
                user.getObjectId("_id").toHexString()
        )));
    }

    @PostMapping("/admission-requests/{requestId}/reject")
    public ResponseEntity<Map<String, Object>> rejectAdmissionRequest(
            @PathVariable String requestId,
            @RequestBody(required = false) Map<String, Object> payload,
            HttpServletRequest request
    ) {
        Document user = authService.requireUser(request);
        String reason = payload == null ? "" : String.valueOf(payload.getOrDefault("reason", ""));
        return ResponseEntity.ok(Map.of("request", libraryService.rejectAdmissionRequest(requestId, reason, user.getObjectId("_id").toHexString())));
    }
}
