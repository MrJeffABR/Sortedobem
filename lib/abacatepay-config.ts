
/**
 * ==========================================
 * ABACATEPAY CONFIGURATION & API CLIENT
 * ==========================================
 * 
 * Handles interaction with AbacatePay API for PIX generation and status checking.
 */

const API_BASE_URL = 'https://api.abacatepay.com/v1';

// Helper to get environment variables safely
const getEnv = (key: string) => {
  // @ts-ignore
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    // @ts-ignore
    return import.meta.env[key];
  }
  // @ts-ignore
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
     // @ts-ignore
    return process.env[key];
  }
  return '';
};

const API_KEY = getEnv('VITE_ABACATEPAY_API_KEY');

// Helper to detect if running in Development Mode based on Key prefix
export const isAbacateDevMode = API_KEY ? API_KEY.startsWith('abc_dev_') : false;

if (isAbacateDevMode) {
    console.log("🥑 AbacatePay: Running in DEVELOPMENT MODE (Test Key Detected)");
}

export interface AbacateCustomer {
    name: string;
    email?: string;
    taxId?: string; // CPF/CNPJ
    phone?: string;
}

export interface AbacateBillingResponse {
    data: {
        id: string;
        url: string;
        amount: number;
        status: 'PENDING' | 'EXPIRED' | 'PAID' | 'REFUNDED';
        pix?: {
            code: string; // Copy and Paste code
            qrCode: string; // Base64 or URL
        };
    }
}

/**
 * Creates a new PIX Charge (Billing) in AbacatePay
 */
export const createPixCharge = async (
    amount: number, // in cents (e.g., 2000 for R$ 20.00)
    customer: AbacateCustomer,
    description: string,
    returnUrl?: string
): Promise<AbacateBillingResponse['data'] | null> => {
    if (!API_KEY) {
        console.error("❌ AbacatePay Error: API Key missing in .env");
        return null;
    }

    if (isAbacateDevMode) {
        console.log(`[AbacatePay] Creating Charge: R$ ${(amount/100).toFixed(2)} for ${customer.name}`);
    }

    try {
        const payload = {
            frequency: "ONE_TIME",
            methods: ["PIX"],
            products: [
                {
                    externalId: "raffle-activation-fee",
                    name: "Taxa de Ativação - Sorte do Bem",
                    description: description,
                    quantity: 1,
                    price: amount, 
                }
            ],
            customer: {
                name: customer.name,
                email: customer.email || "cliente@exemplo.com", // Required field
                taxId: customer.taxId,
                phone: customer.phone
            },
            returnUrl: returnUrl || window.location.origin
        };

        const response = await fetch(`${API_BASE_URL}/billing/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            const err = await response.json();
            console.error("❌ AbacatePay API Error:", err);
            throw new Error('Failed to create charge');
        }

        const result: AbacateBillingResponse = await response.json();
        
        if (isAbacateDevMode) {
            console.log("[AbacatePay] Charge Created Successfully:", result.data.id);
        }

        return result.data;

    } catch (error) {
        console.error("❌ Error creating Pix charge:", error);
        return null;
    }
};

/**
 * Checks the status of a specific billing ID
 */
export const checkPaymentStatus = async (billingId: string): Promise<'PENDING' | 'PAID' | 'EXPIRED' | 'REFUNDED' | 'UNKNOWN'> => {
    if (!API_KEY) return 'UNKNOWN';

    try {
        if (isAbacateDevMode) {
            console.log(`[AbacatePay] Checking status for ID: ${billingId}...`);
        }

        const response = await fetch(`${API_BASE_URL}/billing/list?id=${billingId}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            console.warn(`[AbacatePay] Failed to check status: ${response.statusText}`);
            return 'UNKNOWN';
        }

        const result = await response.json();
        // Assuming the list returns an array in data
        const bill = result.data.find((b: any) => b.id === billingId);
        
        const status = bill ? bill.status : 'UNKNOWN';

        if (isAbacateDevMode && status === 'PAID') {
            console.log("✅ [AbacatePay] Payment Confirmed!");
        }

        return status;

    } catch (error) {
        console.error("Error checking status:", error);
        return 'UNKNOWN';
    }
};
