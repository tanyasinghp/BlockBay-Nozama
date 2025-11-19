// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Reputation
 * @dev Smart contract for managing decentralized seller reputation system
 * Tracks ratings, reviews, and trust scores for marketplace participants
 */
contract Reputation is Ownable, ReentrancyGuard {
    
    struct Review {
        address reviewer;
        address seller;
        uint256 orderId;
        uint8 rating; // 1-5 stars
        string comment;
        uint256 timestamp;
        bool isVerified; // True if from completed transaction
    }
    
    struct SellerProfile {
        address seller;
        uint256 totalReviews;
        uint256 totalRating;
        uint8 averageRating;
        uint256 totalSales;
        bool isVerified;
        uint256 memberSince;
        string did; // Decentralized identifier
    }
    
    // State variables
    mapping(address => SellerProfile) public sellerProfiles;
    mapping(uint256 => Review) public reviews;
    mapping(address => uint256[]) public sellerReviews;
    mapping(address => mapping(uint256 => bool)) public hasReviewed; // reviewer => orderId => bool
    
    uint256 public reviewCounter;
    uint256 public constant MIN_RATING = 1;
    uint256 public constant MAX_RATING = 5;
    
    // Events
    event SellerRegistered(
        address indexed seller,
        string did,
        uint256 timestamp
    );
    
    event ReviewSubmitted(
        uint256 indexed reviewId,
        address indexed reviewer,
        address indexed seller,
        uint256 orderId,
        uint8 rating,
        uint256 timestamp
    );
    
    event SellerVerified(
        address indexed seller,
        uint256 timestamp
    );
    
    event SaleCompleted(
        address indexed seller,
        uint256 orderId,
        uint256 timestamp
    );
    
    // Modifiers
    modifier validRating(uint8 _rating) {
        require(_rating >= MIN_RATING && _rating <= MAX_RATING, "Rating must be between 1 and 5");
        _;
    }
    
    modifier onlyRegisteredSeller(address _seller) {
        require(sellerProfiles[_seller].memberSince > 0, "Seller not registered");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        reviewCounter = 0;
    }
    
    /**
     * @dev Register a new seller
     * @param _did Decentralized identifier for the seller
     */
    function registerSeller(string memory _did) external {
        require(bytes(_did).length > 0, "DID cannot be empty");
        require(sellerProfiles[msg.sender].memberSince == 0, "Seller already registered");
        
        sellerProfiles[msg.sender] = SellerProfile({
            seller: msg.sender,
            totalReviews: 0,
            totalRating: 0,
            averageRating: 0,
            totalSales: 0,
            isVerified: false,
            memberSince: block.timestamp,
            did: _did
        });
        
        emit SellerRegistered(msg.sender, _did, block.timestamp);
    }
    
    /**
     * @dev Submit a review for a seller
     * @param _seller Seller address
     * @param _orderId Order ID for verification
     * @param _rating Rating from 1-5
     * @param _comment Review comment
     */
    function submitReview(
        address _seller,
        uint256 _orderId,
        uint8 _rating,
        string memory _comment
    ) external validRating(_rating) onlyRegisteredSeller(_seller) nonReentrant {
        require(_seller != msg.sender, "Cannot review yourself");
        require(!hasReviewed[msg.sender][_orderId], "Already reviewed this order");
        
        reviewCounter++;
        
        Review memory newReview = Review({
            reviewer: msg.sender,
            seller: _seller,
            orderId: _orderId,
            rating: _rating,
            comment: _comment,
            timestamp: block.timestamp,
            isVerified: true // In production, verify through order contract
        });
        
        reviews[reviewCounter] = newReview;
        sellerReviews[_seller].push(reviewCounter);
        hasReviewed[msg.sender][_orderId] = true;
        
        // Update seller's rating
        _updateSellerRating(_seller, _rating);
        
        emit ReviewSubmitted(
            reviewCounter,
            msg.sender,
            _seller,
            _orderId,
            _rating,
            block.timestamp
        );
    }
    
    /**
     * @dev Record a completed sale for reputation tracking
     * @param _seller Seller address
     * @param _orderId Order ID
     */
    function recordSale(address _seller, uint256 _orderId) 
        external 
        onlyRegisteredSeller(_seller) 
    {
        sellerProfiles[_seller].totalSales++;
        
        emit SaleCompleted(_seller, _orderId, block.timestamp);
    }
    
    /**
     * @dev Verify a seller (admin function)
     * @param _seller Seller address to verify
     */
    function verifySeller(address _seller) 
        external 
        onlyOwner 
        onlyRegisteredSeller(_seller) 
    {
        require(!sellerProfiles[_seller].isVerified, "Seller already verified");
        
        sellerProfiles[_seller].isVerified = true;
        
        emit SellerVerified(_seller, block.timestamp);
    }
    
    /**
     * @dev Get seller profile
     * @param _seller Seller address
     */
    function getSellerProfile(address _seller) 
        external 
        view 
        returns (
            uint256 totalReviews,
            uint8 averageRating,
            uint256 totalSales,
            bool isVerified,
            uint256 memberSince,
            string memory did
        ) 
    {
        SellerProfile memory profile = sellerProfiles[_seller];
        return (
            profile.totalReviews,
            profile.averageRating,
            profile.totalSales,
            profile.isVerified,
            profile.memberSince,
            profile.did
        );
    }
    
    /**
     * @dev Get seller's reviews
     * @param _seller Seller address
     */
    function getSellerReviews(address _seller) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return sellerReviews[_seller];
    }
    
    /**
     * @dev Get review details
     * @param _reviewId Review ID
     */
    function getReview(uint256 _reviewId) 
        external 
        view 
        returns (
            address reviewer,
            address seller,
            uint256 orderId,
            uint8 rating,
            string memory comment,
            uint256 timestamp,
            bool isVerified
        ) 
    {
        Review memory review = reviews[_reviewId];
        return (
            review.reviewer,
            review.seller,
            review.orderId,
            review.rating,
            review.comment,
            review.timestamp,
            review.isVerified
        );
    }
    
    /**
     * @dev Calculate reputation score (0-100)
     * @param _seller Seller address
     */
    function getReputationScore(address _seller) 
        external 
        view 
        returns (uint256) 
    {
        SellerProfile memory profile = sellerProfiles[_seller];
        
        if (profile.totalReviews == 0) {
            return 50; // Default score for new sellers
        }
        
        // Base score from average rating (20-100)
        uint256 baseScore = (uint256(profile.averageRating) * 20);
        
        // Bonus for verification
        if (profile.isVerified) {
            baseScore += 5;
        }
        
        // Bonus for sales volume (up to 10 points)
        uint256 salesBonus = profile.totalSales > 100 ? 10 : (profile.totalSales / 10);
        baseScore += salesBonus;
        
        // Ensure score doesn't exceed 100
        return baseScore > 100 ? 100 : baseScore;
    }
    
    /**
     * @dev Internal function to update seller rating
     * @param _seller Seller address
     * @param _rating New rating to add
     */
    function _updateSellerRating(address _seller, uint8 _rating) internal {
        SellerProfile storage profile = sellerProfiles[_seller];
        
        profile.totalRating += _rating;
        profile.totalReviews++;
        profile.averageRating = uint8(profile.totalRating / profile.totalReviews);
    }
    
    /**
     * @dev Get total number of reviews
     */
    function getTotalReviews() external view returns (uint256) {
        return reviewCounter;
    }
    
    /**
     * @dev Check if seller is registered
     * @param _seller Seller address
     */
    function isSellerRegistered(address _seller) external view returns (bool) {
        return sellerProfiles[_seller].memberSince > 0;
    }
}
