import { NextResponse } from 'next/server';
import { sign } from 'jsonwebtoken';
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import { generate5DigitCode, hashCode, getCodeExpiration } from '@/lib/utils/2fa';
import { send2FAEmail } from '@/lib/utils/send-email';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Query admin table for user
    const { data: admin, error } = await supabaseAdmin
      .from('admin')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !admin) {
      // Get user agent for logging
      const userAgent = request.headers.get('user-agent') || 'unknown';
      
      // Log failed login attempt
      await supabaseAdmin.from('user_audit_logs').insert({
        user_id: email,
        action: 'login_attempt',
        entity_type: 'admin',
        success: false,
        error_message: 'Invalid email or password',
        user_agent: userAgent,
        metadata: { email }
      });

      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Check if admin is active (if status field exists)
    if (admin.status && admin.status !== 'active') {
      return NextResponse.json(
        { error: 'Account is inactive. Please contact support.' },
        { status: 403 }
      );
    }

    // Verify password - check if using hash/salt or password field
    let passwordMatch = false;
    
    if (admin.hash && admin.salt) {
      // Using hash and salt
      const hashedPassword = await bcrypt.hash(password, admin.salt);
      passwordMatch = hashedPassword === admin.hash;
    } else if (admin.password) {
      // Using password field
      passwordMatch = await bcrypt.compare(password, admin.password);
    }

    if (!passwordMatch) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate 5-digit login code
    const loginCode = generate5DigitCode();
    const codeHash = hashCode(loginCode);
    const expiresAt = getCodeExpiration(10); // 10 minutes

    // Store the code in database
    const { error: codeError } = await supabaseAdmin
      .from('admin_2fa_codes')
      .insert({
        admin_id: admin.id,
        code: codeHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0,
      });

    if (codeError) {
      console.error('Error storing 2FA code:', codeError);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Send code via email
    const emailResult = await send2FAEmail(admin.email, loginCode, 'login');
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    // Return success with admin ID (don't create session yet)
    return NextResponse.json({
      success: true,
      requiresVerification: true,
      adminId: admin.id,
      email: admin.email,
      message: 'Verification code sent to your email'
    });


  } catch (error) {
    console.error('Login error:', error);
    
    // Log error
    const userAgent = request.headers.get('user-agent') || 'unknown';
    await supabaseAdmin.from('user_audit_logs').insert({
      action: 'error',
      entity_type: 'admin_login',
      success: false,
      error_message: error instanceof Error ? error.message : 'Unknown error',
      user_agent: userAgent,
      metadata: { error: String(error) }
    });

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}