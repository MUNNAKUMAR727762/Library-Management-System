package com.gyansthal.backend;

import com.gyansthal.backend.config.AppProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(AppProperties.class)
public class GyanSthalBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(GyanSthalBackendApplication.class, args);
    }
}
