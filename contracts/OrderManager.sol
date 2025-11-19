// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./ListingRegistry.sol";
import "./Escrow.sol";

/**
 * @title OrderManager
 * @dev Manages order lifecycle and coordinates with Listing and Escrow contracts
 */
contract OrderManager is Ownable, ReentrancyGuard {
    
    enum OrderStatus { Pending, Paid, Shipped, Delivered, Cancelled, Disputed, Refunded }
    
    struct Order {
        string orderId;
        string listingId;
        address buyer;
        address seller;
        uint256 quantity;
        uint256 totalAmount;
        OrderStatus status;
        bytes32 escrowId;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // Contract references
    ListingRegistry public listingRegistry;
    Escrow public escrowContract;
    
    // Mapping from orderId to Order
    mapping(string => Order) public orders;
    
    // Array to track all order IDs
    string[] public orderIds;
    
    // Mapping from buyer to their order IDs
    mapping(address => string[]) public buyerOrders;
    
    // Mapping from seller to their order IDs
    mapping(address => string[]) public sellerOrders;
    
    // Events
    event OrderCreated(
        string indexed orderId,
        string indexed listingId,
        address indexed buyer,
        address seller,
        uint256 quantity,
        uint256 totalAmount
    );
    
    event OrderPaid(
        string indexed orderId,
        bytes32 escrowId,
        uint256 amount
    );
    
    event OrderStatusUpdated(
        string indexed orderId,
        OrderStatus oldStatus,
        OrderStatus newStatus
    );
    
    event OrderShipped(
        string indexed orderId,
        string trackingInfo
    );
    
    event OrderDelivered(
        string indexed orderId
    );
    
    event OrderCancelled(
        string indexed orderId,
        string reason
    );
    
    constructor(
        address _listingRegistryAddress,
        address _escrowAddress
    ) Ownable(msg.sender) {
        require(_listingRegistryAddress != address(0), "Invalid listing registry address");
        require(_escrowAddress != address(0), "Invalid escrow address");
        
        listingRegistry = ListingRegistry(_listingRegistryAddress);
        escrowContract = Escrow(_escrowAddress);
    }
    
    /**
     * @dev Create a new order (without payment)
     */
    function createOrder(
        string memory _orderId,
        string memory _listingId,
        uint256 _quantity
    ) external nonReentrant returns (bool) {
        require(bytes(_orderId).length > 0, "Invalid order ID");
        require(bytes(orders[_orderId].orderId).length == 0, "Order already exists");
        require(_quantity > 0, "Quantity must be greater than 0");
        
        // Get listing details
        ListingRegistry.Listing memory listing = listingRegistry.getListing(_listingId);
        require(listing.active, "Listing is not active");
        require(listing.stock >= _quantity, "Insufficient stock");
        
        // Calculate total amount
        uint256 totalAmount = listing.price * _quantity;
        
        // Decrement stock
        require(listingRegistry.decrementStock(_listingId, _quantity), "Failed to decrement stock");
        
        // Create order
        Order memory newOrder = Order({
            orderId: _orderId,
            listingId: _listingId,
            buyer: msg.sender,
            seller: listing.seller,
            quantity: _quantity,
            totalAmount: totalAmount,
            status: OrderStatus.Pending,
            escrowId: bytes32(0),
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        orders[_orderId] = newOrder;
        orderIds.push(_orderId);
        buyerOrders[msg.sender].push(_orderId);
        sellerOrders[listing.seller].push(_orderId);
        
        emit OrderCreated(_orderId, _listingId, msg.sender, listing.seller, _quantity, totalAmount);
        
        return true;
    }
    
    /**
     * @dev Pay for an order and create escrow
     */
    function payOrder(string memory _orderId) external payable nonReentrant returns (bytes32) {
        Order storage order = orders[_orderId];
        
        require(bytes(order.orderId).length > 0, "Order does not exist");
        require(order.buyer == msg.sender, "Not the buyer");
        require(order.status == OrderStatus.Pending, "Order is not pending");
        require(msg.value == order.totalAmount, "Incorrect payment amount");
        
        // Create escrow
        bytes32 escrowId = escrowContract.createEscrow{value: msg.value}(_orderId, order.seller);
        
        // Update order
        order.escrowId = escrowId;
        order.status = OrderStatus.Paid;
        order.updatedAt = block.timestamp;
        
        emit OrderPaid(_orderId, escrowId, msg.value);
        emit OrderStatusUpdated(_orderId, OrderStatus.Pending, OrderStatus.Paid);
        
        return escrowId;
    }
    
    /**
     * @dev Update order status (seller can mark as shipped, buyer can mark as delivered)
     */
    function updateOrderStatus(
        string memory _orderId,
        OrderStatus _newStatus,
        string memory _notes
    ) external {
        Order storage order = orders[_orderId];
        
        require(bytes(order.orderId).length > 0, "Order does not exist");
        require(
            msg.sender == order.buyer || 
            msg.sender == order.seller || 
            msg.sender == owner(),
            "Not authorized"
        );
        
        OrderStatus oldStatus = order.status;
        
        // Status transition validation
        if (_newStatus == OrderStatus.Shipped) {
            require(order.status == OrderStatus.Paid, "Order must be paid first");
            require(msg.sender == order.seller, "Only seller can mark as shipped");
            emit OrderShipped(_orderId, _notes);
        } else if (_newStatus == OrderStatus.Delivered) {
            require(order.status == OrderStatus.Shipped, "Order must be shipped first");
            emit OrderDelivered(_orderId);
        } else if (_newStatus == OrderStatus.Cancelled) {
            require(order.status == OrderStatus.Pending || order.status == OrderStatus.Paid, "Cannot cancel at this stage");
            emit OrderCancelled(_orderId, _notes);
        }
        
        order.status = _newStatus;
        order.updatedAt = block.timestamp;
        
        emit OrderStatusUpdated(_orderId, oldStatus, _newStatus);
    }
    
    /**
     * @dev Confirm delivery and release escrow
     */
    function confirmDeliveryAndRelease(string memory _orderId) external nonReentrant {
        Order storage order = orders[_orderId];
        
        require(bytes(order.orderId).length > 0, "Order does not exist");
        require(msg.sender == order.buyer, "Only buyer can confirm delivery");
        require(order.status == OrderStatus.Shipped, "Order must be shipped");
        require(order.escrowId != bytes32(0), "No escrow found");
        
        // Update order status
        order.status = OrderStatus.Delivered;
        order.updatedAt = block.timestamp;
        
        // Release escrow
        escrowContract.releaseEscrow(order.escrowId);
        
        emit OrderDelivered(_orderId);
        emit OrderStatusUpdated(_orderId, OrderStatus.Shipped, OrderStatus.Delivered);
    }
    
    /**
     * @dev Cancel order and refund (if paid)
     */
    function cancelOrderAndRefund(string memory _orderId, string memory _reason) external nonReentrant {
        Order storage order = orders[_orderId];
        
        require(bytes(order.orderId).length > 0, "Order does not exist");
        require(
            msg.sender == order.buyer || 
            msg.sender == order.seller || 
            msg.sender == owner(),
            "Not authorized"
        );
        require(
            order.status == OrderStatus.Pending || order.status == OrderStatus.Paid,
            "Cannot cancel at this stage"
        );
        
        OrderStatus oldStatus = order.status;
        order.status = OrderStatus.Cancelled;
        order.updatedAt = block.timestamp;
        
        // Refund if already paid
        if (oldStatus == OrderStatus.Paid && order.escrowId != bytes32(0)) {
            escrowContract.refundEscrow(order.escrowId);
            order.status = OrderStatus.Refunded;
        }
        
        emit OrderCancelled(_orderId, _reason);
        emit OrderStatusUpdated(_orderId, oldStatus, order.status);
    }
    
    /**
     * @dev Get order details
     */
    function getOrder(string memory _orderId) external view returns (Order memory) {
        require(bytes(orders[_orderId].orderId).length > 0, "Order does not exist");
        return orders[_orderId];
    }
    
    /**
     * @dev Get buyer's orders
     */
    function getBuyerOrders(address _buyer) external view returns (string[] memory) {
        return buyerOrders[_buyer];
    }
    
    /**
     * @dev Get seller's orders
     */
    function getSellerOrders(address _seller) external view returns (string[] memory) {
        return sellerOrders[_seller];
    }
    
    /**
     * @dev Get total orders count
     */
    function getOrdersCount() external view returns (uint256) {
        return orderIds.length;
    }
}

