// AWS Signature v4 implementation for Deno Edge Functions
// Used to sign requests to AWS Bedrock

const encoder = new TextEncoder();

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, encoder.encode(data));
}

async function sha256(data: string | Uint8Array): Promise<string> {
  const input = typeof data === "string" ? encoder.encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", input);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getDateStrings(date: Date) {
  const isoDate = date.toISOString().replace(/[:-]/g, "").replace(/\.\d{3}/, "");
  const dateStamp = isoDate.slice(0, 8);
  return { amzDate: isoDate, dateStamp };
}

interface SignRequestParams {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
  region: string;
  service: string;
}

export async function signAwsRequest(params: SignRequestParams): Promise<Record<string, string>> {
  const { method, url, headers, body, accessKeyId, secretAccessKey, sessionToken, region, service } = params;

  const parsedUrl = new URL(url);
  const now = new Date();
  const { amzDate, dateStamp } = getDateStrings(now);

  // Build canonical headers
  const signedHeaders: Record<string, string> = {
    ...headers,
    host: parsedUrl.host,
    "x-amz-date": amzDate,
  };

  if (sessionToken) {
    signedHeaders["x-amz-security-token"] = sessionToken;
  }

  const sortedHeaderKeys = Object.keys(signedHeaders)
    .map((k) => k.toLowerCase())
    .sort();

  const canonicalHeaders = sortedHeaderKeys
    .map((k) => `${k}:${signedHeaders[Object.keys(signedHeaders).find((h) => h.toLowerCase() === k)!]?.trim()}`)
    .join("\n") + "\n";

  const signedHeadersStr = sortedHeaderKeys.join(";");

  // Canonical request
  const payloadHash = await sha256(body);
  const canonicalUri = parsedUrl.pathname || "/";
  const canonicalQuerystring = parsedUrl.search ? parsedUrl.search.slice(1) : "";

  const canonicalRequest = [
    method,
    canonicalUri,
    canonicalQuerystring,
    canonicalHeaders,
    signedHeadersStr,
    payloadHash,
  ].join("\n");

  // String to sign
  const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
  const canonicalRequestHash = await sha256(canonicalRequest);
  const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${canonicalRequestHash}`;

  // Signing key
  const kDate = await hmac(encoder.encode(`AWS4${secretAccessKey}`), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  const kSigning = await hmac(kService, "aws4_request");

  // Signature
  const signatureBuffer = await hmac(kSigning, stringToSign);
  const signature = Array.from(new Uint8Array(signatureBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;

  const resultHeaders: Record<string, string> = {
    ...headers,
    "x-amz-date": amzDate,
    "x-amz-content-sha256": payloadHash,
    Authorization: authorization,
  };

  if (sessionToken) {
    resultHeaders["x-amz-security-token"] = sessionToken;
  }

  return resultHeaders;
}

export async function invokeBedrockModel(params: {
  modelId: string;
  body: Record<string, unknown>;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken?: string;
}): Promise<Record<string, unknown>> {
  const { modelId, body, region, accessKeyId, secretAccessKey, sessionToken } = params;
  const url = `https://bedrock-runtime.${region}.amazonaws.com/model/${modelId}/invoke`;
  const bodyStr = JSON.stringify(body);

  const signedHeaders = await signAwsRequest({
    method: "POST",
    url,
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: bodyStr,
    accessKeyId,
    secretAccessKey,
    sessionToken,
    region,
    service: "bedrock",
  });

  const response = await fetch(url, {
    method: "POST",
    headers: signedHeaders,
    body: bodyStr,
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Bedrock error (${response.status}): ${errorText}`);
  }

  return response.json();
}
