import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveActivityPageContent } from "@/features/users/live-activity/LiveActivityPageContent";
import { LIVE_ACTIVITY_PAGE_POLL_MS } from "@/features/users/live-activity/liveActivityShared";

const ChargingNowPage = () => (
  <DashboardLayout>
    <LiveActivityPageContent mode="charging" pollIntervalMs={LIVE_ACTIVITY_PAGE_POLL_MS} />
  </DashboardLayout>
);

export default ChargingNowPage;
