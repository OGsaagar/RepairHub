from django.contrib.auth import get_user_model

from apps.rewards.models import RewardLedger, RewardRule

User = get_user_model()


def award_points(user: User, *, action: str, points_override: int | None = None) -> RewardLedger:
    if points_override is None:
        rule = RewardRule.objects.filter(action=action, active=True).first()
        points = rule.points if rule else 10
    else:
        points = points_override
    return RewardLedger.objects.create(user=user, action=action, points=points)
