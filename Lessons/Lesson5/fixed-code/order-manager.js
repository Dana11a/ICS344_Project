const { LambdaClient, InvokeCommand } = require("@aws-sdk/client-lambda");
const { CognitoIdentityProviderClient, AdminGetUserCommand } = require("@aws-sdk/client-cognito-identity-provider");

exports.handler = async (event) => {

    // SAFE parsing
    let req;
    try {
        req = JSON.parse(event.body);
    } catch (e) {
        return { statusCode: 400, body: JSON.stringify({ status: "err", msg: "Invalid JSON" }) };
    }

    const headers = event.headers || {};
    const auth_header = headers.Authorization || headers.authorization;

    if (!auth_header) {
        return { statusCode: 401, body: JSON.stringify({ status: "err", msg: "Missing authorization" }) };
    }

    //  decode JWT safely
    const token_sections = auth_header.split('.');
    const auth_data = Buffer.from(token_sections[1], 'base64').toString();
    const token = JSON.parse(auth_data);
    const user = token.username;

    // ✅ check admin via Cognito
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
    let payload = {};
    let functionName = "";

    // enforce authorization BEFORE routing
    const adminOnly = ["complete", "admin-orders"];

    if (adminOnly.includes(action) && isAdmin !== "true") {
        return {
            statusCode: 403,
            body: JSON.stringify({ status: "err", msg: "Forbidden: admin only" })
        };
    }

    switch (action) {
        case "new":
            payload = { user, cartId: req["cart-id"], items: req["items"] };
            functionName = "DVSA-ORDER-NEW";
            break;

        case "update":
            payload = { user, orderId: req["order-id"], items: req["items"] };
            functionName = "DVSA-ORDER-UPDATE";
            break;

        case "orders":
            payload = { user };
            functionName = "DVSA-ORDER-ORDERS";
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
                body: JSON.stringify({ status: "err", msg: "unknown action" })
            };
    }

    // invoke Lambda safely
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