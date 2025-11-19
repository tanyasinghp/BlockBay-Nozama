const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const { orderManagerContract, listingRegistryContract, getFreshWallet } = require('../config/blockchain');

/**
 * POST /api/v1/orders
 * Create a new order (without payment)
 */
router.post('/', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { listingId, quantity, buyerAddress } = req.body;

    if (!listingId || !quantity || !buyerAddress) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'listingId, quantity, and buyerAddress are required',
        timestamp: new Date().toISOString()
      });
    }

    // Validate quantity
    if (quantity <= 0) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Quantity must be greater than 0',
        timestamp: new Date().toISOString()
      });
    }

    // Generate order ID
    const orderId = `ord_${Date.now()}_${uuidv4().substring(0, 8)}`;

    // Get fresh wallet for this transaction
    const buyerWallet = getFreshWallet();
    
    // Create order on blockchain
    const tx = await orderManagerContract.connect(buyerWallet).createOrder(
      orderId,
      listingId,
      quantity
    );
    
    const receipt = await tx.wait();
    console.log(`[OK] Order created: ${orderId}, tx: ${receipt.hash}`);

    // Fetch the created order
    const order = await orderManagerContract.getOrder(orderId);
    const listing = await listingRegistryContract.getListing(listingId);

    res.status(201).json({
      orderId: order.orderId,
      listingId: order.listingId,
      buyer: {
        address: order.buyer,
        did: `did:ethr:${order.buyer}`
      },
      seller: {
        address: order.seller,
        did: `did:ethr:${order.seller}`
      },
      quantity: Number(order.quantity),
      totalAmount: ethers.formatEther(order.totalAmount),
      totalAmountWei: order.totalAmount.toString(),
      currency: listing.currency,
      status: getOrderStatus(order.status),
      blockchain: {
        network: 'localhost',
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      },
      createdAt: new Date(Number(order.createdAt) * 1000).toISOString(),
      updatedAt: new Date(Number(order.updatedAt) * 1000).toISOString()
    });
  } catch (error) {
    if (error.message.includes('Insufficient stock')) {
      return res.status(400).json({
        error: 'InsufficientStock',
        message: 'Not enough stock available for this order',
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
});

/**
 * GET /api/v1/orders
 * Get all orders (with optional filters)
 */
router.get('/', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const { buyer, seller, status } = req.query;

    // Get total count
    const totalCount = await orderManagerContract.getOrdersCount();
    const totalCountNum = Number(totalCount);

    // Get orders (simplified - in production, implement proper pagination and filtering)
    const orders = [];
    const startIdx = (page - 1) * limit;
    const endIdx = Math.min(startIdx + limit, totalCountNum);

    for (let i = startIdx; i < endIdx; i++) {
      try {
        const orderId = await orderManagerContract.orderIds(i);
        const order = await orderManagerContract.getOrder(orderId);
        
        // Apply filters
        if (buyer && order.buyer.toLowerCase() !== buyer.toLowerCase()) continue;
        if (seller && order.seller.toLowerCase() !== seller.toLowerCase()) continue;
        if (status && getOrderStatus(order.status) !== status) continue;

        const listing = await listingRegistryContract.getListing(order.listingId);

        orders.push({
          orderId: order.orderId,
          listingId: order.listingId,
          listingName: listing.name,
          buyer: {
            address: order.buyer,
            did: `did:ethr:${order.buyer}`
          },
          seller: {
            address: order.seller,
            did: `did:ethr:${order.seller}`
          },
          quantity: Number(order.quantity),
          totalAmount: ethers.formatEther(order.totalAmount),
          currency: listing.currency,
          status: getOrderStatus(order.status),
          escrowId: order.escrowId !== ethers.ZeroHash ? order.escrowId : null,
          createdAt: new Date(Number(order.createdAt) * 1000).toISOString(),
          updatedAt: new Date(Number(order.updatedAt) * 1000).toISOString()
        });
      } catch (error) {
        console.error(`Error fetching order at index ${i}:`, error.message);
      }
    }

    res.json({
      orders,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCountNum / limit),
        totalResults: totalCountNum,
        resultsPerPage: limit
      }
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/v1/orders/:orderId
 * Get specific order details
 */
router.get('/:orderId', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { orderId } = req.params;

    try {
      const order = await orderManagerContract.getOrder(orderId);
      const listing = await listingRegistryContract.getListing(order.listingId);

      res.json({
        orderId: order.orderId,
        listingId: order.listingId,
        listing: {
          name: listing.name,
          ipfsCID: listing.ipfsCID
        },
        buyer: {
          address: order.buyer,
          did: `did:ethr:${order.buyer}`
        },
        seller: {
          address: order.seller,
          did: `did:ethr:${order.seller}`
        },
        quantity: Number(order.quantity),
        totalAmount: ethers.formatEther(order.totalAmount),
        totalAmountWei: order.totalAmount.toString(),
        currency: listing.currency,
        status: getOrderStatus(order.status),
        escrowId: order.escrowId !== ethers.ZeroHash ? order.escrowId : null,
        createdAt: new Date(Number(order.createdAt) * 1000).toISOString(),
        updatedAt: new Date(Number(order.updatedAt) * 1000).toISOString()
      });
    } catch (error) {
      if (error.message.includes('Order does not exist')) {
        return res.status(404).json({
          error: 'NotFound',
          message: 'Order not found',
          timestamp: new Date().toISOString()
        });
      }
      throw error;
    }
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/orders/:orderId/pay
 * Pay for an order and create escrow
 */
router.post('/:orderId/pay', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { orderId } = req.params;

    // Get order details
    const order = await orderManagerContract.getOrder(orderId);

    if (getOrderStatus(order.status) !== 'pending') {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Order is not in pending status',
        timestamp: new Date().toISOString()
      });
    }

    // Pay for the order (using buyer's wallet in production)
    const buyerWallet = getFreshWallet();
    
    const tx = await orderManagerContract.connect(buyerWallet).payOrder(orderId, {
      value: order.totalAmount
    });

    const receipt = await tx.wait();
    console.log(`[OK] Order paid: ${orderId}, tx: ${receipt.hash}`);

    // Get updated order
    const updatedOrder = await orderManagerContract.getOrder(orderId);

    res.json({
      orderId: updatedOrder.orderId,
      status: getOrderStatus(updatedOrder.status),
      escrowId: updatedOrder.escrowId,
      totalAmount: ethers.formatEther(updatedOrder.totalAmount),
      blockchain: {
        network: 'localhost',
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      },
      message: 'Payment successful and escrow created',
      updatedAt: new Date(Number(updatedOrder.updatedAt) * 1000).toISOString()
    });
  } catch (error) {
    if (error.message.includes('Incorrect payment amount')) {
      return res.status(400).json({
        error: 'InvalidPaymentAmount',
        message: 'Payment amount does not match order total',
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
});

/**
 * PUT /api/v1/orders/:orderId/status
 * Update order status (e.g., shipped, delivered)
 */
router.put('/:orderId/status', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { orderId } = req.params;
    const { status, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'status is required',
        timestamp: new Date().toISOString()
      });
    }

    const statusEnum = getOrderStatusEnum(status);
    if (statusEnum === null) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Invalid status value',
        timestamp: new Date().toISOString()
      });
    }

    // Update status (in production, verify caller is authorized)
    const tx = await orderManagerContract.updateOrderStatus(
      orderId,
      statusEnum,
      notes || ''
    );

    const receipt = await tx.wait();
    console.log(`[OK] Order status updated: ${orderId}, tx: ${receipt.hash}`);

    // Get updated order
    const updatedOrder = await orderManagerContract.getOrder(orderId);

    res.json({
      orderId: updatedOrder.orderId,
      status: getOrderStatus(updatedOrder.status),
      blockchain: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      },
      updatedAt: new Date(Number(updatedOrder.updatedAt) * 1000).toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/v1/orders/:orderId/confirm-delivery
 * Confirm delivery and release escrow to seller
 */
router.post('/:orderId/confirm-delivery', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { orderId } = req.params;

    // Confirm delivery (in production, verify caller is the buyer)
    const buyerWallet = getFreshWallet();
    
    const tx = await orderManagerContract.connect(buyerWallet).confirmDeliveryAndRelease(orderId);
    const receipt = await tx.wait();
    console.log(`[OK] Delivery confirmed and escrow released: ${orderId}, tx: ${receipt.hash}`);

    // Get updated order
    const updatedOrder = await orderManagerContract.getOrder(orderId);

    res.json({
      orderId: updatedOrder.orderId,
      status: getOrderStatus(updatedOrder.status),
      message: 'Delivery confirmed and payment released to seller',
      blockchain: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      },
      updatedAt: new Date(Number(updatedOrder.updatedAt) * 1000).toISOString()
    });
  } catch (error) {
    if (error.message.includes('Order must be shipped')) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Order must be in shipped status to confirm delivery',
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
});

