package com.gyansthal.backend.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {

    private String jwtSecret;
    private String jwtCookieName;
    private String appBaseUrl;
    private String adminEmail;
    private String adminPasswordHash;
    private long jwtExpiresInSeconds;
    private long admissionLinkExpiresInSeconds;
    private boolean cookieSecure;
    private long photoMaxBytes;
    private long photoUploadMaxBytes;
    private long atlasStorageLimitBytes;
    private int rejectedPhotoRetentionDays;

    public String getJwtSecret() {
        return jwtSecret;
    }

    public void setJwtSecret(String jwtSecret) {
        this.jwtSecret = jwtSecret;
    }

    public String getJwtCookieName() {
        return jwtCookieName;
    }

    public void setJwtCookieName(String jwtCookieName) {
        this.jwtCookieName = jwtCookieName;
    }

    public String getAppBaseUrl() {
        return appBaseUrl;
    }

    public void setAppBaseUrl(String appBaseUrl) {
        this.appBaseUrl = appBaseUrl;
    }

    public String getAdminEmail() {
        return adminEmail;
    }

    public void setAdminEmail(String adminEmail) {
        this.adminEmail = adminEmail;
    }

    public String getAdminPasswordHash() {
        return adminPasswordHash;
    }

    public void setAdminPasswordHash(String adminPasswordHash) {
        this.adminPasswordHash = adminPasswordHash;
    }

    public long getJwtExpiresInSeconds() {
        return jwtExpiresInSeconds;
    }

    public void setJwtExpiresInSeconds(long jwtExpiresInSeconds) {
        this.jwtExpiresInSeconds = jwtExpiresInSeconds;
    }

    public long getAdmissionLinkExpiresInSeconds() {
        return admissionLinkExpiresInSeconds;
    }

    public void setAdmissionLinkExpiresInSeconds(long admissionLinkExpiresInSeconds) {
        this.admissionLinkExpiresInSeconds = admissionLinkExpiresInSeconds;
    }

    public boolean isCookieSecure() {
        return cookieSecure;
    }

    public void setCookieSecure(boolean cookieSecure) {
        this.cookieSecure = cookieSecure;
    }

    public long getPhotoMaxBytes() {
        return photoMaxBytes;
    }

    public void setPhotoMaxBytes(long photoMaxBytes) {
        this.photoMaxBytes = photoMaxBytes;
    }

    public long getPhotoUploadMaxBytes() {
        return photoUploadMaxBytes;
    }

    public void setPhotoUploadMaxBytes(long photoUploadMaxBytes) {
        this.photoUploadMaxBytes = photoUploadMaxBytes;
    }

    public long getAtlasStorageLimitBytes() {
        return atlasStorageLimitBytes;
    }

    public void setAtlasStorageLimitBytes(long atlasStorageLimitBytes) {
        this.atlasStorageLimitBytes = atlasStorageLimitBytes;
    }

    public int getRejectedPhotoRetentionDays() {
        return rejectedPhotoRetentionDays;
    }

    public void setRejectedPhotoRetentionDays(int rejectedPhotoRetentionDays) {
        this.rejectedPhotoRetentionDays = rejectedPhotoRetentionDays;
    }
}
