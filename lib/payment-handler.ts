
/**
 * ==========================================
 * WEBHOOK HANDLER (SERVER-SIDE LOGIC)
 * ==========================================
 * 
 * This file contains the logic to validate and process AbacatePay webhooks.
 * Since this application is currently Client-Side only (React), this code
 * is intended to be deployed to a Supabase Edge Function or a Node.js server.
 */

import { supabase } from './supabase-config';

const WEBHOOK_SECRET = process.env.VITE_WEBHOOK_SECRET || '';

/**
 * Validates the HMAC-SHA256 signature of the webhook
 */
export const verifyWebhookSignature = async (
    payload: string, 
    signature: string
): Promise<boolean> => {
    if (!WEBHOOK_SECRET) return false;

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        "raw",
        encoder.encode(WEBHOOK_SECRET),
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
    );

    const signatureBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    return await crypto.subtle.verify(
        "HMAC",
        key,
        signatureBytes,
        encoder.encode(payload)
    );
};

/**
 * Processes the 'billing.paid' event
 */
export const processPaymentWebhook = async (event: any) => {
    if (event.event !== 'billing.paid') {
        return { success: true, message: 'Ignored event type' };
    }

    const billingId = event.data.id;
    const amount = event.data.amount; // In cents

    console.log(`Processing payment for billing ${billingId}`);

    // 1. Update Local Transaction Log (Supabase Audit)
    await supabase.from('audit_logs').insert({
        action: 'WEBHOOK_PAYMENT_RECEIVED',
        raffle_id: 'system',
        details: { billingId, amount, status: 'PAID' },
        ip_address: 'webhook'
    });

    // 2. In a real backend, we would update the database status here.
    // Since our architecture uses localStorage for Raffle Data (synced via browser),
    // we cannot update localStorage from the server.
    //
    // STRATEGY:
    // The Client-Side app polls 'checkPaymentStatus' in 'lib/abacatepay-config.ts'.
    // This webhook is primarily for data integrity, logging, or if we migrate 
    // raffle storage to Supabase completely.

    return { success: true };
};
