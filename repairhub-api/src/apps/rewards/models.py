import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class RewardRule(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    action = models.CharField(max_length=80, unique=True)
    points = models.IntegerField()
    active = models.BooleanField(default=True)


class RewardLedger(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reward_entries")
    action = models.CharField(max_length=80)
    points = models.IntegerField()
    source_reference = models.CharField(max_length=120, blank=True)
