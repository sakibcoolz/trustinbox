module github.com/trustinbox/auth-service

go 1.23

require (
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.10.9
	github.com/trustinbox/cornerstone v0.0.0
	github.com/trustinbox/proto v0.0.0
	go.uber.org/zap v1.27.0
	golang.org/x/crypto v0.28.0
	google.golang.org/grpc v1.62.1
)

require (
	github.com/golang-jwt/jwt/v5 v5.2.1 // indirect
	github.com/golang/protobuf v1.5.4 // indirect
	go.uber.org/multierr v1.11.0 // indirect
	golang.org/x/net v0.30.0 // indirect
	golang.org/x/sys v0.26.0 // indirect
	golang.org/x/text v0.19.0 // indirect
	google.golang.org/genproto/googleapis/rpc v0.0.0-20240318140521-94a12d6c2237 // indirect
	google.golang.org/protobuf v1.33.0 // indirect
)

replace github.com/trustinbox/cornerstone => ../../packages/cornerstone

replace github.com/trustinbox/proto => ../../packages/proto
