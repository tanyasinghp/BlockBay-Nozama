const express = require('express');
const router = express.Router();
const { ethers } = require('ethers');
const { v4: uuidv4 } = require('uuid');
const { orderManagerContract, listingRegistryContract, getFreshWallet } = require('../config/blockchain');

const escrowClient = require('../grpc/escrowClient');

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

    if (quantity <= 0) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'Quantity must be greater than 0',
        timestamp: new Date().toISOString()
      });
    }

    const orderId = `ord_${Date.now()}_${uuidv4().substring(0, 8)}`;

    console.log("🧾 Creating order on-chain:", { orderId, listingId, quantity, buyerAddress });

    const buyerWallet = getFreshWallet();

    const tx = await orderManagerContract
      .connect(buyerWallet)
      .createOrder(orderId, listingId, quantity);

    const receipt = await tx.wait();
    console.log(`[OK] Order created on-chain: ${orderId}, tx: ${receipt.hash}`);

    let orderOnChain = null;
    try {
      console.log("🔍 Fetching order from chain with getOrder:", orderId);
      orderOnChain = await orderManagerContract.getOrder(orderId);
    } catch (err) {
      console.error("⚠️ getOrder failed, returning minimal order response:", err);
    }

    // If getOrder worked, use full on-chain data
    if (orderOnChain) {
      const listing = await listingRegistryContract.getListing(listingId);

      return res.status(201).json({
        orderId: orderOnChain.orderId,
        listingId: orderOnChain.listingId,
        buyer: {
          address: orderOnChain.buyer,
          did: `did:ethr:${orderOnChain.buyer}`
        },
        seller: {
          address: orderOnChain.seller,
          did: `did:ethr:${orderOnChain.seller}`
        },
        quantity: Number(orderOnChain.quantity),
        totalAmount: ethers.formatEther(orderOnChain.totalAmount),
        totalAmountWei: orderOnChain.totalAmount.toString(),
        currency: listing.currency,
        status: getOrderStatus(orderOnChain.status),
        blockchain: {
          network: 'localhost',
          transactionHash: receipt.hash,
          blockNumber: receipt.blockNumber
        },
        createdAt: new Date(Number(orderOnChain.createdAt) * 1000).toISOString(),
        updatedAt: new Date(Number(orderOnChain.updatedAt) * 1000).toISOString()
      });
    }

    // Fallback: minimal response if getOrder() is being weird
    return res.status(201).json({
      orderId,
      listingId,
      quantity,
      buyer: { address: buyerAddress },
      status: "pending",
      note: "On-chain createOrder succeeded, but getOrder decoding failed – using fallback payload."
    });
  } catch (error) {
    console.error("❌ Error inside POST /orders:", error);
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
// router.post('/:orderId/pay', async (req, res, next) => {
//   try {
//     const { orderId } = req.params;

//     console.log("💳 PAY endpoint called for order:", orderId);

//     // call to gRPC coming later
//     res.json({
//       orderId,
//       status: "paid",
//       message: "Payment method triggered successfully (mock response)"
//     });

//   } catch (error) {
//     console.error("❌ Error inside /pay route:", error);
//     next(error);
//   }
// });


router.post("/:orderId/pay", async (req, res, next) => {
  try {
    console.log("🚀 /pay endpoint HIT!", req.params.orderId);
    const { orderId } = req.params;

    console.log("💳 PAY endpoint called for order:", orderId);

    // TEMP MOCK order data (next we store in DB after Pay is done)
    const order = {
      orderId,
      buyer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",      // hardhat account 0
      seller: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",     // hardhat account 1
      amount: "1.2"  // ETH value (NOT IN WEI - convert later)
    };

    console.log("📨 Calling CreateEscrow gRPC with:", {
      orderId: order.orderId,
      buyer: order.buyer,
      seller: order.seller,
      amount: order.amount
    });

    // gRPC call to Payment/Escrow service
    escrowClient.CreateEscrow(
      {
        orderId: order.orderId,
        buyer: order.buyer,
        seller: order.seller,
        amount: order.amount
      },
      (err, response) => {
        if (err) {
          console.error("❌ gRPC Error:", err);
          return res.status(500).json({ error: "GRPC_ERROR", message: err.message });
        }

        console.log("📩 gRPC Response:", response);

        return res.json({
          orderId,
          escrowId: response.escrowId,
          status: "paid",
          message: "Escrow created via payment-service gRPC"
        });
      }
    );
  } catch (error) {
    console.error("❌ Router error:", error);
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
// router.post('/:orderId/confirm-delivery', async (req, res, next) => {
//   try {
//     if (!orderManagerContract) {
//       return res.status(503).json({
//         error: 'ServiceUnavailable',
//         message: 'OrderManager contract not initialized',
//         timestamp: new Date().toISOString()
//       });
//     }

//     const { orderId } = req.params;

//     // Confirm delivery (in production, verify caller is the buyer)
//     // NEW CODE via gRPC
//     const escrowClient = require('../grpc/escrowClient');

//     escrowClient.ReleaseEscrow({ escrowId: order.escrowId }, (err, response) => {
//       if (err) return next(err);

//       res.json({
//         orderId,
//         escrowId: response.escrowId,
//         status: "released",
//         message: "Escrow released — seller will receive payment"
//       });
//     });

//     // Get updated order
//     const updatedOrder = await orderManagerContract.getOrder(orderId);

//     res.json({
//       orderId: updatedOrder.orderId,
//       status: getOrderStatus(updatedOrder.status),
//       message: 'Delivery confirmed and payment released to seller',
//       blockchain: {
//         transactionHash: receipt.hash,
//         blockNumber: receipt.blockNumber
//       },
//       updatedAt: new Date(Number(updatedOrder.updatedAt) * 1000).toISOString()
//     });
//   } catch (error) {
//     if (error.message.includes('Order must be shipped')) {
//       return res.status(400).json({
//         error: 'BadRequest',
//         message: 'Order must be in shipped status to confirm delivery',
//         timestamp: new Date().toISOString()
//       });
//     }
//     next(error);
//   }
// });
/**
 * POST /api/v1/orders/:orderId/confirm-delivery
 * Confirm delivery and release escrow to seller via gRPC + listen via webhook
 *
 * Body: { "escrowId": "escrow_..." }
 */
router.post('/:orderId/confirm-delivery', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const { escrowId } = req.body;

    console.log('🚀 /confirm-delivery HIT!', { orderId, escrowId });

    if (!escrowId) {
      return res.status(400).json({
        error: 'BadRequest',
        message: 'escrowId is required in request body',
        timestamp: new Date().toISOString()
      });
    }

    console.log('📨 Calling gRPC ReleaseEscrow with:', { escrowId });

    // gRPC call to payment-service (escrow)
    escrowClient.ReleaseEscrow({ escrowId }, (err, response) => {
      if (err) {
        console.error('❌ gRPC ReleaseEscrow Error:', err);
        return res.status(500).json({
          error: 'GRPC_ERROR',
          message: err.message
        });
      }

      console.log('📩 gRPC ReleaseEscrow Response:', response);

      // 🔔 At this point:
      // - Escrow contract emits EscrowReleased
      // - payment-service indexer picks it up
      // - payment-service calls webhooks (one of them is order-service /api/v1/webhooks/escrow-events)

      return res.json({
        orderId,
        escrowId,
        status: 'delivered',
        escrowStatus: response.status,
        message: 'Delivery confirmed – escrow release triggered via gRPC'
      });
    });
  } catch (error) {
    console.error('❌ /confirm-delivery router error:', error);
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

    // NEW CODE via gRPC
    const escrowClient = require('../grpc/escrowClient');

    escrowClient.RefundEscrow({ escrowId: order.escrowId }, (err, response) => {
      if (err) return next(err);

      res.json({
        orderId,
        escrowId: response.escrowId,
        status: "refunded",
        message: "Order cancelled and escrow refunded"
      });
    });


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

