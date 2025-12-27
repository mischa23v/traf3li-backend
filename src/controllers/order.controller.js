const { Order, Gig, Proposal, Job } = require('../models');
const { CustomException } = require('../utils');
const { createNotification } = require('./notification.controller'); // ✅ ADDED
const stripe = require('stripe')(process.env.STRIPE_SECRET);
const Joi = require('joi');
const { pickAllowedFields, sanitizeObjectId } = require('../utils/securityUtils');

// Validation schemas
const schemas = {
    orderIdParam: Joi.object({
        _id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    }),
    updatePaymentStatus: Joi.object({
        payment_intent: Joi.string().required().min(1).max(500)
    })
};

const getOrders = async (request, response) => {
    try {
        const orders = await Order.find({ 
            $and: [
                { $or: [{ sellerID: request.userID }, { buyerID: request.userID }] }, 
                { isCompleted: true }
            ] 
        })
        .populate(request.isSeller ? 'buyerID' : 'sellerID', 'username email image country')
        .populate('gigID', 'title cover')
        .populate('jobId', 'title')
        .sort({ createdAt: -1 });
        
        return response.send(orders);
    }
    catch ({ message, status = 500 }) {
        return response.send({
            error: true,
            message
        })
    }
}

// Payment intent for GIG
const paymentIntent = async (request, response) => {
    try {
        // Input validation
        const { error, value } = schemas.orderIdParam.validate(request.params);
        if (error) {
            throw CustomException(error.details[0].message, 400);
        }

        const { _id } = value;
        const sanitizedGigId = sanitizeObjectId(_id);
        const firmId = request.firmId;

        const gig = await Gig.findOne({ _id: sanitizedGigId, firmId }).populate('userID', 'username');

        if (!gig) {
            throw CustomException('Service not found!', 404);
        }

        // IDOR protection: Prevent users from buying their own services
        if (request.userID === gig.userID._id.toString()) {
            throw CustomException('You cannot order your own service!', 403);
        }

        // Payment amount protection: Always use price from database
        const payment_intent = await stripe.paymentIntents.create({
            amount: gig.price * 100,
            currency: "INR",
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Mass assignment protection: Only allow specific fields
        const allowedOrderFields = {
            gigID: gig._id,
            image: gig.cover,
            title: gig.title,
            buyerID: request.userID,
            sellerID: gig.userID,
            price: gig.price, // Always from database, never from user input
            payment_intent: payment_intent.id
        };

        const order = new Order(allowedOrderFields);
        await order.save();

        // ✅ ADDED: Create notification for seller
        await createNotification({
            userId: gig.userID._id,
            type: 'order',
            title: 'طلب جديد',
            message: `لديك طلب جديد على خدمة "${gig.title}"`,
            link: '/orders',
            data: {
                orderId: order._id,
                gigId: gig._id
            },
            icon: '🛍️',
            priority: 'high'
        });
        
        return response.send({
            error: false,
            clientSecret: payment_intent.client_secret
        })
    }
    catch({ message, status = 500 }) {
        return response.send({
            error: true,
            message
        })
    }
}

// ✅ NEW: Payment intent for PROPOSAL
const proposalPaymentIntent = async (request, response) => {
    try {
        // Input validation
        const { error, value } = schemas.orderIdParam.validate(request.params);
        if (error) {
            throw CustomException(error.details[0].message, 400);
        }

        const { _id } = value;
        const sanitizedProposalId = sanitizeObjectId(_id);
        const firmId = request.firmId;

        const proposal = await Proposal.findOne({ _id: sanitizedProposalId, firmId }).populate('jobId');

        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        if (proposal.status !== 'accepted') {
            throw CustomException('Proposal must be accepted first', 400);
        }

        const job = proposal.jobId;

        // IDOR protection: Verify user owns the job
        if (job.userID.toString() !== request.userID) {
            throw CustomException('Not authorized', 403);
        }

        // Payment amount protection: Always use proposedAmount from database
        const payment_intent = await stripe.paymentIntents.create({
            amount: proposal.proposedAmount * 100,
            currency: "SAR",
            automatic_payment_methods: {
                enabled: true,
            },
        });

        // Mass assignment protection: Only allow specific fields
        const allowedOrderFields = {
            gigID: null,
            jobId: job._id,
            image: job.attachments?.[0]?.url || '',
            title: job.title,
            buyerID: request.userID,
            sellerID: proposal.lawyerId,
            price: proposal.proposedAmount, // Always from database, never from user input
            payment_intent: payment_intent.id,
            status: 'pending'
        };

        const order = new Order(allowedOrderFields);
        await order.save();

        // ✅ ADDED: Create notification for seller (lawyer)
        await createNotification({
            userId: proposal.lawyerId,
            type: 'payment',
            title: 'دفعة جديدة قيد المعالجة',
            message: `عميل يقوم بالدفع لعرضك على "${job.title}"`,
            link: '/orders',
            data: {
                orderId: order._id,
                proposalId: proposal._id
            },
            icon: '💰',
            priority: 'high'
        });
        
        return response.send({
            error: false,
            clientSecret: payment_intent.client_secret
        })
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

const updatePaymentStatus = async (request, response) => {
    try {
        // Input validation
        const { error, value } = schemas.updatePaymentStatus.validate(request.body);
        if (error) {
            throw CustomException(error.details[0].message, 400);
        }

        const { payment_intent } = value;
        const firmId = request.firmId;

        // Mass assignment protection: Only allow specific fields to be updated
        const allowedUpdates = {
            isCompleted: true,
            status: 'accepted',
            acceptedAt: new Date()
        };

        // SECURITY: TOCTOU Fix - Include authorization check directly in update query
        // This prevents race conditions where buyerID/sellerID could change between check and update
        const order = await Order.findOneAndUpdate(
            {
                payment_intent,
                firmId,
                $or: [
                    { buyerID: request.userID },
                    { sellerID: request.userID }
                ]
            },
            { $set: allowedUpdates },
            { new: true }
        );

        if (!order) {
            // Check if order exists but user is not authorized
            const existingOrder = await Order.findOne({ payment_intent, firmId });
            if (existingOrder) {
                throw CustomException('Not authorized to update this order', 403);
            }
            throw CustomException('Order not found', 404);
        }

        if(order?.isCompleted) {
            // ✅ ADDED: Notify seller that payment is confirmed
            await createNotification({
                userId: order.sellerID,
                type: 'payment',
                title: 'تم تأكيد الدفع',
                message: `تم تأكيد الدفع للطلب "${order.title}"`,
                link: '/orders',
                data: {
                    orderId: order._id
                },
                icon: '✅',
                priority: 'high'
            });

            return response.status(202).send({
                error: false,
                message: 'Order has been confirmed!'
            })
        }
        
        throw CustomException('Payment status not updated!', 500);
    }
    catch({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

// ========================================
// TEST MODE ONLY - REMOVE BEFORE LAUNCH
// ========================================
const createTestContract = async (request, response) => {
    try {
        // Input validation
        const { error, value } = schemas.orderIdParam.validate(request.params);
        if (error) {
            throw CustomException(error.details[0].message, 400);
        }

        const { _id } = value;
        const sanitizedGigId = sanitizeObjectId(_id);
        const firmId = request.firmId;

        // Get gig details
        const gig = await Gig.findOne({ _id: sanitizedGigId, firmId }).populate('userID', 'username email');
        if (!gig) {
            throw CustomException('Service not found!', 404);
        }

        // IDOR protection: Verify user is not buying their own service
        if (request.userID === gig.userID._id.toString()) {
            throw CustomException('You cannot order your own service!', 403);
        }

        // Mass assignment protection: Only allow specific fields
        // Payment amount protection: Always use price from database
        const allowedOrderFields = {
            gigID: gig._id,
            image: gig.cover,
            title: gig.title,
            buyerID: request.userID,
            sellerID: gig.userID,
            price: gig.price, // Always from database, never from user input
            payment_intent: `TEST-${Date.now()}-${sanitizedGigId}`,
            isCompleted: true,
            status: 'accepted',
            acceptedAt: new Date()
        };

        const order = new Order(allowedOrderFields);
        await order.save();

        // ✅ ADDED: Create notification for seller
        await createNotification({
            userId: gig.userID._id,
            type: 'order',
            title: 'طلب جديد (اختبار)',
            message: `طلب اختباري جديد على خدمة "${gig.title}"`,
            link: '/orders',
            data: {
                orderId: order._id,
                gigId: gig._id,
                testMode: true
            },
            icon: '🛍️',
            priority: 'high'
        });
        
        return response.status(201).send({
            error: false,
            order: order,
            message: '✅ Test contract created successfully! (Payment bypassed)',
            warning: '⚠️ TEST MODE - This endpoint should be removed before production'
        });
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

// ✅ NEW: Test contract for PROPOSAL
const createTestProposalContract = async (request, response) => {
    try {
        // Input validation
        const { error, value } = schemas.orderIdParam.validate(request.params);
        if (error) {
            throw CustomException(error.details[0].message, 400);
        }

        const { _id } = value;
        const sanitizedProposalId = sanitizeObjectId(_id);
        const firmId = request.firmId;

        const proposal = await Proposal.findOne({ _id: sanitizedProposalId, firmId }).populate('jobId lawyerId', 'title username');

        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        if (proposal.status !== 'accepted') {
            throw CustomException('Proposal must be accepted first', 400);
        }

        const job = proposal.jobId;

        // IDOR protection: Verify user owns the job
        if (job.userID.toString() !== request.userID) {
            throw CustomException('Not authorized', 403);
        }

        // Mass assignment protection: Only allow specific fields
        // Payment amount protection: Always use proposedAmount from database
        const allowedOrderFields = {
            gigID: null,
            jobId: job._id,
            image: job.attachments?.[0]?.url || '',
            title: job.title,
            buyerID: request.userID,
            sellerID: proposal.lawyerId._id,
            price: proposal.proposedAmount, // Always from database, never from user input
            payment_intent: `TEST-PROPOSAL-${Date.now()}-${sanitizedProposalId}`,
            isCompleted: true,
            status: 'accepted',
            acceptedAt: new Date()
        };

        const order = new Order(allowedOrderFields);
        await order.save();

        // ✅ ADDED: Create notification for seller (lawyer)
        await createNotification({
            userId: proposal.lawyerId._id,
            type: 'payment',
            title: 'عقد جديد (اختبار)',
            message: `عقد اختباري جديد على "${job.title}"`,
            link: '/orders',
            data: {
                orderId: order._id,
                proposalId: proposal._id,
                testMode: true
            },
            icon: '💰',
            priority: 'high'
        });
        
        return response.status(201).send({
            error: false,
            order: order,
            message: '✅ Test proposal contract created successfully! (Payment bypassed)',
            warning: '⚠️ TEST MODE - This endpoint should be removed before production'
        });
    }
    catch ({ message, status = 500 }) {
        return response.status(status).send({
            error: true,
            message
        })
    }
}

module.exports = {
    getOrders,
    paymentIntent,
    proposalPaymentIntent,
    updatePaymentStatus,
    createTestContract,
    createTestProposalContract
}
