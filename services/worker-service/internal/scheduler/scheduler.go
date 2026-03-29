package scheduler

import (
	"context"
	"time"

	"go.uber.org/zap"
)

// Scheduler runs periodic maintenance tasks inside the worker service.
type Scheduler struct {
	log  *zap.Logger
	stop chan struct{}
}

// New creates a Scheduler.
func New(log *zap.Logger) *Scheduler {
	return &Scheduler{
		log:  log,
		stop: make(chan struct{}),
	}
}

// Start launches background tickers for periodic jobs.
//
//   - Every 5 minutes: expiration / TTL checks
//   - Every hour:      cleanup / archiving
func (s *Scheduler) Start(ctx context.Context) {
	go s.run(ctx)
}

// Stop signals the scheduler to shut down.
func (s *Scheduler) Stop() {
	close(s.stop)
}

func (s *Scheduler) run(ctx context.Context) {
	s.log.Info("scheduler started")

	expirationTicker := time.NewTicker(5 * time.Minute)
	cleanupTicker := time.NewTicker(time.Hour)
	defer expirationTicker.Stop()
	defer cleanupTicker.Stop()

	for {
		select {
		case <-ctx.Done():
			s.log.Info("scheduler context cancelled")
			return
		case <-s.stop:
			s.log.Info("scheduler stopping")
			return
		case t := <-expirationTicker.C:
			s.log.Info("scheduler tick: expiration check", zap.Time("tick", t))
			// TODO: enqueue expiration-check jobs via queue consumer
		case t := <-cleanupTicker.C:
			s.log.Info("scheduler tick: cleanup", zap.Time("tick", t))
			// TODO: enqueue cleanup jobs via queue consumer
		}
	}
}
