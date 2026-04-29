import { registerOTel } from '@vercel/otel';

export function register() {
  registerOTel({
    serviceName: 'trustinbox-admin',
    // Traces are exported to the OTel collector via OTLP HTTP.
    // In Docker: OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
    // Locally:   OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
  });
}
