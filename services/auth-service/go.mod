module github.com/trustinbox/auth-service

go 1.24.0

require (
	github.com/google/uuid v1.6.0
	github.com/trustinbox/cornerstone v0.0.0
	github.com/trustinbox/proto v0.0.0
	go.uber.org/zap v1.27.0
	golang.org/x/crypto v0.46.0
	google.golang.org/grpc v1.79.3
)

require (
	github.com/golang-jwt/jwt/v5 v5.2.1 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/net v0.48.0 // indirect
	golang.org/x/sys v0.39.0 // indirect
	golang.org/x/text v0.32.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20251202230838-ff82c1b0f217 // indirect
	google.golang.org/protobuf v1.36.11 // indirect
)

replace (
	github.com/trustinbox/cornerstone => ../../packages/cornerstone
	github.com/trustinbox/proto => ../../packages/proto
)
