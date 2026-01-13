# Lambda function 1
def handler(event, context):
    return {
        'statusCode': 200,
        'body': 'Hello from function-1'
    }