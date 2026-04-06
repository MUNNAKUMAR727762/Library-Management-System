package com.gyansthal.backend.service;

import com.gyansthal.backend.config.AppProperties;
import com.gyansthal.backend.config.MongoSupport;
import com.gyansthal.backend.support.ApiException;
import com.gyansthal.backend.support.DocumentUtils;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.security.Keys;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.Map;
import javax.crypto.SecretKey;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final MongoSupport mongoSupport;
    private final AppProperties appProperties;
    private final PasswordHashService passwordHashService;
    private final SecretKey signingKey;

    public AuthService(
            MongoSupport mongoSupport,
            AppProperties appProperties,
            PasswordHashService passwordHashService
    ) {
        this.mongoSupport = mongoSupport;
        this.appProperties = appProperties;
        this.passwordHashService = passwordHashService;
        this.signingKey = Keys.hmacShaKeyFor(hashSecret(appProperties.getJwtSecret()));
    }

    public Document authenticate(String email, String password) {
        Document user = mongoSupport.collection("users")
                .find(new Document("email", email.strip().toLowerCase()).append("status", "active"))
                .first();
        if (user == null) {
            return null;
        }
        if (!passwordHashService.matches(password, user.getString("password_hash"))) {
            return null;
        }
        mongoSupport.collection("users").updateOne(
                new Document("_id", user.getObjectId("_id")),
                new Document("$set", new Document("last_login_at", Date.from(DocumentUtils.nowUtc())))
        );
        return mongoSupport.collection("users").find(new Document("_id", user.getObjectId("_id"))).first();
    }

    public String createSessionToken(String userId, String email, String role, int sessionVersion) {
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("role", role)
                .claim("session_version", sessionVersion)
                .expiration(Date.from(DocumentUtils.nowUtc().plusSeconds(appProperties.getJwtExpiresInSeconds())))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    public String createAdmissionLinkToken(int seatNumber, int shiftId) {
        return Jwts.builder()
                .claim("type", "admission_link")
                .claim("seat_number", seatNumber)
                .claim("shift_id", shiftId)
                .expiration(Date.from(DocumentUtils.nowUtc().plusSeconds(appProperties.getAdmissionLinkExpiresInSeconds())))
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    public Map<String, Object> verifyAdmissionLinkToken(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            if (!"admission_link".equals(claims.get("type", String.class))) {
                return null;
            }
            Map<String, Object> payload = new LinkedHashMap<>();
            payload.put("seat_number", claims.get("seat_number", Integer.class));
            payload.put("shift_id", claims.get("shift_id", Integer.class));
            return payload;
        } catch (JwtException ex) {
            return null;
        }
    }

    public Document getCurrentUser(HttpServletRequest request) {
        String token = readToken(request);
        if (token == null || token.isBlank()) {
            return null;
        }
        try {
            Claims claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
            ObjectId userId = DocumentUtils.objectId(claims.getSubject());
            Document user = mongoSupport.collection("users")
                    .find(new Document("_id", userId).append("status", "active"))
                    .first();
            if (user == null) {
                return null;
            }
            int tokenSessionVersion = claims.get("session_version", Integer.class);
            int userSessionVersion = ((Number) user.getOrDefault("session_version", 0)).intValue();
            if (tokenSessionVersion != userSessionVersion) {
                return null;
            }
            return user;
        } catch (RuntimeException ex) {
            return null;
        }
    }

    public Document requireUser(HttpServletRequest request) {
        Document user = getCurrentUser(request);
        if (user == null) {
            throw new ApiException("Authentication required", HttpStatus.UNAUTHORIZED);
        }
        return user;
    }

    public String readToken(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if (appProperties.getJwtCookieName().equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        String authorization = request.getHeader("Authorization");
        if (authorization != null && authorization.startsWith("Bearer ")) {
            return authorization.substring(7);
        }
        return null;
    }

    public String currentActorName(Document user) {
        if (user == null) {
            return "System";
        }
        String email = user.getString("email");
        String name = user.getString("name");
        if (email != null && !email.isBlank()) {
            return email;
        }
        if (name != null && !name.isBlank()) {
            return name;
        }
        return "Admin";
    }

    private byte[] hashSecret(String value) {
        try {
            return MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8));
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException("Unable to initialize JWT secret", ex);
        }
    }
}
