import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class JobMessage(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    job = models.ForeignKey("repairs.RepairJob", on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="job_messages")
    body = models.TextField()
    event_type = models.CharField(max_length=80, default="message.created")
