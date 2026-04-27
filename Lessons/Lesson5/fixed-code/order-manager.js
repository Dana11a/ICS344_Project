const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");

exports.handler = async (event) => {

    // SAFE parsing
    let req;
    if (typeof event.body === "string") {
        try {
            req = JSON.parse(event.body);
        } catch (e) {
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "err", msg: "Invalid JSON" })
            };
        }
    } else {
        req = event.body;
    }

    const headers = event.headers || {};
    const auth_header = headers.Authorization || headers.authorization;

    if (!auth_header) {
        return {
            statusCode: 401,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: "err", msg: "Missing authorization" })
        };
    }

    //  FIX base64url decoding
    const token_sections = auth_header.split('.');
    const padded = token_sections[1].padEnd(token_sections[1].length + (4 - token_sections[1].length % 4) % 4, '=');
    const auth_data = Buffer.from(padded, 'base64').toString();
    const token = JSON.parse(auth_data);
    const user = token.username;

    // get admin status
    let isAdmin = false;
    const cognito = new CognitoIdentityProviderClient();
    const userData = await cognito.send(new AdminGetUserCommand({
        UserPoolId: process.env.userpoolid,
        Username: user
    }));

    for (const attr of userData.UserAttributes) {
        if (attr.Name === "custom:is_admin") {
            isAdmin = attr.Value;
        }
    }

    const action = req.action;

    const adminOnly = ["complete", "admin-orders"];

    if (adminOnly.includes(action) && isAdmin !== "true") {
        return {
            statusCode: 403,
            headers: { "Access-Control-Allow-Origin": "*" },
            body: JSON.stringify({ status: "err", msg: "Forbidden: admin only" })
        };
    }

    let payload = {};
    let functionName = "";

    switch (action) {
        case "new":
            payload = { user, cartId: req["cart-id"], items: req["items"] };
            functionName = "DVSA-ORDER-NEW";
            break;

        case "update":
            payload = { user, orderId: req["order-id"], items: req["items"] };
            functionName = "DVSA-ORDER-UPDATE";
            break;

        case "cancel":
            payload = { user, orderId: req["order-id"] };
            functionName = "DVSA-ORDER-CANCEL";
            break;

        case "get":
            payload = { user, orderId: req["order-id"], isAdmin };
            functionName = "DVSA-ORDER-GET";
            break;

        case "orders":
            payload = { user };
            functionName = "DVSA-ORDER-ORDERS";
            break;

        case "account":
            payload = { user };
            functionName = "DVSA-USER-ACCOUNT";
            break;

        case "profile":
            payload = { user, profile: req["data"] };
            functionName = "DVSA-USER-PROFILE";
            break;

        case "shipping":
            payload = { user, orderId: req["order-id"], shipping: req["data"] };
            functionName = "DVSA-ORDER-SHIPPING";
            break;

        case "billing":
            payload = { user, orderId: req["order-id"], billing: req["data"] };
            functionName = "DVSA-ORDER-BILLING";
            break;

        case "complete":
            payload = { orderId: req["order-id"] };
            functionName = "DVSA-ORDER-COMPLETE";
            break;

        case "admin-orders":
            payload = { user, data: req["data"] };
            functionName = "DVSA-ADMIN-GET-ORDERS";
            break;

        default:
            return {
                statusCode: 400,
                headers: { "Access-Control-Allow-Origin": "*" },
                body: JSON.stringify({ status: "err", msg: "unknown action" })
            };
    }

    // invoke Lambda
    const lambda = new LambdaClient();
    const response = await lambda.send(new InvokeCommand({
        FunctionName: functionName,
        InvocationType: "RequestResponse",
        Payload: JSON.stringify(payload)
    }));

    const data = JSON.parse(Buffer.from(response.Payload).toString());

    return {
        statusCode: 200,
        headers: { "Access-Control-Allow-Origin": "*" },
        body: JSON.stringify(data)
    };
};