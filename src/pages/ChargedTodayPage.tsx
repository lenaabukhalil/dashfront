import { DashboardLayout } from "@/components/DashboardLayout";
import { LiveActivityPageContent } from "@/features/users/live-activity/LiveActivityPageContent";
import { LIVE_ACTIVITY_PAGE_POLL_MS } from "@/features/users/live-activity/liveActivityShared";

const ChargedTodayPage = () => (
  <DashboardLayout>
    <LiveActivityPageContent mode="today" pollIntervalMs={LIVE_ACTIVITY_PAGE_POLL_MS} />
  </DashboardLayout>
);

export default ChargedTodayPage;
