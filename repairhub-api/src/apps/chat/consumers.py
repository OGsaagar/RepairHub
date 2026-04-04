from channels.generic.websocket import AsyncJsonWebsocketConsumer


class JobConsumer(AsyncJsonWebsocketConsumer):
    async def connect(self):
        self.job_id = self.scope["url_route"]["kwargs"]["job_id"]
        self.group_name = f"job-{self.job_id}"
        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive_json(self, content, **kwargs):
        await self.channel_layer.group_send(
            self.group_name,
            {
                "type": "job.event",
                "payload": content,
            },
        )

    async def job_event(self, event):
        await self.send_json(event["payload"])
