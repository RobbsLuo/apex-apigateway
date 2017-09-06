#apex-apigateway

Deploy your Apex project on AWS API Gateway using Swagger configuration

##Installation

`npm install -g apex-apigateway`

## Usage

```shell
Usage: /usr/local/bin/apex-apigateway <command> [options]

Commands:
  create <name> [description]  Create a new RestAPI on AWS API Gateway
  deploy                       Update RestAPI with the new Swagger definitions
  list                         List RestAPI

Options:
  --help  Show help                                                    [boolean]
```

### create

```shell
/usr/local/bin/apex-apigateway create <name> [description]

Options:
  --help       Show help                                               [boolean]
  --clone, -c  The ID of the RestAPI that you want to clone from.       [string]
  --force, -f  Force creating RestAPI.
               Overriding existing configuration.                      [boolean]
```

### deploy

```shell
/usr/local/bin/apex-apigateway deploy

Options:
  --help        Show help                                              [boolean]
  --stage, -s   API-Gateway Stage Name         [string] [default: "development"]
  --alias, -a   Lambda Alisa Name                                       [string]
  --stdout, -o  Output Swagger                                         [boolean]
```

## configuration

### project.json

```json
{
  "x-api-gateway": {
    "rest-api-id": "9siwjdu882",
    "swagger-func-template": {
      "consumes": ["application/json"],
      "produces": ["application/json"],
      "responses": {
        "200": {
          "description": "200 response",
          "schema": {
            "$ref": "#/definitions/Empty"
          },
          "headers": {
            "Access-Control-Allow-Headers": {
              "type": "string"
            },
            "Access-Control-Allow-Methods": {
              "type": "string"
            },
            "Access-Control-Allow-Origin": {
              "type": "string"
            }
          }
        },
        "400": {
          "description": "400 response"
        }
      },
      "x-amazon-apigateway-binary-media-types": ["application/json"],
      "x-amazon-apigateway-integration": {
        "responses": {
          "default": {
            "statusCode": "200",
            "responseParameters": {
              "method.response.header.Access-Control-Allow-Origin": "'*'"
            }
          },
          "(.*)(Error|Exception|errorMessage)(.*)": {
            "statusCode": "400"
          }
        },
        "requestTemplates": {
          "application/json": "{\n   \"method\": \"$context.httpMethod\",\n   \"body\" : $input.json('$'),\n   \"headers\": {\n     #foreach($param in $input.params().header.keySet())\n     \"$param\": \"$util.escapeJavaScript($input.params().header.get($param))\" #if($foreach.hasNext),#end\n \n     #end\n   },\n   \"queryParams\": {\n     #foreach($param in $input.params().querystring.keySet())\n     \"$param\": \"$util.escapeJavaScript($input.params().querystring.get($param))\" #if($foreach.hasNext),#end\n \n     #end\n   },\n   \"pathParams\": {\n     #foreach($param in $input.params().path.keySet())\n     \"$param\": \"$util.escapeJavaScript($input.params().path.get($param))\" #if($foreach.hasNext),#end\n \n     #end\n   }\n}"
        },
        "uri": "arn:aws:apigateway:us-east-1:lambda:path/2015-03-31/functions/arn:aws:lambda:us-east-1:111111111111:function:{{functionName}}/invocations",
        "credentials": "arn:aws:iam::111111111111:role/S3_DynamoDB",
        "passthroughBehavior": "when_no_match",
        "httpMethod": "{{functionMethod}}",
        "type": "aws"
      }
    },
    "x-amazon-apigateway-request-validator": "basic",
    "x-amazon-apigateway-request-validators": {
      "basic": {
        "validateRequestBody": true,
        "validateRequestParameters": true
      },
      "params-only": {
        "validateRequestBody": false,
        "validateRequestParameters": true
      }
    },
    "securityDefinitions": {
      "UserPool": {
        "type": "apiKey",
        "name": "Authorization",
        "in": "header",
        "x-amazon-apigateway-authtype": "cognito_user_pools",
        "x-amazon-apigateway-authorizer": {
          "providerARNs": [
            "arn:aws:cognito-idp:us-east-1:111111111111:userpool/us-east-1_XXXXXXXXX"
          ],
          "type": "cognito_user_pools"
        }
      }
    },
    "definitions": {
      "User": {
        "title": "User",
        "type": "object",
        "properties": {
          "UserName": {
            "type": "string"
          },
          "PassWord": {
            "type": "string",
            "minLength": 8
          }
        },
        "required": [
          "UserName",
          "PassWord"
        ]
      },
      "Empty": {
        "type": "object"
      }
    },
    "paths": {
      ".+": {
        "options": {
          "summary": "CORS support",
          "description": "Enable CORS by returning correct headers",
          "consumes": ["application/json"],
          "produces": ["application/json"],
          "tags": ["CORS"],
          "x-amazon-apigateway-integration": {
            "type": "mock",
            "requestTemplates": {
              "application/json": "{\n \"statusCode\" : 200\n}\n"
            },
            "responses": {
              "default": {
                "statusCode": "200",
                "responseParameters": {
                  "method.response.header.Access-Control-Allow-Headers": "'Content-Type,X-Amz-Date,Authorization'",
                  "method.response.header.Access-Control-Allow-Methods": "'GET, PUT, POST, DELETE'",
                  "method.response.header.Access-Control-Allow-Origin": "'*'"
                },
                "responseTemplates": {
                  "application/json": "{}"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Default response for CORS method",
              "headers": {
                "Access-Control-Allow-Headers": {
                  "type": "string"
                },
                "Access-Control-Allow-Methods": {
                  "type": "string"
                },
                "Access-Control-Allow-Origin": {
                  "type": "string"
                }
              }
            }
          }
        }
      }
    }
  }
}
```

### function.json

```json
{
  "description": "get Property By PropertyId",
  "summary": "GetProperty",
  "x-api-gateway": {
    "method": "get",
    "path": "/Properties/{PropertyCode}",
    "security": [{
      "UserPool": []
    }],
    "parameters": [{
      "name": "Authorization",
      "in": "header",
      "description": "Authorization",
      "required": true,
      "type": "string"
    }]
  }
}
```

`method` and `paths` are required