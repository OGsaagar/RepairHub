import uuid

from django.db import models

from common.models import TimeStampedModel


class AdminAuditLog(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    actor_email = models.EmailField()
    action = models.CharField(max_length=120)
    subject_type = models.CharField(max_length=120)
    subject_reference = models.CharField(max_length=120)
    notes = models.TextField(blank=True)
