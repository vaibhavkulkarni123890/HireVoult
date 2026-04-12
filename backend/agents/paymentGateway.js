const fetch = require('node-fetch');
const crypto = require('crypto');

function getGatewayConfig() {
  const provider = process.env.PAYMENT_GATEWAY || 'cosmofeed';

  const configs = {
    cosmofeed: {
      baseUrl: process.env.COSMOFEED_BASE_URL || 'https://api.cosmofeed.com',
      clientId: process.env.COSMOFEED_CLIENT_ID,
      clientSecret: process.env.COSMOFEED_CLIENT_SECRET,
      webhookSecret: process.env.COSMOFEED_WEBHOOK_SECRET
    },
    razorpay: {
      baseUrl: 'https://api.razorpay.com/v1',
      keyId: process.env.RAZORPAY_KEY_ID,
      keySecret: process.env.RAZORPAY_KEY_SECRET,
      webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET
    },
    test: {
      baseUrl: 'http://localhost:5000',
      clientId: 'test_client',
      clientSecret: 'test_secret',
      webhookSecret: 'test_webhook_secret'
    }
  };

  return configs[provider] || configs.test;
}

async function createOrder(params) {
  const { amount, currency = 'INR', receipt, notes = {} } = params;
  const gateway = getGatewayConfig();
  const provider = process.env.PAYMENT_GATEWAY || 'cosmofeed';

  console.log(`[PaymentGateway] Creating order with ${provider}, amount: ${amount} ${currency}`);

  if (provider === 'razorpay' || !gateway.clientId) {
    return await createRazorpayOrder({ amount, currency, receipt, notes, gateway });
  }

  return await createCosmofeedOrder({ amount, currency, receipt, notes, gateway });
}

async function createCosmofeedOrder({ amount, currency, receipt, notes, gateway }) {
  try {
    const orderId = `order_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const checksum = crypto
      .createHash('sha256')
      .update(`${gateway.clientId}|${amount}|${orderId}|${gateway.clientSecret}`)
      .digest('hex');

    const response = await fetch(`${gateway.baseUrl}/v2/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Client-Id': gateway.clientId,
        'X-Checksum': checksum
      },
      body: JSON.stringify({
        order_id: orderId,
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: receipt,
        notes: notes,
        return_url: `${process.env.CLIENT_URL || 'http://localhost:3000'}/payment/return`,
        webhook_url: `${process.env.API_URL || 'http://localhost:5000'}/api/payment/webhook`
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[PaymentGateway] Cosmofeed error: ${err}`);
      throw new Error(`Payment gateway error: ${response.status}`);
    }

    const data = await response.json();

    return {
      gateway: 'cosmofeed',
      orderId: data.order_id || orderId,
      checkoutUrl: data.checkout_url || data.payment_url,
      paymentId: data.payment_id,
      amount,
      currency,
      status: 'created'
    };
  } catch (err) {
    console.error('[PaymentGateway] Cosmofeed order creation failed:', err);
    throw new Error(`Failed to create payment order: ${err.message}`);
  }
}

async function createRazorpayOrder({ amount, currency, receipt, notes, gateway }) {
  try {
    const auth = Buffer.from(`${gateway.keyId}:${gateway.keySecret}`).toString('base64');

    const response = await fetch(`${gateway.baseUrl}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${auth}`
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: currency,
        receipt: receipt,
        notes: notes
      })
    });

    if (!response.ok) {
      const err = await response.text();
      console.error(`[PaymentGateway] Razorpay error: ${err}`);
      throw new Error(`Payment gateway error: ${response.status}`);
    }

    const data = await response.json();

    return {
      gateway: 'razorpay',
      orderId: data.id,
      checkoutUrl: `https://rzp.io/i/${data.id}`,
      paymentId: null,
      amount: data.amount / 100,
      currency: data.currency,
      status: 'created'
    };
  } catch (err) {
    console.error('[PaymentGateway] Razorpay order creation failed:', err);
    throw new Error(`Failed to create payment order: ${err.message}`);
  }
}

async function verifyPayment(params) {
  const { paymentId, orderId, signature, amount } = params;
  const gateway = getGatewayConfig();
  const provider = process.env.PAYMENT_GATEWAY || 'cosmofeed';

  if (provider === 'razorpay') {
    return verifyRazorpayPayment({ paymentId, orderId, signature, gateway });
  }

  return verifyCosmofeedPayment({ paymentId, orderId, gateway, amount });
}

async function verifyCosmofeedPayment({ paymentId, orderId, gateway, amount }) {
  try {
    const response = await fetch(`${gateway.baseUrl}/v2/payment/${paymentId}/verify`, {
      method: 'GET',
      headers: {
        'X-Client-Id': gateway.clientId,
        'X-Checksum': crypto
          .createHash('sha256')
          .update(`${gateway.clientId}|${paymentId}|${gateway.clientSecret}`)
          .digest('hex')
      }
    });

    if (!response.ok) {
      return { verified: false, error: 'Payment verification failed' };
    }

    const data = await response.json();
    const isValid = data.status === 'captured' && String(data.amount) === String(amount);

    return {
      verified: isValid,
      status: data.status,
      paymentId: data.payment_id,
      orderId: data.order_id
    };
  } catch (err) {
    console.error('[PaymentGateway] Cosmofeed verification failed:', err);
    return { verified: false, error: err.message };
  }
}

async function verifyRazorpayPayment({ paymentId, orderId, signature, gateway }) {
  try {
    const expectedSignature = crypto
      .createHmac('sha256', gateway.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest('hex');

    const isValid = signature === expectedSignature;

    return {
      verified: isValid,
      status: isValid ? 'captured' : 'failed',
      paymentId,
      orderId
    };
  } catch (err) {
    console.error('[PaymentGateway] Razorpay verification failed:', err);
    return { verified: false, error: err.message };
  }
}

async function verifyWebhookSignature(payload, signature, gateway) {
  const provider = process.env.PAYMENT_GATEWAY || 'cosmofeed';

  if (provider === 'razorpay') {
    const expectedSignature = crypto
      .createHmac('sha256', gateway.webhookSecret)
      .update(JSON.stringify(payload))
      .digest('hex');
    return signature === expectedSignature;
  }

  if (provider === 'cosmofeed') {
    const expectedSignature = crypto
      .createHash('sha256')
      .update(JSON.stringify(payload) + gateway.webhookSecret)
      .digest('hex');
    return signature === expectedSignature;
  }

  return true;
}

function parseWebhookEvent(body, provider) {
  if (provider === 'razorpay') {
    return {
      event: body.event,
      paymentId: body.payload?.payment?.entity?.id,
      orderId: body.payload?.order?.entity?.id,
      status: body.payload?.payment?.entity?.status,
      amount: body.payload?.payment?.entity?.amount / 100
    };
  }

  if (provider === 'cosmofeed') {
    return {
      event: body.event || body.action,
      paymentId: body.payment_id || body.transaction_id,
      orderId: body.order_id,
      status: body.status,
      amount: body.amount / 100
    };
  }

  return body;
}

module.exports = {
  createOrder,
  verifyPayment,
  verifyWebhookSignature,
  parseWebhookEvent,
  getGatewayConfig
};