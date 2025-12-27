FROM golang:1.21-alpine AS builder

WORKDIR /app

# Install dependencies first for better caching
COPY go.mod go.sum ./
RUN go mod download

# Copy the rest of the application
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -o main ./cmd/server/main.go

# Final stage
FROM alpine:latest

WORKDIR /app

# Copy the binary from the builder
COPY --from=builder /app/main .

# Environment variables are injected by Railway/Docker at runtime

# Export port
EXPOSE 8080

# Command to run the application
CMD ["./main"]
