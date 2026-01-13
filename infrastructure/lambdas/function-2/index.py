# Lambda function 2
def handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from function-2'
    }