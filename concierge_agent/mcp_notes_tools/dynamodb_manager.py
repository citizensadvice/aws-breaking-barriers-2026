import os
import logging
import boto3
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)

class NotesManager:
    def __init__(self, region_name: str = None):
        self.region = region_name or os.getenv("AWS_REGION", "us-east-1")
        self.table_name = os.getenv("NOTES_TABLE_NAME")
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region)
        self.table = self.dynamodb.Table(self.table_name) if self.table_name else None

    def add_note(self, user_id: str, content: str, category: str = "general") -> dict:
        note_id = str(uuid.uuid4())
        item = {
            "userId": user_id,
            "noteId": note_id,
            "content": content,
            "category": category,
            "createdAt": datetime.utcnow().isoformat(),
        }
        self.table.put_item(Item=item)
        return item

    def get_notes(self, user_id: str, category: str = None) -> list:
        if category:
            response = self.table.query(
                KeyConditionExpression="userId = :uid",
                FilterExpression="category = :cat",
                ExpressionAttributeValues={":uid": user_id, ":cat": category}
            )
        else:
            response = self.table.query(
                KeyConditionExpression="userId = :uid",
                ExpressionAttributeValues={":uid": user_id}
            )
        return response.get("Items", [])

    def delete_note(self, user_id: str, note_id: str) -> bool:
        self.table.delete_item(Key={"userId": user_id, "noteId": note_id})
        return True
