package tracing

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/resource"
	sdktrace "go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// InitTracer bootstraps the OpenTelemetry TracerProvider that exports spans
// to the OTLP collector (Jaeger-bound).  The endpoint is read from the
// OTEL_EXPORTER_OTLP_ENDPOINT environment variable and defaults to
// localhost:4317.
//
// Returns a cleanup function that must be called on shutdown (e.g. deferred).
// Typical usage:
//
//	cleanup, err := tracing.InitTracer(cfg.ServiceName)
//	if err != nil {
//	    log.Fatal("failed to init tracer", zap.Error(err))
//	}
//	defer cleanup()
func InitTracer(serviceName string) (func(), error) {
	endpoint := os.Getenv("OTEL_EXPORTER_OTLP_ENDPOINT")
	if endpoint == "" {
		endpoint = "localhost:4317"
	}

	// Strip the http:// or https:// prefix — the gRPC exporter needs host:port.
	for _, prefix := range []string{"http://", "https://"} {
		if len(endpoint) > len(prefix) && endpoint[:len(prefix)] == prefix {
			endpoint = endpoint[len(prefix):]
			break
		}
	}

	ctx := context.Background()

	conn, err := grpc.NewClient(endpoint,
		grpc.WithTransportCredentials(insecure.NewCredentials()),
	)
	if err != nil {
		return nil, fmt.Errorf("tracing: dial otel-collector: %w", err)
	}

	exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithGRPCConn(conn))
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("tracing: create otlp exporter: %w", err)
	}

	res, err := resource.New(ctx,
		resource.WithAttributes(
			semconv.ServiceName(serviceName),
			semconv.DeploymentEnvironment(deploymentEnv()),
		),
		resource.WithProcess(),
		resource.WithOS(),
	)
	if err != nil {
		// Non-fatal — fall back to default resource.
		res = resource.NewWithAttributes(semconv.SchemaURL,
			semconv.ServiceName(serviceName),
		)
	}

	tp := sdktrace.NewTracerProvider(
		sdktrace.WithBatcher(exporter,
			sdktrace.WithMaxExportBatchSize(512),
			sdktrace.WithBatchTimeout(5*time.Second),
		),
		sdktrace.WithResource(res),
		sdktrace.WithSampler(sdktrace.AlwaysSample()),
	)

	// Set the global TracerProvider and propagator.
	otel.SetTracerProvider(tp)
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	cleanup := func() {
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = tp.Shutdown(shutdownCtx)
		_ = conn.Close()
	}
	return cleanup, nil
}

func deploymentEnv() string {
	env := os.Getenv("DEPLOYMENT_ENV")
	if env == "" {
		return "development"
	}
	return env
}
