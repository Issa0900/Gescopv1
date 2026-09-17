import { createClient } from "npm:@base44/sdk@0.8.48";

export function createFixedClientFromRequest(request) {
    // Test-only seam: tests/import/point-entree.ts drives entry.ts handlers
    // end-to-end against a fake Base44 client, without a real SDK session.
    // Never set outside a test process.
    if (typeof globalThis !== "undefined" && globalThis.__BASE44_STUB) {
        return globalThis.__BASE44_STUB;
    }

    const authHeader = request.headers.get("Authorization");
    const serviceRoleAuthHeader = request.headers.get("Base44-Service-Authorization");
    const appId = request.headers.get("Base44-App-Id");
    const serverUrlHeader = request.headers.get("Base44-Api-Url");
    const functionsVersion = request.headers.get("Base44-Functions-Version");
    
    if (!appId) {
        throw new Error("Base44-App-Id header is required");
    }

    let serviceRoleToken;
    let userToken;
    if (serviceRoleAuthHeader) serviceRoleToken = serviceRoleAuthHeader.split(" ")[1];
    if (authHeader) userToken = authHeader.split(" ")[1];

    const client = createClient({
        serverUrl: serverUrlHeader || "https://base44.app",
        appId,
        token: userToken,
        serviceToken: serviceRoleToken,
        functionsVersion: functionsVersion ?? undefined,
    });
    
    // Store variables on the client object so we can use them later in bypass
    client._appId = appId;
    client._serviceRoleToken = serviceRoleToken;
    client._userToken = userToken;
    client._functionsVersion = functionsVersion;
    client._serverUrl = serverUrlHeader;

    return client;
}

export async function invokeLLM(client, params) {
    if (client._serverUrl && client._serverUrl.includes("localhost")) {
        console.log("[Local Dev] Bypassing proxy for InvokeLLM");
        const res = await fetch("https://base44.app/api/integrations/Core/InvokeLLM", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-App-Id": client._appId,
                "Authorization": `Bearer ${client._serviceRoleToken}`,
                ...(client._userToken ? { "on-behalf-of": `Bearer ${client._userToken}` } : {}),
                "Base44-Functions-Version": client._functionsVersion || "local-dev"
            },
            body: JSON.stringify(params)
        });
        if (!res.ok) {
            const errorText = await res.text();
            throw new Error(`[Base44 SDK Error] ${res.status}: ${errorText}`);
        }
        return res.json();
    }
    
    // In production, just use the normal SDK method
    return await client.asServiceRole.integrations.Core.InvokeLLM(params);
}
