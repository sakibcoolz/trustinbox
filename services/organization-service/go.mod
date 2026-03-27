module github.com/trustinbox/organization-service

go 1.23

require (
	github.com/google/uuid v1.6.0
	github.com/trustinbox/cornerstone v0.0.0
	go.opentelemetry.io/otel v1.24.0
	go.uber.org/zap v1.27.0
	google.golang.org/grpc v1.62.1
)

require (
	github.com/go-logr/logr v1.4.1 // indirect
	github.com/go-logr/stdr v1.2.2 // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	go.opentelemetry.io/otel/metric v1.24.0 // indirect
	go.opentelemetry.io/otel/trace v1.24.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/net v0.22.0 // indirect
	golang.org/x/sys v0.19.0 // indirect
	golang.org/x/text v0.14.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240318140521-94a12d6c2237 // indirect
	google.golang.org/protobuf v1.33.0 // indirect
)

replace github.com/trustinbox/cornerstone => ../../packages/cornerstone
