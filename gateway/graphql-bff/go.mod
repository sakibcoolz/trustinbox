module github.com/trustinbox/graphql-bff

go 1.23

require (
	github.com/google/uuid v1.6.0
	github.com/lib/pq v1.10.9
	github.com/trustinbox/cornerstone v0.0.0
	go.uber.org/zap v1.27.0
	golang.org/x/crypto v0.22.0
)

require (
	github.com/golang-jwt/jwt/v5 v5.2.1 // indirect
	go.uber.org/multierr v1.11.0 // indirect
)

replace github.com/trustinbox/cornerstone => ../../packages/cornerstone
