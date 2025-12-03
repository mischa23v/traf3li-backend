const { Order, Gig, Proposal, Job } = require('../models');
const { CustomException } = require('../utils');
const { createNotification } = require('./notification.controller'); // ✅ ADDED
const stripe = require('stripe')(process.env.STRIPE_SECRET);

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
    const { _id } = request.params;
    
    try {
        const gig = await Gig.findOne({ _id }).populate('userID', 'username');
        
        const payment_intent = await stripe.paymentIntents.create({
            amount: gig.price * 100,
            currency: "INR",
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        const order = new Order({
            gigID: gig._id,
            image: gig.cover,
            title: gig.title,
            buyerID: request.userID,
            sellerID: gig.userID,
            price: gig.price,
            payment_intent: payment_intent.id
        });
        
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
    const { _id } = request.params; // proposalId
    
    try {
        const proposal = await Proposal.findById(_id).populate('jobId');
        
        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        if (proposal.status !== 'accepted') {
            throw CustomException('Proposal must be accepted first', 400);
        }

        const job = proposal.jobId;

        if (job.userID.toString() !== request.userID) {
            throw CustomException('Not authorized', 403);
        }
        
        const payment_intent = await stripe.paymentIntents.create({
            amount: proposal.proposedAmount * 100,
            currency: "SAR",
            automatic_payment_methods: {
                enabled: true,
            },
        });
        
        const order = new Order({
            gigID: null,
            jobId: job._id,
            image: job.attachments?.[0]?.url || '',
            title: job.title,
            buyerID: request.userID,
            sellerID: proposal.lawyerId,
            price: proposal.proposedAmount,
            payment_intent: payment_intent.id,
            status: 'pending'
        });
        
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
    const { payment_intent } = request.body;
    
    try {
        const order = await Order.findOneAndUpdate(
            { payment_intent }, 
            {
                $set: {
                    isCompleted: true,
                    status: 'accepted',
                    acceptedAt: new Date()
                }
            }, 
            { new: true }
        );
        
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
    const { _id } = request.params; // gigId
    
    try {
        // Get gig details
        const gig = await Gig.findOne({ _id }).populate('userID', 'username email');
        if (!gig) {
            throw CustomException('Service not found!', 404);
        }
        
        // Verify user is not buying their own service
        if (request.userID === gig.userID._id.toString()) {
            throw CustomException('You cannot order your own service!', 400);
        }
        
        // Create order directly (no payment needed for testing)
        const order = new Order({
            gigID: gig._id,
            image: gig.cover,
            title: gig.title,
            buyerID: request.userID,
            sellerID: gig.userID,
            price: gig.price,
            payment_intent: `TEST-${Date.now()}-${_id}`,
            isCompleted: true,
            status: 'accepted',
            acceptedAt: new Date()
        });
        
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
    const { _id } = request.params; // proposalId
    
    try {
        const proposal = await Proposal.findById(_id).populate('jobId lawyerId', 'title username');
        
        if (!proposal) {
            throw CustomException('Proposal not found', 404);
        }

        if (proposal.status !== 'accepted') {
            throw CustomException('Proposal must be accepted first', 400);
        }

        const job = proposal.jobId;

        if (job.userID.toString() !== request.userID) {
            throw CustomException('Not authorized', 403);
        }
        
        // Create order directly (no payment needed for testing)
        const order = new Order({
            gigID: null,
            jobId: job._id,
            image: job.attachments?.[0]?.url || '',
            title: job.title,
            buyerID: request.userID,
            sellerID: proposal.lawyerId._id,
            price: proposal.proposedAmount,
            payment_intent: `TEST-PROPOSAL-${Date.now()}-${_id}`,
            isCompleted: true,
            status: 'accepted',
            acceptedAt: new Date()
        });
        
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
