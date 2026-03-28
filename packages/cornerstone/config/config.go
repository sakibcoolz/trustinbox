package config

import (
	"fmt"
	"os"
	"strconv"
	"time"
)

// GetEnv returns the value of an environment variable or a default.
func GetEnv(key, defaultValue string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return defaultValue
}

// MustGetEnv panics if the env var is not set.
func MustGetEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("required environment variable %s is not set", key))
	}
	return v
}

// GetEnvInt returns an int environment variable or a default.
func GetEnvInt(key string, defaultValue int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return defaultValue
}

// GetEnvDuration returns a duration environment variable or a default.
func GetEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if v := os.Getenv(key); v != "" {
		if d, err := time.ParseDuration(v); err == nil {
			return d
		}
	}
	return defaultValue
}

// GetEnvBool returns a bool environment variable or a default.
func GetEnvBool(key string, defaultValue bool) bool {
	if v := os.Getenv(key); v != "" {
		if b, err := strconv.ParseBool(v); err == nil {
			return b
		}
	}
	return defaultValue
}

// ServiceConfig contains common service configuration.
type ServiceConfig struct {
	ServiceName string
	GRPCPort    string
	HTTPPort    string
	DatabaseURL string
	RedisURL    string
	JWTSecret   string
	LogLevel    string
}

// LoadServiceConfig loads common configuration from environment.
func LoadServiceConfig(serviceName string) ServiceConfig {
	return ServiceConfig{
		ServiceName: serviceName,
		GRPCPort:    GetEnv("GRPC_PORT", "50051"),
		HTTPPort:    GetEnv("HTTP_PORT", "4000"),
		DatabaseURL: GetEnv("DATABASE_URL", "postgres://trustinbox:trustinbox_dev@localhost:5432/trustinbox?sslmode=disable"),
		RedisURL:    GetEnv("REDIS_URL", "redis://localhost:6379"),
		JWTSecret:   GetEnv("JWT_SECRET", "dev-secret-change-in-production"),
		LogLevel:    GetEnv("LOG_LEVEL", "info"),
	}
}
