// src/app/(admin)/admin/webhooks/page.jsx
import WebhookAdminClient from "./_components/WebhookAdminClient";

export const dynamic = "force-dynamic";

export default function AdminWebhooksPage() {
  return <WebhookAdminClient />;
}
