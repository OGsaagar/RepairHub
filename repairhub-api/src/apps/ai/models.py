import uuid

from django.db import models

from common.models import TimeStampedModel


class AIAudit(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    provider = models.CharField(max_length=120)
    status = models.CharField(max_length=40)
    request_payload = models.JSONField(default=dict, blank=True)
    response_payload = models.JSONField(default=dict, blank=True)
    fallback_used = models.BooleanField(default=False)

