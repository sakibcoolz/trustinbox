package clients

import (
	"fmt"
	"os"

	analyticspb "github.com/trustinbox/proto/gen/analytics/v1"
	authpb "github.com/trustinbox/proto/gen/auth/v1"
	botpb "github.com/trustinbox/proto/gen/bot/v1"
	commpb "github.com/trustinbox/proto/gen/communication/v1"
	notifpb "github.com/trustinbox/proto/gen/notification/v1"
	orgpb "github.com/trustinbox/proto/gen/organization/v1"
	policypb "github.com/trustinbox/proto/gen/policy/v1"
	userpb "github.com/trustinbox/proto/gen/user/v1"
	webhookpb "github.com/trustinbox/proto/gen/webhook/v1"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
)

// ServiceClients holds gRPC client connections to all backend services.
type ServiceClients struct {
	Auth          authpb.AuthServiceClient
	User          userpb.UserServiceClient
	Policy        policypb.PolicyServiceClient
	Notification  notifpb.NotificationServiceClient
	Communication commpb.CommunicationServiceClient
	Organization  orgpb.ServiceProviderServiceClient
	Bot           botpb.BotServiceClient
	Webhook       webhookpb.WebhookServiceClient
	Analytics     analyticspb.AnalyticsServiceClient

	conns []*grpc.ClientConn
}

// NewServiceClients dials all backend gRPC services using addresses from
// environment variables, falling back to localhost defaults.
func NewServiceClients(log *zap.Logger) (*ServiceClients, error) {
	sc := &ServiceClients{}

	type svcDef struct {
		envKey  string
		defAddr string
		name    string
		wire    func(*grpc.ClientConn)
	}

	defs := []svcDef{
		{"AUTH_SERVICE_ADDR", "localhost:50051", "auth-service", func(c *grpc.ClientConn) { sc.Auth = authpb.NewAuthServiceClient(c) }},
		{"USER_SERVICE_ADDR", "localhost:50052", "user-service", func(c *grpc.ClientConn) { sc.User = userpb.NewUserServiceClient(c) }},
		{"POLICY_SERVICE_ADDR", "localhost:50053", "policy-service", func(c *grpc.ClientConn) { sc.Policy = policypb.NewPolicyServiceClient(c) }},
		{"NOTIFICATION_SERVICE_ADDR", "localhost:50055", "notification-service", func(c *grpc.ClientConn) { sc.Notification = notifpb.NewNotificationServiceClient(c) }},
		{"COMMUNICATION_SERVICE_ADDR", "localhost:50056", "communication-service", func(c *grpc.ClientConn) { sc.Communication = commpb.NewCommunicationServiceClient(c) }},
		{"ORG_SERVICE_ADDR", "localhost:50054", "organization-service", func(c *grpc.ClientConn) { sc.Organization = orgpb.NewServiceProviderServiceClient(c) }},
		{"BOT_SERVICE_ADDR", "localhost:50059", "bot-service", func(c *grpc.ClientConn) { sc.Bot = botpb.NewBotServiceClient(c) }},
		{"WEBHOOK_SERVICE_ADDR", "localhost:50060", "webhook-service", func(c *grpc.ClientConn) { sc.Webhook = webhookpb.NewWebhookServiceClient(c) }},
		{"ANALYTICS_SERVICE_ADDR", "localhost:50061", "analytics-service", func(c *grpc.ClientConn) { sc.Analytics = analyticspb.NewAnalyticsServiceClient(c) }},
	}

	for _, d := range defs {
		addr := os.Getenv(d.envKey)
		if addr == "" {
			addr = d.defAddr
		}
		conn, err := grpc.NewClient(addr, grpc.WithTransportCredentials(insecure.NewCredentials()))
		if err != nil {
			sc.Close()
			return nil, fmt.Errorf("dial %s at %s: %w", d.name, addr, err)
		}
		sc.conns = append(sc.conns, conn)
		d.wire(conn)
		log.Info("gRPC client ready", zap.String("service", d.name), zap.String("addr", addr))
	}

	return sc, nil
}

// Close closes all gRPC client connections.
func (sc *ServiceClients) Close() {
	for _, c := range sc.conns {
		_ = c.Close()
	}
}
