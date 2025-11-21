// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Escrow
 * @dev Manages escrow payments for orders with time-lock and dispute mechanisms
 */
contract Escrow is Ownable, ReentrancyGuard {
    
    enum EscrowState { Locked, Released, Refunded, Disputed }
    
    struct EscrowDetails {
        bytes32 escrowId;
        string orderId;
        address buyer;
        address seller;
        uint256 amount;
        EscrowState state;
        uint256 createdAt;
        uint256 releaseTime;
        bool disputed;
    }
    
    // Escrow release period (14 days for auto-release if no dispute)
    uint256 public constant ESCROW_PERIOD = 14 days;
    
    // Minimum dispute window
    uint256 public constant DISPUTE_WINDOW = 7 days;
    
    // Mapping from escrowId to EscrowDetails
    mapping(bytes32 => EscrowDetails) public escrows;
    
    // Mapping from orderId to escrowId
    mapping(string => bytes32) public orderToEscrow;
    
    // Array to track all escrow IDs
    bytes32[] public escrowIds;
    
    // Events
    event EscrowCreated(
        bytes32 indexed escrowId,
        string indexed orderId,
        address indexed buyer,
        address seller,
        uint256 amount
    );
    
    event EscrowReleased(
        bytes32 indexed escrowId,
        string indexed orderId,
        address seller,
        uint256 amount
    );
    
    event EscrowRefunded(
        bytes32 indexed escrowId,
        string indexed orderId,
        address buyer,
        uint256 amount
    );
    
    event DisputeInitiated(
        bytes32 indexed escrowId,
        string indexed orderId,
        address initiator
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create escrow and lock funds
     */
    function createEscrow(
        string memory _orderId,
        address _seller
    ) external payable nonReentrant returns (bytes32) {
        require(msg.value > 0, "Must send ETH to escrow");
        require(_seller != address(0), "Invalid seller address");
        require(_seller != msg.sender, "Buyer and seller cannot be the same");
        require(orderToEscrow[_orderId] == bytes32(0), "Escrow already exists for this order");
        
        bytes32 escrowId = keccak256(abi.encodePacked(_orderId, msg.sender, block.timestamp));
        
        EscrowDetails memory newEscrow = EscrowDetails({
            escrowId: escrowId,
            orderId: _orderId,
            buyer: msg.sender,
            seller: _seller,
            amount: msg.value,
            state: EscrowState.Locked,
            createdAt: block.timestamp,
            releaseTime: block.timestamp + ESCROW_PERIOD,
            disputed: false
        });
        
        escrows[escrowId] = newEscrow;
        orderToEscrow[_orderId] = escrowId;
        escrowIds.push(escrowId);
        
        emit EscrowCreated(escrowId, _orderId, msg.sender, _seller, msg.value);
        
        return escrowId;
    }
    
    /**
     * @dev Release escrow funds to seller
     */
    function releaseEscrow(bytes32 _escrowId) external nonReentrant {
        EscrowDetails storage escrow = escrows[_escrowId];
        
        require(escrow.escrowId != bytes32(0), "Escrow does not exist");
        require(escrow.state == EscrowState.Locked, "Escrow is not locked");
        require(!escrow.disputed, "Escrow is disputed");
        require(
            msg.sender == escrow.buyer || 
            msg.sender == owner() || 
            block.timestamp >= escrow.releaseTime,
            "Not authorized to release"
        );
        
        escrow.state = EscrowState.Released;
        
        // Transfer funds to seller
        (bool success, ) = escrow.seller.call{value: escrow.amount}("");
        require(success, "Transfer to seller failed");
        
        emit EscrowReleased(_escrowId, escrow.orderId, escrow.seller, escrow.amount);
    }
    
    /**
     * @dev Refund escrow to buyer
     */
    function refundEscrow(bytes32 _escrowId) external nonReentrant {
        EscrowDetails storage escrow = escrows[_escrowId];
        
        require(escrow.escrowId != bytes32(0), "Escrow does not exist");
        require(escrow.state == EscrowState.Locked, "Escrow is not locked");
        require(
            msg.sender == escrow.seller || 
            msg.sender == owner() ||
            (escrow.disputed && block.timestamp >= escrow.createdAt + DISPUTE_WINDOW),
            "Not authorized to refund"
        );
        
        escrow.state = EscrowState.Refunded;
        
        // Transfer funds back to buyer
        (bool success, ) = escrow.buyer.call{value: escrow.amount}("");
        require(success, "Transfer to buyer failed");
        
        emit EscrowRefunded(_escrowId, escrow.orderId, escrow.buyer, escrow.amount);
    }
    
    /**
     * @dev Initiate a dispute
     */
    function initiateDispute(bytes32 _escrowId) external {
        EscrowDetails storage escrow = escrows[_escrowId];
        
        require(escrow.escrowId != bytes32(0), "Escrow does not exist");
        require(escrow.state == EscrowState.Locked, "Escrow is not locked");
        require(!escrow.disputed, "Dispute already initiated");
        require(
            msg.sender == escrow.buyer || msg.sender == escrow.seller,
            "Only buyer or seller can dispute"
        );
        
        escrow.disputed = true;
        escrow.state = EscrowState.Disputed;
        
        emit DisputeInitiated(_escrowId, escrow.orderId, msg.sender);
    }
    
    /**
     * @dev Get escrow details
     */
    function getEscrow(bytes32 _escrowId) external view returns (EscrowDetails memory) {
        require(escrows[_escrowId].escrowId != bytes32(0), "Escrow does not exist");
        return escrows[_escrowId];
    }
    
    /**
     * @dev Get escrow by order ID
     */
    function getEscrowByOrderId(string memory _orderId) external view returns (EscrowDetails memory) {
        bytes32 escrowId = orderToEscrow[_orderId];
        require(escrowId != bytes32(0), "No escrow found for this order");
        return escrows[escrowId];
    }
    
    /**
     * @dev Get total escrows count
     */
    function getEscrowsCount() external view returns (uint256) {
        return escrowIds.length;
    }
    
    /**
     * @dev Check if escrow can be auto-released
     */
    function canAutoRelease(bytes32 _escrowId) external view returns (bool) {
        EscrowDetails memory escrow = escrows[_escrowId];
        return escrow.state == EscrowState.Locked && 
               !escrow.disputed && 
               block.timestamp >= escrow.releaseTime;
    }
}

