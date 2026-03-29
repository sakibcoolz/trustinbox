module github.com/trustinbox/worker-service

go 1.23

require (
	github.com/go-redis/redis/v8 v8.11.5
	github.com/trustinbox/cornerstone v0.0.0
	go.uber.org/zap v1.27.0
)

require (
	github.com/cespare/xxhash/v2 v2.1.2 // indirect
	github.com/dgryski/go-rendezvous v0.0.0-20200823014737-9f7001d12a5f // indirect
	go.uber.org/multierr v1.11.0 // indirect
)

replace github.com/trustinbox/cornerstone => ../../packages/cornerstone
