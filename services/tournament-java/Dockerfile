# syntax=docker/dockerfile:1
# tournament-java — SUBB SURFERS tournament service (Spring Boot 3.3 / Java 21)

# Stage 1: build the boot jar (tests run as part of the package phase).
FROM maven:3.9-eclipse-temurin-21 AS build
WORKDIR /build
COPY pom.xml ./
RUN mvn -B -q dependency:go-offline
COPY src ./src
RUN mvn -B clean package

# Stage 2: minimal JRE runtime, non-root.
FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S subb && adduser -S subb -G subb
WORKDIR /app
COPY --from=build /build/target/subb-tournament.jar app.jar
USER subb
EXPOSE 4003
ENV PORT=4003 \
    JAVA_OPTS="-XX:MaxRAMPercentage=75.0 -XX:+ExitOnOutOfMemoryError"
HEALTHCHECK --interval=30s --timeout=3s --start-period=25s --retries=5 \
  CMD wget -q -O /dev/null http://127.0.0.1:4003/healthz || exit 1
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
