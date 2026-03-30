module github.com/trustinbox/analytics-service

go 1.23

require (
	github.com/trustinbox/cornerstone v0.0.0
	go.uber.org/zap v1.27.0
)

require (
	github.com/google/uuid v1.6.0 // indirect
	go.uber.org/multierr v1.11.0 // indirect
)

replace github.com/trustinbox/cornerstone => ../../packages/cornerstone
