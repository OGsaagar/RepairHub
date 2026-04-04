from rest_framework import permissions, serializers, viewsets

from apps.community.models import Event, ForumReply, ForumThread, Tutorial


class TutorialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tutorial
        fields = "__all__"


class EventSerializer(serializers.ModelSerializer):
    class Meta:
        model = Event
        fields = "__all__"


class ForumThreadSerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumThread
        fields = "__all__"


class ForumReplySerializer(serializers.ModelSerializer):
    class Meta:
        model = ForumReply
        fields = "__all__"


class TutorialViewSet(viewsets.ModelViewSet):
    queryset = Tutorial.objects.all()
    serializer_class = TutorialSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class EventViewSet(viewsets.ModelViewSet):
    queryset = Event.objects.all()
    serializer_class = EventSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class ForumThreadViewSet(viewsets.ModelViewSet):
    queryset = ForumThread.objects.select_related("author").all()
    serializer_class = ForumThreadSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)


class ForumReplyViewSet(viewsets.ModelViewSet):
    queryset = ForumReply.objects.select_related("author", "thread").all()
    serializer_class = ForumReplySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
