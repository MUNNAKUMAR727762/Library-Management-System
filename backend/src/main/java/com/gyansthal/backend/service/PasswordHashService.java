package com.gyansthal.backend.service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.KeySpec;
import java.util.HexFormat;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;
import org.bouncycastle.crypto.generators.SCrypt;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordHashService {

    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

    public boolean matches(String rawPassword, String storedHash) {
        if (storedHash == null || storedHash.isBlank()) {
            return false;
        }
        if (storedHash.startsWith("$2")) {
            return bcrypt.matches(rawPassword, storedHash);
        }
        if (storedHash.startsWith("pbkdf2:")) {
            return matchesPbkdf2(rawPassword, storedHash);
        }
        if (storedHash.startsWith("scrypt:")) {
            return matchesScrypt(rawPassword, storedHash);
        }
        return MessageDigest.isEqual(
                rawPassword.getBytes(StandardCharsets.UTF_8),
                storedHash.getBytes(StandardCharsets.UTF_8)
        );
    }

    public String encodeDefault(String rawPassword) {
        return bcrypt.encode(rawPassword);
    }

    private boolean matchesPbkdf2(String rawPassword, String storedHash) {
        try {
            String[] segments = storedHash.split("\\$");
            String[] methodParts = segments[0].split(":");
            String algorithm = switch (methodParts[1]) {
                case "sha512" -> "PBKDF2WithHmacSHA512";
                case "sha256" -> "PBKDF2WithHmacSHA256";
                default -> "PBKDF2WithHmacSHA256";
            };
            int iterations = Integer.parseInt(methodParts[2]);
            String salt = segments[1];
            byte[] expected = HexFormat.of().parseHex(segments[2]);

            KeySpec spec = new PBEKeySpec(rawPassword.toCharArray(), salt.getBytes(StandardCharsets.UTF_8), iterations, expected.length * 8);
            SecretKeyFactory factory = SecretKeyFactory.getInstance(algorithm);
            byte[] candidate = factory.generateSecret(spec).getEncoded();
            return MessageDigest.isEqual(candidate, expected);
        } catch (Exception ignored) {
            return false;
        }
    }

    private boolean matchesScrypt(String rawPassword, String storedHash) {
        try {
            String[] segments = storedHash.split("\\$");
            String[] methodParts = segments[0].split(":");
            int n = Integer.parseInt(methodParts[1]);
            int r = Integer.parseInt(methodParts[2]);
            int p = Integer.parseInt(methodParts[3]);
            String salt = segments[1];
            byte[] expected = HexFormat.of().parseHex(segments[2]);
            byte[] candidate = SCrypt.generate(
                    rawPassword.getBytes(StandardCharsets.UTF_8),
                    salt.getBytes(StandardCharsets.UTF_8),
                    n,
                    r,
                    p,
                    expected.length
            );
            return MessageDigest.isEqual(candidate, expected);
        } catch (Exception ignored) {
            return false;
        }
    }
}
