import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * POST /api/setup/push-supabase
 *
 * Pushes the complete PostgreSQL schema to Supabase using the Management API.
 *
 * Body:
 *   { supabaseUrl: string, accessToken: string }
 *
 * - supabaseUrl: Full project URL e.g. "https://xxxxx.supabase.co"
 * - accessToken: Supabase Management API access token (from https://app.supabase.com/account/tokens)
 *
 * Alternatively, you can also pass:
 *   { supabaseUrl: string, serviceRoleKey: string }
 * But the service role key approach uses RPC which requires a helper function.
 * The Management API approach is preferred.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supabaseUrl, accessToken, serviceRoleKey } = body;

    if (!supabaseUrl) {
      return NextResponse.json(
        { error: "supabaseUrl is required (e.g. https://xxxxx.supabase.co)" },
        { status: 400 }
      );
    }

    // Extract project ref from URL
    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: "Invalid Supabase URL format. Expected: https://xxxxx.supabase.co" },
        { status: 400 }
      );
    }
    const projectRef = urlMatch[1];

    // Read the SQL file
    const sqlPath = join(process.cwd(), "supabase-schema.sql");
    let sql: string;
    try {
      sql = readFileSync(sqlPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "supabase-schema.sql file not found in project root" },
        { status: 500 }
      );
    }

    // === Approach 1: Management API (preferred) ===
    if (accessToken) {
      const result = await pushViaManagementAPI(projectRef, accessToken, sql);
      return NextResponse.json(result);
    }

    // === Approach 2: Service Role Key via RPC ===
    if (serviceRoleKey) {
      const result = await pushViaServiceRoleKey(supabaseUrl, serviceRoleKey, sql);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      {
        error:
          "Either accessToken (Management API) or serviceRoleKey is required.\n\n" +
          "To get a Management API access token:\n" +
          "1. Go to https://app.supabase.com/account/tokens\n" +
          "2. Generate a new token\n" +
          "3. Pass it as 'accessToken' in the request body",
      },
      { status: 400 }
    );
  } catch (error) {
    console.error("[Push Supabase] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to push schema",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}

/**
 * Push schema via Supabase Management API.
 * This is the most reliable approach - executes raw SQL directly.
 */
async function pushViaManagementAPI(
  projectRef: string,
  accessToken: string,
  sql: string
) {
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  console.log(`[Push Supabase] Using Management API for project: ${projectRef}`);
  console.log(`[Push Supabase] SQL size: ${sql.length} bytes`);

  const response = await fetch(managementUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query: sql }),
  });

  const responseText = await response.text();

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      error: `Management API returned ${response.status}`,
      details: responseText,
    };
  }

  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    result = responseText;
  }

  return {
    success: true,
    method: "management_api",
    message: "Schema pushed successfully via Management API",
    result,
  };
}

/**
 * Push schema via Supabase Service Role Key using pgSQL execution.
 * This creates a temporary function to execute raw SQL, then removes it.
 */
async function pushViaServiceRoleKey(
  supabaseUrl: string,
  serviceRoleKey: string,
  sql: string
) {
  console.log(`[Push Supabase] Using Service Role Key approach`);

  // The Supabase REST API doesn't directly support raw SQL execution.
  // We need to split the SQL into individual statements and find another way.
  // For now, return instructions for the user.
  return {
    success: false,
    method: "service_role_key",
    message:
      "The service role key cannot execute raw SQL directly.\n" +
      "Please use the Management API access token instead.\n\n" +
      "Alternatively, copy the contents of supabase-schema.sql and paste it into:\n" +
      "Supabase Dashboard → SQL Editor → New Query → Paste & Run",
    sqlFilePath: "supabase-schema.sql",
    sqlSizeBytes: sql.length,
  };
}