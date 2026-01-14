import os
import boto3
from botocore.exceptions import ClientError
import logging

logger = logging.getLogger()
logger.setLevel(logging.INFO)


class DynamoDBManager:
    """DynamoDB client for user profile operations."""

    def __init__(self, region_name: str = None):
        self.region_name = region_name or os.environ.get("AWS_REGION")
        self.dynamodb = boto3.resource("dynamodb", region_name=self.region_name)
        self.user_profile_table_name = os.environ.get("USER_PROFILE_TABLE_NAME")
        self.user_profile_table = self.dynamodb.Table(self.user_profile_table_name)
        logger.info(f"DynamoDB Manager initialized: {self.user_profile_table_name}")

    def get_user_profile(self, user_id: str):
        """Get user profile from the UserProfile table."""
        try:
            response = self.user_profile_table.get_item(Key={"id": user_id})
            if "Item" in response:
                return response["Item"]

            # Fallback: scan for userId field
            response = self.user_profile_table.scan(
                FilterExpression="userId = :user_id",
                ExpressionAttributeValues={":user_id": user_id},
            )
            items = response.get("Items", [])
            return items[0] if items else None

        except ClientError as e:
            logger.error(f"Error getting user profile: {e}")
            raise
