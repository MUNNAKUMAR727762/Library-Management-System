package com.gyansthal.backend.service;

import com.gyansthal.backend.config.AppProperties;
import com.gyansthal.backend.config.MongoSupport;
import com.gyansthal.backend.support.ApiException;
import com.gyansthal.backend.support.DocumentUtils;
import com.mongodb.client.gridfs.model.GridFSFile;
import com.mongodb.client.gridfs.model.GridFSUploadOptions;
import java.awt.image.BufferedImage;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.util.Date;
import java.util.List;
import javax.imageio.ImageIO;
import net.coobird.thumbnailator.Thumbnails;
import org.bson.Document;
import org.bson.types.ObjectId;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import static com.mongodb.client.model.Filters.eq;

@Service
public class PhotoService {

    public record StoredFile(String filename, String contentType, byte[] bytes) {
    }

    private final MongoSupport mongoSupport;
    private final AppProperties appProperties;

    public PhotoService(MongoSupport mongoSupport, AppProperties appProperties) {
        this.mongoSupport = mongoSupport;
        this.appProperties = appProperties;
    }

    public Document storeStudentPhoto(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException("Student photo is required", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > appProperties.getPhotoUploadMaxBytes()) {
            throw new ApiException(
                    "Photo must be " + (appProperties.getPhotoUploadMaxBytes() / (1024 * 1024)) + " MB or smaller before optimization",
                    HttpStatus.BAD_REQUEST
            );
        }

        String originalFilename = file.getOriginalFilename() == null ? "student-photo" : file.getOriginalFilename();
        String extension = extensionOf(originalFilename);
        if (!List.of("jpg", "jpeg", "png").contains(extension)) {
            throw new ApiException("Photo must be a JPG or PNG image", HttpStatus.BAD_REQUEST);
        }

        BufferedImage image;
        try {
            image = ImageIO.read(file.getInputStream());
        } catch (IOException ex) {
            throw new ApiException("Uploaded file is not a valid image", HttpStatus.BAD_REQUEST);
        }
        if (image == null) {
            throw new ApiException("Uploaded file is not a valid image", HttpStatus.BAD_REQUEST);
        }

        OptimizedImage optimized = optimizeImage(image);
        if (optimized.bytes.length > appProperties.getPhotoMaxBytes()) {
            throw new ApiException("Photo must be " + (appProperties.getPhotoMaxBytes() / 1024) + " KB or smaller", HttpStatus.BAD_REQUEST);
        }

        String filenameRoot = originalFilename.contains(".")
                ? originalFilename.substring(0, originalFilename.lastIndexOf('.'))
                : originalFilename;
        String storedFilename = filenameRoot + ".jpg";
        GridFSUploadOptions options = new GridFSUploadOptions()
                .metadata(new Document("contentType", "image/jpeg")
                        .append("kind", "student_photo")
                        .append("uploaded_at", Date.from(DocumentUtils.nowUtc())));

        ObjectId fileId = mongoSupport.gridFsBucket().uploadFromStream(
                storedFilename,
                new ByteArrayInputStream(optimized.bytes),
                options
        );

        return new Document("photo_file_id", fileId.toHexString())
                .append("photo_filename", storedFilename)
                .append("photo_content_type", "image/jpeg")
                .append("photo_size", optimized.bytes.length)
                .append("photo_width", optimized.width)
                .append("photo_height", optimized.height);
    }

    public StoredFile loadFile(String fileId) {
        ObjectId objectId = DocumentUtils.objectId(fileId);
        GridFSFile gridFSFile = mongoSupport.gridFsBucket().find(eq("_id", objectId)).first();
        if (gridFSFile == null) {
            throw new ApiException("File not found", HttpStatus.NOT_FOUND);
        }

        ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
        mongoSupport.gridFsBucket().downloadToStream(objectId, outputStream);
        String contentType = "application/octet-stream";
        if (gridFSFile.getMetadata() != null) {
            String metadataContentType = gridFSFile.getMetadata().getString("contentType");
            if (metadataContentType != null && !metadataContentType.isBlank()) {
                contentType = metadataContentType;
            }
        }
        return new StoredFile(gridFSFile.getFilename(), contentType, outputStream.toByteArray());
    }

    public void deleteFileSilently(String fileId) {
        if (fileId == null || fileId.isBlank()) {
            return;
        }
        try {
            mongoSupport.gridFsBucket().delete(DocumentUtils.objectId(fileId));
        } catch (Exception ignored) {
        }
    }

    private OptimizedImage optimizeImage(BufferedImage image) {
        int[] maxDimensions = {1400, 1280, 1200, 1080, 960, 840, 720};
        double[] qualities = {0.86, 0.82, 0.78, 0.74, 0.70, 0.66, 0.62, 0.58};
        byte[] bestAttempt = null;
        int bestWidth = image.getWidth();
        int bestHeight = image.getHeight();

        for (int maxDimension : maxDimensions) {
            for (double quality : qualities) {
                try {
                    ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
                    int targetWidth = Math.min(maxDimension, image.getWidth());
                    int targetHeight = Math.min(maxDimension, image.getHeight());
                    Thumbnails.of(image)
                            .size(Math.max(targetWidth, 1), Math.max(targetHeight, 1))
                            .outputFormat("jpg")
                            .outputQuality(quality)
                            .toOutputStream(outputStream);
                    byte[] candidate = outputStream.toByteArray();
                    bestAttempt = candidate;

                    BufferedImage candidateImage = ImageIO.read(new ByteArrayInputStream(candidate));
                    if (candidateImage != null) {
                        bestWidth = candidateImage.getWidth();
                        bestHeight = candidateImage.getHeight();
                    }

                    if (candidate.length <= appProperties.getPhotoMaxBytes()) {
                        return new OptimizedImage(candidate, bestWidth, bestHeight);
                    }
                } catch (IOException ignored) {
                }
            }
        }

        if (bestAttempt == null) {
            throw new ApiException("Unable to process the uploaded photo", HttpStatus.BAD_REQUEST);
        }
        if (bestAttempt.length > appProperties.getPhotoMaxBytes()) {
            throw new ApiException(
                    "Photo is too large to optimize clearly. Please upload a clearer image with less background.",
                    HttpStatus.BAD_REQUEST
            );
        }
        return new OptimizedImage(bestAttempt, bestWidth, bestHeight);
    }

    private String extensionOf(String filename) {
        if (!filename.contains(".")) {
            return "";
        }
        return filename.substring(filename.lastIndexOf('.') + 1).toLowerCase();
    }

    private record OptimizedImage(byte[] bytes, int width, int height) {
    }
}
