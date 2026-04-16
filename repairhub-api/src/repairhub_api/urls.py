from django.contrib import admin
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from apps.accounts.api import (
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
    UserProfileView,
)
from apps.admin_ops.api import AdminAuditLogViewSet, OpsDashboardView
from apps.ai.api import AIAuditViewSet
from apps.catalog.api import PricingRuleViewSet, RepairerServiceViewSet, ServiceCategoryViewSet
from apps.chat.api import JobMessageViewSet
from apps.community.api import EventViewSet, ForumReplyViewSet, ForumThreadViewSet, TutorialViewSet
from apps.notifications.api import NotificationViewSet
from apps.payments.api import PaymentRecordViewSet, PayoutLedgerEntryViewSet
from apps.repairers.api import RepairerApplicationViewSet, RepairerProfileViewSet
from apps.repairs.api import (
    BookingViewSet,
    RepairJobViewSet,
    RepairRequestViewSet,
    ReviewViewSet,
    SignedUploadView,
)
from apps.rewards.api import RewardLedgerViewSet, RewardRuleViewSet
from repairhub_api.jwt import RepairHubTokenObtainPairView

router = DefaultRouter()
router.register("repairer-applications", RepairerApplicationViewSet, basename="repairer-application")
router.register("repairer-profiles", RepairerProfileViewSet, basename="repairer-profile")
router.register("service-categories", ServiceCategoryViewSet, basename="service-category")
router.register("repairer-services", RepairerServiceViewSet, basename="repairer-service")
router.register("pricing-rules", PricingRuleViewSet, basename="pricing-rule")
router.register("repair-requests", RepairRequestViewSet, basename="repair-request")
router.register("bookings", BookingViewSet, basename="booking")
router.register("jobs", RepairJobViewSet, basename="job")
router.register("reviews", ReviewViewSet, basename="review")
router.register("ai-audits", AIAuditViewSet, basename="ai-audit")
router.register("payments", PaymentRecordViewSet, basename="payment")
router.register("payouts", PayoutLedgerEntryViewSet, basename="payout")
router.register("messages", JobMessageViewSet, basename="message")
router.register("tutorials", TutorialViewSet, basename="tutorial")
router.register("events", EventViewSet, basename="event")
router.register("forum-threads", ForumThreadViewSet, basename="forum-thread")
router.register("forum-replies", ForumReplyViewSet, basename="forum-reply")
router.register("reward-rules", RewardRuleViewSet, basename="reward-rule")
router.register("reward-ledger", RewardLedgerViewSet, basename="reward-ledger")
router.register("notifications", NotificationViewSet, basename="notification")
router.register("admin-audit-logs", AdminAuditLogViewSet, basename="admin-audit-log")

urlpatterns = [
    path("admins/", admin.site.urls),
    path("api/auth/register/", RegisterView.as_view(), name="register"),
    path("api/auth/login/", RepairHubTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="token_refresh"),
    path("api/auth/me/", UserProfileView.as_view(), name="user-profile"),
    path("api/auth/password-reset/", PasswordResetRequestView.as_view(), name="password-reset-request"),
    path("api/auth/password-reset/confirm/", PasswordResetConfirmView.as_view(), name="password-reset-confirm"),
    path("api/uploads/signed/", SignedUploadView.as_view(), name="signed-upload"),
    path("api/admin-ops/dashboard/", OpsDashboardView.as_view(), name="ops-dashboard"),
    path("api/", include(router.urls)),
]
