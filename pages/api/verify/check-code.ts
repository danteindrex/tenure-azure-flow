/**
 * Check Verification Code API
 * 
 * POST /api/verify/check-code
 * Verifies SMS code using Twilio Verify service
 */
import { NextApiRequest, NextApiResponse } from 'next'
import { verifyPhoneNumber } from '@/lib/twilio'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({
            success: false,
            error: 'Method not allowed'
        })
    }

    try {
        const { phone, code } = req.body

        // Validate input
        if (!phone || !code) {
            return res.status(400).json({
                success: false,
                error: 'Phone number and verification code are required',
                code: 'MISSING_PARAMS'
            })
        }

        console.log(`🔍 Verifying code for phone: ${phone}`)

        // Verify the code using Twilio Verify
        const result = await verifyPhoneNumber(phone, code)

        if (result.success) {
            return res.status(200).json({
                success: true,
                message: 'Phone number verified successfully',
                data: {
                    phone: phone,
                    status: result.status,
                    valid: result.valid,
                    verifiedAt: new Date().toISOString()
                }
            })
        } else {
            console.error('Verification failed:', result.error)
            return res.status(400).json({
                success: false,
                error: result.error || 'Invalid or expired verification code',
                code: 'VERIFICATION_FAILED',
                data: {
                    status: result.status,
                    valid: result.valid
                }
            })
        }
    } catch (error: any) {
        console.error('Verification check API error:', error)
        return res.status(500).json({
            success: false,
            error: 'Internal server error',
            code: 'INTERNAL_ERROR',
            details: error.message
        })
    }
}