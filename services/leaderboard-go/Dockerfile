# syntax=docker/dockerfile:1
# leaderboard-go — SUBB SURFERS leaderboard service (Go 1.23 + Gin + Prometheus)
#
# Stage 1 compiles a static binary. go.sum is generated inside the container via
# `go mod tidy` so the image build is self-contained and reproducible from the
# pinned versions in go.mod.

FROM golang:1.23-alpine AS build
WORKDIR /src
RUN apk add --no-cache git ca-certificates
COPY go.mod ./
COPY . .
ENV CGO_ENABLED=0 GOOS=linux
RUN go mod tidy \
 && go vet ./... \
 && go test ./... \
 && go build -trimpath -ldflags="-s -w" -o /out/leaderboard .

# Stage 2 ships a minimal non-root runtime image.
FROM alpine:3.20
RUN apk add --no-cache ca-certificates \
 && addgroup -S subb \
 && adduser -S -G subb subb
COPY --from=build /out/leaderboard /usr/local/bin/leaderboard
USER subb
EXPOSE 4001
ENV PORT=4001 APP_ENV=production GIN_MODE=release
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:4001/healthz || exit 1
ENTRYPOINT ["leaderboard"]
