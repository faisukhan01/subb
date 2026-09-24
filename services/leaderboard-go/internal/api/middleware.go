package api

import (
	"log"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

// corsMiddleware allows every origin with the standard method/header set.
// The web client is public, so credentials are never allowed together with
// the "*" origin.
func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept, Authorization, X-Requested-With")
		c.Header("Access-Control-Max-Age", "86400")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// requestLogger logs one line per request, skipping /metrics scrapes to keep
// the log stream readable.
func requestLogger() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		if c.Request.URL.Path == "/metrics" {
			return
		}
		log.Printf("%s %s -> %d (%s) ip=%s",
			c.Request.Method,
			c.Request.URL.Path,
			c.Writer.Status(),
			time.Since(start).Round(time.Microsecond),
			c.ClientIP(),
		)
	}
}
