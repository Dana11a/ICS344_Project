//  REMOVED: const serialize = require('node-serialize');

const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");
const jose = require('node-jose');

exports.handler = (event, context, callback) => {

    let req, headers;

    // Lesson1 FIX 1: Safe parsing (NO unserialize)
    try {
        req = JSON.parse(event.body);
        headers = event.headers;
    } catch (e) {
        return callback(null, {
            statusCode: 400,
            body: JSON.stringify({ status: "err", msg: "Invalid JSON" })
        });
    }

    // Lesson 1 FIX 2: Basic validation (Lesson 1 only)
    if (!req || typeof req !== "object") {
        return callback(null, {
            statusCode: 400,
            body: JSON.stringify({ status: "err", msg: "Invalid request body" })
        });
    }

    // Lesson1: FIX 3: Block known injection pattern
    if (JSON.stringify(req).includes("$$ND_FUNC$$")) {
        return callback(null, {
            statusCode: 400,
            body: JSON.stringify({ status: "err", msg: "Malicious input detected" })
        });
    }

    
    var auth_header = headers.Authorization || headers.authorization;

    if (!auth_header) {
        return callback(null, { statusCode: 401, body: "Missing auth" });
    }

    var token_sections = auth_header.split('.');
    var auth_data = jose.util.base64url.decode(token_sections[1]);
    var token = JSON.parse(auth_data);
    var user = token.username;

    var isAdmin = false;

    var params = {
        UserPoolId: process.env.userpoolid,
        Username: user
    };

    try {
        const cognitoidentityserviceprovider = new CognitoIdentityProviderClient();
        const command = new AdminGetUserCommand(params);
        const userData = cognitoidentityserviceprovider.send(command);

        userData.then((userData) => {

            var len = Object.keys(userData.UserAttributes).length;
            for (var i = 0; i < len; i++) {
                if (userData.UserAttributes[i].Name === "custom:is_admin") {
                    isAdmin = userData.UserAttributes[i].Value;
                    break;
                }
            }

            var action = req.action;

            // Lesson1 FIX 4: Validate action
            const allowedActions = [
                "new","update","cancel","get","orders","account",
                "profile","shipping","billing","complete",
                "inbox","message","delete","upload","feedback","admin-orders"
            ];

            if (!action || !allowedActions.includes(action)) {
                return callback(null, {
                    statusCode: 400,
                    body: JSON.stringify({ status: "err", msg: "Invalid action" })
                });
            }

            var isOk = true;
            var payload = {};
            var functionName = "";

            switch (action) {

                case "new":
                    payload = { "user": user, "cartId": req["cart-id"], "items": req["items"] };
                    functionName = "DVSA-ORDER-NEW";
                    break;

                case "update":
                    payload = { "user": user, "orderId": req["order-id"], "items": req["items"] };
                    functionName = "DVSA-ORDER-UPDATE";
                    break;

                case "cancel":
                    payload = { "user": user, "orderId": req["order-id"] };
                    functionName = "DVSA-ORDER-CANCEL";
                    break;

                case "get":
                    payload = { "user": user, "orderId": req["order-id"], "isAdmin": isAdmin };
                    functionName = "DVSA-ORDER-GET";
                    break;

                case "orders":
                    payload = { "user": user };
                    functionName = "DVSA-ORDER-ORDERS";
                    break;

                case "account":
                    payload = { "user": user };
                    functionName = "DVSA-USER-ACCOUNT";
                    break;

                case "profile":
                    payload = { "user": user, "profile": req["data"] };
                    functionName = "DVSA-USER-PROFILE";
                    break;

                case "shipping":
                    payload = { "user": user, "orderId": req["order-id"], "shipping": req["data"] };
                    functionName = "DVSA-ORDER-SHIPPING";
                    break;

                case "billing":
                    payload = { "user": user, "orderId": req["order-id"], "billing": req["data"] };
                    functionName = "DVSA-ORDER-BILLING";
                    break;

                case "complete":
                    payload = { "orderId": req["order-id"] };
                    functionName = "DVSA-ORDER-COMPLETE";
                    break;

                case "inbox":
                    payload = { "action": "inbox", "user": user };
                    functionName = "DVSA-USER-INBOX";
                    break;

                case "message":
                    payload = { "action": "get", "user": user, "msgId": req["msg-id"], "type": req["type"] };
                    functionName = "DVSA-USER-INBOX";
                    break;

                case "delete":
                    payload = { "action": "delete", "user": user, "msgId": req["msg-id"] };
                    functionName = "DVSA-USER-INBOX";
                    break;

                case "upload":
                    payload = { "user": user, "file": req["attachment"] };
                    functionName = "DVSA-FEEDBACK-UPLOADS";
                    break;

                case "feedback":
                    return callback(null, {
                        statusCode: 200,
                        headers: { "Access-Control-Allow-Origin": "*" },
                        body: JSON.stringify({ "status": "ok", "message": `Thank you ${req["data"]["name"]}.` })
                    });

                case "admin-orders":
                    if (isAdmin == "true") {
                        payload = { "user": user, "data": req["data"] };
                        functionName = "DVSA-ADMIN-GET-ORDERS";
                    } else {
                        return callback(null, {
                            statusCode: 403,
                            body: JSON.stringify({ "status": "err", "message": "Unauthorized" })
                        });
                    }
                    break;

                default:
                    isOk = false;
            }

            if (isOk) {
                const lambda_client = new LambdaClient();
                const command = new InvokeCommand({
                    FunctionName: functionName,
                    InvocationType: 'RequestResponse',
                    Payload: JSON.stringify(payload)
                });

                lambda_client.send(command).then((lambda_response) => {
                    const data = JSON.parse(Buffer.from(lambda_response.Payload).toString());

                    return callback(null, {
                        statusCode: 200,
                        headers: { "Access-Control-Allow-Origin": "*" },
                        body: JSON.stringify(data)
                    });
                });
            }
        });

    } catch (e) {
        console.log(e);
    }
};