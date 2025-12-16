import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import { hashCode, isValidCodeFormat, generateBackupCodes } from '@/lib/utils/2fa';
import bcrypt from 'bcryptjs';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { adminId, code } = await request.json();

    if (!adminId || !code) {
      return NextResponse.json(
        { error: 'Admin ID and code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!isValidCodeFormat(code)) {
      return NextResponse.json(
        { error: 'Invalid code format. Must be 6 digits.' },
        { status: 400 }
      );
    }

    // Get the most recent unused code for this admin
    const { data: codeRecord, error: codeError } = await supabaseAdmin
      .from('admin_2fa_codes')
      .select('*')
      .eq('admin_id', adminId)
      .eq('used', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (codeError || !codeRecord) {
      return NextResponse.json(
        { error: 'Invalid or expired code' },
        { status: 401 }
      );
    }

    // Check attempts
    if (codeRecord.attempts >= 3) {
      return NextResponse.json(
        { error: 'Too many attempts. Please request a new code.' },
        { status: 429 }
      );
    }

    // Verify code
    const codeHash = hashCode(code);
    if (codeHash !== codeRecord.code) {
      // Increment attempts
      await supabaseAdmin
        .from('admin_2fa_codes')
        .update({ attempts: codeRecord.attempts + 1 })
        .eq('id', codeRecord.id);

      return NextResponse.json(
        { error: 'Invalid code' },
        { status: 401 }
      );
    }

    // Mark code as used
    await supabaseAdmin
      .from('admin_2fa_codes')
      .update({ used: true })
      .eq('id', codeRecord.id);

    // Generate backup codes
    const backupCodes = generateBackupCodes(10);
    const hashedBackupCodes = await Promise.all(
      backupCodes.map(code => bcrypt.hash(code, 10))
    );

    // Enable 2FA for admin
    const { error: updateError } = await supabaseAdmin
      .from('admin')
      .update({
        two_factor_enabled: true,
        backup_codes: hashedBackupCodes,
      })
      .eq('id', adminId);

    if (updateError) {
      console.error('Error enabling 2FA:', updateError);
      return NextResponse.json(
        { error: 'Failed to enable 2FA' },
        { status: 500 }
      );
    }

    // Get admin details
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Create session and token
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const token = sign(
      { 
        id: admin.id,
        email: admin.email,
        role: admin.role,
        name: admin.name,
        sessionId,
        iat: Math.floor(Date.now() / 1000)
      },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Get client information
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create session record
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    await supabaseAdmin
      .from('session')
      .insert({
        admin_id: admin.id,
        session_token: sessionId,
        ip_address: ip,
        user_agent: userAgent,
        expires_at: expiresAt.toISOString(),
        last_activity: new Date().toISOString(),
        is_active: true,
      });

    // Log 2FA setup
    await supabaseAdmin.from('user_audit_logs').insert({
      user_id: admin.id,
      action: '2fa_enabled',
      entity_type: 'admin',
      entity_id: admin.id,
      success: true,
      user_agent: userAgent,
      metadata: { 
        email: admin.email,
        ip_address: ip
      }
    });

    return NextResponse.json({
      success: true,
      token,
      backupCodes, // Return plain backup codes for user to save
      user: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      }
    });
  } catch (error) {
    console.error('Verify 2FA setup error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
