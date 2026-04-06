package com.gyansthal.backend.support;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;

public final class DocumentUtils {

    private DocumentUtils() {
    }

    public static Instant nowUtc() {
        return Instant.now();
    }

    public static ObjectId objectId(String value) {
        try {
            return new ObjectId(value);
        } catch (IllegalArgumentException ex) {
            throw new ApiException("Invalid identifier", HttpStatus.BAD_REQUEST);
        }
    }

    public static Map<String, Object> serializeDocument(Document document) {
        if (document == null) {
            return null;
        }

        Map<String, Object> serialized = new LinkedHashMap<>();
        for (Map.Entry<String, Object> entry : document.entrySet()) {
            serialized.put(entry.getKey(), serializeValue(entry.getValue()));
        }
        return serialized;
    }

    @SuppressWarnings("unchecked")
    public static Object serializeValue(Object value) {
        if (value instanceof ObjectId objectId) {
            return objectId.toHexString();
        }
        if (value instanceof Date date) {
            return date.toInstant().toString();
        }
        if (value instanceof Instant instant) {
            return instant.toString();
        }
        if (value instanceof Document document) {
            return serializeDocument(document);
        }
        if (value instanceof Map<?, ?> map) {
            Map<String, Object> serialized = new LinkedHashMap<>();
            for (Map.Entry<?, ?> entry : map.entrySet()) {
                serialized.put(String.valueOf(entry.getKey()), serializeValue(entry.getValue()));
            }
            return serialized;
        }
        if (value instanceof List<?> list) {
            List<Object> serialized = new ArrayList<>();
            for (Object item : list) {
                serialized.add(serializeValue(item));
            }
            return serialized;
        }
        return value;
    }

    public static int asInt(Object value, String label) {
        if (value instanceof Number number) {
            return number.intValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Integer.parseInt(text.trim());
            } catch (NumberFormatException ex) {
                throw new ApiException(label + " must be a number", HttpStatus.BAD_REQUEST);
            }
        }
        throw new ApiException(label + " must be a number", HttpStatus.BAD_REQUEST);
    }

    public static long asLong(Object value, String label) {
        if (value instanceof Number number) {
            return number.longValue();
        }
        if (value instanceof String text && !text.isBlank()) {
            try {
                return Long.parseLong(text.trim());
            } catch (NumberFormatException ex) {
                throw new ApiException(label + " must be a number", HttpStatus.BAD_REQUEST);
            }
        }
        throw new ApiException(label + " must be a number", HttpStatus.BAD_REQUEST);
    }

    public static String asString(Object value) {
        return value == null ? "" : String.valueOf(value);
    }
}
