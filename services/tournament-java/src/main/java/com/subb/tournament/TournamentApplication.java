package com.subb.tournament;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * SUBB SURFERS tournament service entry point (port 4003).
 *
 * <p>Runs an in-memory tournament store with time-based lifecycle transitions
 * driven by a scheduled task. See README.md for the REST contract.
 */
@SpringBootApplication
@EnableScheduling
public class TournamentApplication {

    public static void main(String[] args) {
        SpringApplication.run(TournamentApplication.class, args);
    }
}
