import uuid

from django.conf import settings
from django.db import models

from common.models import TimeStampedModel


class Tutorial(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    category = models.CharField(max_length=120)
    level = models.CharField(max_length=80)
    summary = models.TextField()
    content = models.TextField(blank=True)
    published = models.BooleanField(default=True)


class Event(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    title = models.CharField(max_length=255)
    excerpt = models.TextField()
    start_at = models.DateTimeField()
    end_at = models.DateTimeField()
    venue = models.CharField(max_length=255)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, default=-33.868800)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, default=151.209300)
    published = models.BooleanField(default=True)


class ForumThread(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_threads")
    category = models.CharField(max_length=120)
    title = models.CharField(max_length=255)
    body = models.TextField()
    is_flagged = models.BooleanField(default=False)


class ForumReply(TimeStampedModel):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    thread = models.ForeignKey(ForumThread, on_delete=models.CASCADE, related_name="replies")
    author = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="forum_replies")
    body = models.TextField()
    is_flagged = models.BooleanField(default=False)
