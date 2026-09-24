package com.subb.tournament.service;

/** A requested resource does not exist (mapped to HTTP 404). */
public class NotFoundException extends RuntimeException {

    public NotFoundException(String code) {
        super(code);
    }
}
