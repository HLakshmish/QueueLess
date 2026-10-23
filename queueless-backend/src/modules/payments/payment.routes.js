import crypto from 'crypto';
import { config } from '../../config/index.js';

export default async function paymentRoutes(fastify, options) {
  const { prisma } = fastify;

  // GET /api/v1/payments/razorpay/config - Expose public keyId
  fastify.get('/razorpay/config', async (request, reply) => {
    return reply.send({
      success: true,
      keyId: config.razorpayKeyId,
    });
  });

  // POST /api/v1/payments/razorpay/create-order - Create Razorpay order
  fastify.post('/razorpay/create-order', async (request, reply) => {
    try {
      const { planId, amount, currency = 'INR', businessId, notes = {} } = request.body || {};

      let finalAmountInPaise = 0;
      let planDetails = null;

      if (planId) {
        planDetails = await prisma.subscriptionPlan.findUnique({
          where: { id: planId },
        });

        if (!planDetails) {
          return reply.code(404).send({ success: false, error: 'Subscription plan not found' });
        }

        finalAmountInPaise = Math.round(planDetails.priceMonthly * 100);
      } else if (amount) {
        finalAmountInPaise = Math.round(Number(amount) * 100);
      }

      // Free / Trial plans require no Razorpay order
      if (finalAmountInPaise <= 0) {
        return reply.send({
          success: true,
          free: true,
          amount: 0,
          currency,
          keyId: config.razorpayKeyId,
          order: null,
          plan: planDetails,
        });
      }

      // Razorpay Basic Auth
      const authHeader = 'Basic ' + Buffer.from(`${config.razorpayKeyId}:${config.razorpayKeySecret}`).toString('base64');

      const receiptId = `rcpt_${Date.now().toString().slice(-8)}_${Math.floor(Math.random() * 1000)}`;

      const orderPayload = {
        amount: finalAmountInPaise,
        currency,
        receipt: receiptId,
        notes: {
          planId: planId || '',
          planName: planDetails?.name || 'Custom Plan',
          businessId: businessId || '',
          ...notes,
        },
      };

      const razorpayResponse = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(orderPayload),
      });

      const orderData = await razorpayResponse.json();

      if (!razorpayResponse.ok) {
        fastify.log.error(orderData, 'Razorpay order creation failed');
        return reply.code(razorpayResponse.status || 500).send({
          success: false,
          error: orderData.error?.description || 'Failed to create Razorpay payment order',
        });
      }

      return reply.send({
        success: true,
        order: orderData,
        keyId: config.razorpayKeyId,
        plan: planDetails,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: err.message || 'Error creating Razorpay order',
      });
    }
  });

  // POST /api/v1/payments/razorpay/verify - Verify signature and update subscription
  fastify.post('/razorpay/verify', async (request, reply) => {
    try {
      const {
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        businessId,
        planId,
      } = request.body || {};

      if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return reply.code(400).send({
          success: false,
          error: 'Missing Razorpay verification parameters (order_id, payment_id, signature)',
        });
      }

      // Verify HMAC-SHA256 signature
      const hmac = crypto.createHmac('sha256', config.razorpayKeySecret);
      hmac.update(`${razorpay_order_id}|${razorpay_payment_id}`);
      const generatedSignature = hmac.digest('hex');

      if (generatedSignature !== razorpay_signature) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid Razorpay payment signature verification failed',
        });
      }

      // If businessId and planId provided, activate subscription and record payment
      if (businessId && planId) {
        const plan = await prisma.subscriptionPlan.findUnique({ where: { id: planId } });

        await prisma.subscription.upsert({
          where: { businessId },
          update: {
            planId,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
          },
          create: {
            businessId,
            planId,
            status: 'ACTIVE',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });

        await prisma.payment.create({
          data: {
            businessId,
            amount: plan ? plan.priceMonthly : 0,
            status: 'COMPLETED',
            referenceId: razorpay_payment_id,
          },
        });
      }

      return reply.send({
        success: true,
        verified: true,
        paymentId: razorpay_payment_id,
        orderId: razorpay_order_id,
      });
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({
        success: false,
        error: err.message || 'Payment verification failed',
      });
    }
  });
}
