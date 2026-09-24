package com.subb.tournament.service;

/** The request conflicts with current state (mapped to HTTP 409). */
public class ConflictException extends RuntimeException {

    public ConflictException(String code) {
        super(code);
    }
}
