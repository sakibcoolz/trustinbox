ARG SERVICE_NAME
ARG SERVICE_DIR=services

FROM golang:1.23-alpine AS builder

ARG SERVICE_NAME
ARG SERVICE_DIR

RUN apk add --no-cache git ca-certificates

WORKDIR /app

# Copy go workspace
COPY go.work go.work
COPY packages/ packages/
COPY services/ services/
COPY gateway/ gateway/

# Build the service
WORKDIR /app/${SERVICE_DIR}/${SERVICE_NAME}
RUN go build -o /app/service ./cmd/server

# Runtime
FROM alpine:3.19

RUN apk add --no-cache ca-certificates tzdata
COPY --from=builder /app/service /usr/local/bin/service

ENTRYPOINT ["/usr/local/bin/service"]
