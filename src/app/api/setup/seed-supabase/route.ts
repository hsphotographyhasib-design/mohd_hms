import { NextRequest, NextResponse } from "next/server";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * POST /api/setup/seed-supabase
 *
 * Pushes seed data to Supabase using the Management API.
 *
 * Body:
 *   { supabaseUrl: string, accessToken: string }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { supabaseUrl, accessToken } = body;

    if (!supabaseUrl || !accessToken) {
      return NextResponse.json(
        { error: "supabaseUrl and accessToken are required" },
        { status: 400 }
      );
    }

    const urlMatch = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    if (!urlMatch) {
      return NextResponse.json(
        { error: "Invalid Supabase URL format" },
        { status: 400 }
      );
    }
    const projectRef = urlMatch[1];

    // Read seed SQL
    const sqlPath = join(process.cwd(), "supabase-seed.sql");
    let sql: string;
    try {
      sql = readFileSync(sqlPath, "utf-8");
    } catch {
      return NextResponse.json(
        { error: "supabase-seed.sql file not found" },
        { status: 500 }
      );
    }

    const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

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
      return NextResponse.json(
        {
          success: false,
          status: response.status,
          error: responseText,
        },
        { status: response.status }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Seed data pushed successfully",
      seeded: [
        "1 Default Tenant (MOHD HMS Enterprise)",
        "8 System Settings",
        "5 Departments",
        "6 Service Categories",
        "6 Inventory Categories",
        "1 Default Warehouse",
      ],
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Failed to seed database",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}