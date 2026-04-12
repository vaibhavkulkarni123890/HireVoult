const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Assessment = require('../models/Assessment');
const JobRole = require('../models/JobRole');
const Company = require('../models/Company');
const { createOrder, verifyPayment, verifyWebhookSignature, parseWebhookEvent } = require('../agents/paymentGateway');

router.post('/create-order', auth, async (req, res) => {
  try {
    const { assessmentId } = req.body;
    const assessment = await Assessment.findOne({ _id: assessmentId, company: req.company._id });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    if (assessment.isFree) {
      return res.status(400).json({ error: 'Free assessments do not require payment' });
    }

    if (assessment.paidAt) {
      return res.status(400).json({ error: 'Assessment already paid' });
    }

    const jobRole = await JobRole.findById(assessment.jobRole);

    const orderData = await createOrder({
      amount: assessment.pricing.totalCostINR,
      currency: assessment.pricing.currency || 'INR',
      receipt: `rcpt_${assessment._id}`,
      notes: {
        assessmentId: assessment._id.toString(),
        roleId: assessment.jobRole.toString(),
        companyId: req.company._id.toString(),
        candidateCount: assessment.pricing.candidateCount
      }
    });

    assessment.paymentOrderId = orderData.orderId;
    assessment.paymentGateway = orderData.gateway;
    assessment.paymentStatus = 'pending';
    await assessment.save();

    res.json({
      success: true,
      gateway: orderData.gateway,
      orderId: orderData.orderId,
      checkoutUrl: orderData.checkoutUrl,
      amount: orderData.amount,
      currency: orderData.currency
    });
  } catch (err) {
    console.error('[Payment] Create order error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/verify', auth, async (req, res) => {
  try {
    const { assessmentId, paymentId, orderId, signature, amount } = req.body;
    const assessment = await Assessment.findOne({ _id: assessmentId, company: req.company._id });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    const result = await verifyPayment({ paymentId, orderId, signature, amount });

    if (result.verified) {
      assessment.paidAt = new Date();
      assessment.paymentStatus = 'completed';
      assessment.paymentId = paymentId;
      await assessment.save();

      await JobRole.findByIdAndUpdate(assessment.jobRole, {
        status: 'paid',
        isFreeAssessment: false
      });

      return res.json({ success: true, message: 'Payment verified successfully' });
    }

    assessment.paymentStatus = 'failed';
    await assessment.save();

    res.status(400).json({ success: false, error: 'Payment verification failed' });
  } catch (err) {
    console.error('[Payment] Verify error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-webhook-signature'] || req.headers['x-razorpay-signature'] || '';
    const gateway = require('./agents/paymentGateway').getGatewayConfig();
    const provider = process.env.PAYMENT_GATEWAY || 'cosmofeed';

    const isValid = verifyWebhookSignature(req.body, signature, gateway);

    if (!isValid) {
      console.warn('[Payment] Invalid webhook signature');
      return res.status(401).json({ error: 'Invalid signature' });
    }

    const event = parseWebhookEvent(req.body, provider);
    console.log('[Payment] Webhook received:', event);

    if (event.status === 'captured' || event.event === 'payment.captured') {
      const assessment = await Assessment.findOne({ paymentOrderId: event.orderId });

      if (assessment && !assessment.paidAt) {
        assessment.paidAt = new Date();
        assessment.paymentStatus = 'completed';
        assessment.paymentId = event.paymentId;
        await assessment.save();

        await JobRole.findByIdAndUpdate(assessment.jobRole, {
          status: 'paid',
          isFreeAssessment: false
        });

        console.log(`[Payment] Assessment ${assessment._id} marked as paid via webhook`);
      }
    }

    if (event.status === 'failed' || event.event === 'payment.failed') {
      const assessment = await Assessment.findOne({ paymentOrderId: event.orderId });

      if (assessment) {
        assessment.paymentStatus = 'failed';
        await assessment.save();
        console.log(`[Payment] Payment failed for assessment ${assessment._id}`);
      }
    }

    res.json({ received: true });
  } catch (err) {
    console.error('[Payment] Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/status/:assessmentId', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findOne({
      _id: req.params.assessmentId,
      company: req.company._id
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found' });
    }

    res.json({
      paid: !!assessment.paidAt,
      status: assessment.paymentStatus || (assessment.isFree ? 'free' : 'unpaid'),
      gateway: assessment.paymentGateway,
      orderId: assessment.paymentOrderId
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;