/**
 * POST /api/v1/orders/:orderId/cancel
 * Cancel order and refund if paid
 */
router.post('/:orderId/cancel', async (req, res, next) => {
  try {
    if (!orderManagerContract) {
      return res.status(503).json({
        error: 'ServiceUnavailable',
        message: 'OrderManager contract not initialized',
        timestamp: new Date().toISOString()
      });
    }

    const { orderId } = req.params;
    const { reason } = req.body;

    const tx = await orderManagerContract.cancelOrderAndRefund(orderId, reason || 'Cancelled by user');
    const receipt = await tx.wait();
    console.log(`[OK] Order cancelled: ${orderId}, tx: ${receipt.hash}`);

    // Get updated order
    const updatedOrder = await orderManagerContract.getOrder(orderId);

    res.json({
      orderId: updatedOrder.orderId,
      status: getOrderStatus(updatedOrder.status),
      message: 'Order cancelled successfully',
      blockchain: {
        transactionHash: receipt.hash,
        blockNumber: receipt.blockNumber
      },
      updatedAt: new Date(Number(updatedOrder.updatedAt) * 1000).toISOString()
    });
  } catch (error) {
    if (error.message.includes('Cannot cancel at this stage')) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Order cannot be cancelled at current stage',
        timestamp: new Date().toISOString()
      });
    }
    next(error);
  }
});

// Helper functions
function getOrderStatus(statusEnum) {
  const statuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled', 'disputed', 'refunded'];
  return statuses[Number(statusEnum)] || 'unknown';
}

function getOrderStatusEnum(status) {
  const statusMap = {
    'pending': 0,
    'paid': 1,
    'shipped': 2,
    'delivered': 3,
    'cancelled': 4,
    'disputed': 5,
    'refunded': 6
  };
  return statusMap[status.toLowerCase()] !== undefined ? statusMap[status.toLowerCase()] : null;
}

module.exports = router;

