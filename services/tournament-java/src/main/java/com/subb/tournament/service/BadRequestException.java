package com.subb.tournament.service;

/** Semantically invalid request (mapped to HTTP 400). */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String code) {
        super(code);
    }
}
