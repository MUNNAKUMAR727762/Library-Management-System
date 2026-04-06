package com.gyansthal.backend.config;

import com.mongodb.client.MongoClient;
import com.mongodb.client.MongoCollection;
import com.mongodb.client.MongoDatabase;
import com.mongodb.client.gridfs.GridFSBucket;
import com.mongodb.client.gridfs.GridFSBuckets;
import org.bson.Document;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class MongoSupport {

    private final MongoDatabase database;
    private final GridFSBucket gridFsBucket;

    public MongoSupport(MongoClient mongoClient, @Value("${spring.data.mongodb.database}") String databaseName) {
        this.database = mongoClient.getDatabase(databaseName);
        this.gridFsBucket = GridFSBuckets.create(this.database, "student_photos");
    }

    public MongoDatabase database() {
        return database;
    }

    public MongoCollection<Document> collection(String name) {
        return database.getCollection(name);
    }

    public GridFSBucket gridFsBucket() {
        return gridFsBucket;
    }
}
