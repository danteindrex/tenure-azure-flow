import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { generate2FACode, hashCode, getCodeExpiration } from '@/lib/utils/2fa';
import { send2FAEmail } from '@/lib/utils/send-email';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { adminId } = await request.json();

    if (!adminId) {
      return NextResponse.json(
        { error: 'Admin ID is required' },
        { status: 400 }
      );
    }

    // Get admin details
    const { data: admin, error: adminError } = await supabaseAdmin
      .from('admin')
      .select('email')
      .eq('id', adminId)
      .single();

    if (adminError || !admin) {
      return NextResponse.json(
        { error: 'Admin not found' },
        { status: 404 }
      );
    }

    // Generate 6-digit setup code
    const setupCode = generate2FACode();
    const codeHash = hashCode(setupCode);
    const expiresAt = getCodeExpiration(10); // 10 minutes

    // Store the code
    const { error: codeError } = await supabaseAdmin
      .from('admin_2fa_codes')
      .insert({
        admin_id: adminId,
        code: codeHash,
        expires_at: expiresAt.toISOString(),
        used: false,
        attempts: 0,
      });

    if (codeError) {
      console.error('Error storing 2FA setup code:', codeError);
      return NextResponse.json(
        { error: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Send code via email
    const emailResult = await send2FAEmail(admin.email, setupCode, 'setup');
    
    if (!emailResult.success) {
      console.error('Failed to send email:', emailResult.error);
      return NextResponse.json(
        { error: 'Failed to send verification code' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: '6-digit verification code sent to your email'
    });
  } catch (error) {
    console.error('Send 2FA setup code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
