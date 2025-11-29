// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title Reputation
 * @dev Enhanced smart contract for managing decentralized identity and reputation system
 * Supports bidirectional ratings, complex verification workflow, and DID management
 */
contract Reputation is Ownable, ReentrancyGuard {
    
    enum VerificationStatus {
        UNVERIFIED,
        PENDING, 
        VERIFIED,
        REVOKED
    }
    
    enum RatingType {
        BUYER_TO_SELLER,
        SELLER_TO_BUYER,
        ADMIN_ADJUSTMENT
    }
    
    struct Verification {
        VerificationStatus status;
        string method;
        address verifier;
        string txHash;
        uint256 blockNumber;
        uint256 verifiedAt;
    }
    
    struct ReputationScore {
        uint256 value; // 0-100
        string algorithm;
        uint256 confidence; // 0-100 (representing 0-1 as percentage)
    }
    
    struct Identity {
        string did;
        address userAddress;
        string name;
        string bio;
        string avatar;
        bool verified;
        Verification verification;
        ReputationScore reputationScore;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    struct Rating {
        string ratingId;
        string orderId;
        address fromAddress;
        string fromDID;
        string fromName;
        address toAddress;
        string toDID;
        string toName;
        uint8 score; // 1-5
        string comment;
        RatingType ratingType;
        uint256 createdAt;
        bool exists;
    }
    
    // State variables
    mapping(address => Identity) public identities;
    mapping(string => address) public didToAddress; // DID => address mapping
    mapping(string => Rating) public ratings; // ratingId => Rating
    mapping(address => string[]) public userRatings; // user => ratingIds[]
    mapping(string => string[]) public orderRatings; // orderId => ratingIds[]
    mapping(string => bool) public ratingExists; // ratingId => exists
    
    uint256 public identityCounter;
    uint256 public ratingCounter;
    uint256 public constant MIN_RATING = 1;
    uint256 public constant MAX_RATING = 5;
    
    // DID validation regex pattern stored as string for events
    string public constant DID_PATTERN = "did:ethr:0x";
    
    // Events
    event IdentityCreated(
        address indexed userAddress,
        string indexed did,
        string name,
        uint256 timestamp
    );
    
    event IdentityUpdated(
        address indexed userAddress,
        string indexed did,
        uint256 timestamp
    );
    
    event VerificationStatusChanged(
        address indexed userAddress,
        string indexed did,
        VerificationStatus oldStatus,
        VerificationStatus newStatus,
        uint256 timestamp
    );
    
    event RatingSubmitted(
        string indexed ratingId,
        string indexed orderId,
        address indexed fromAddress,
        address toAddress,
        uint8 score,
        RatingType ratingType,
        uint256 timestamp
    );
    
    event ReputationScoreUpdated(
        address indexed userAddress,
        string indexed did,
        uint256 oldScore,
        uint256 newScore,
        uint256 timestamp
    );
    
    // Modifiers
    modifier validRating(uint8 _rating) {
        require(_rating >= MIN_RATING && _rating <= MAX_RATING, "Rating must be between 1 and 5");
        _;
    }
    
    modifier validDID(string memory _did) {
        require(bytes(_did).length > 10, "DID too short");
        require(_isValidDIDFormat(_did), "Invalid DID format - must be did:ethr:0x...");
        _;
    }
    
    modifier onlyRegisteredIdentity(address _user) {
        require(identities[_user].createdAt > 0, "Identity not registered");
        _;
    }
    
    modifier onlyVerifiedIdentity(address _user) {
        require(identities[_user].verification.status == VerificationStatus.VERIFIED, "Identity not verified");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        identityCounter = 0;
        ratingCounter = 0;
    }
    
    /**
     * @dev Create a new identity
     * @param _did Decentralized identifier
     * @param _name User's name
     * @param _bio User's bio
     * @param _avatar Avatar URL
     */
    function createIdentity(
        string memory _did,
        string memory _name,
        string memory _bio,
        string memory _avatar
    ) external validDID(_did) {
        require(identities[msg.sender].createdAt == 0, "Identity already exists");
        require(didToAddress[_did] == address(0), "DID already taken");
        
        identityCounter++;
        _initializeIdentity(_did, _name, _bio, _avatar);
        didToAddress[_did] = msg.sender;
        
        emit IdentityCreated(msg.sender, _did, _name, block.timestamp);
    }
    
    function _initializeIdentity(
        string memory _did,
        string memory _name,
        string memory _bio,
        string memory _avatar
    ) private {
        Identity storage newIdentity = identities[msg.sender];
        newIdentity.did = _did;
        newIdentity.userAddress = msg.sender;
        newIdentity.name = _name;
        newIdentity.bio = _bio;
        newIdentity.avatar = _avatar;
        newIdentity.verified = false;
        newIdentity.verification.status = VerificationStatus.UNVERIFIED;
        newIdentity.reputationScore.value = 50;
        newIdentity.reputationScore.algorithm = "weighted-v1";
        newIdentity.reputationScore.confidence = 50;
        newIdentity.createdAt = block.timestamp;
        newIdentity.updatedAt = block.timestamp;
    }
    
    /**
     * @dev Submit a rating
     * @param _toAddress Recipient address
     * @param _orderId Order ID for verification
     * @param _rating Rating from 1-5
     * @param _comment Review comment
     * @param _ratingType Type of rating (buyer to seller, etc.)
     */
    function submitRating(
        address _toAddress,
        string memory _orderId,
        uint8 _rating,
        string memory _comment,
        RatingType _ratingType
    ) external validRating(_rating) onlyRegisteredIdentity(_toAddress) onlyRegisteredIdentity(msg.sender) nonReentrant {
        require(_toAddress != msg.sender, "Cannot rate yourself");
        
        ratingCounter++;
        string memory ratingId = _generateRatingId();
        
        _createRating(ratingId, _toAddress, _orderId, _rating, _comment, _ratingType);
        _updateReputationScore(_toAddress);
        
        emit RatingSubmitted(
            ratingId,
            _orderId,
            msg.sender,
            _toAddress,
            _rating,
            _ratingType,
            block.timestamp
        );
    }
    
    function _generateRatingId() private view returns (string memory) {
        return string(abi.encodePacked("r_", _toString(ratingCounter), "_", _toString(block.timestamp)));
    }
    
    function _createRating(
        string memory ratingId,
        address _toAddress,
        string memory _orderId,
        uint8 _rating,
        string memory _comment,
        RatingType _ratingType
    ) private {
        require(!ratingExists[ratingId], "Rating ID collision");
        
        Rating storage newRating = ratings[ratingId];
        newRating.ratingId = ratingId;
        newRating.orderId = _orderId;
        newRating.fromAddress = msg.sender;
        newRating.fromDID = identities[msg.sender].did;
        newRating.fromName = identities[msg.sender].name;
        newRating.toAddress = _toAddress;
        newRating.toDID = identities[_toAddress].did;
        newRating.toName = identities[_toAddress].name;
        newRating.score = _rating;
        newRating.comment = _comment;
        newRating.ratingType = _ratingType;
        newRating.createdAt = block.timestamp;
        newRating.exists = true;
        
        ratingExists[ratingId] = true;
        userRatings[_toAddress].push(ratingId);
        orderRatings[_orderId].push(ratingId);
    }
    
    /**
     * @dev Update identity information
     * @param _name New name
     * @param _bio New bio
     * @param _avatar New avatar URL
     */
    function updateIdentity(
        string memory _name,
        string memory _bio,
        string memory _avatar
    ) external onlyRegisteredIdentity(msg.sender) {
        Identity storage identity = identities[msg.sender];
        
        identity.name = _name;
        identity.bio = _bio;
        identity.avatar = _avatar;
        identity.updatedAt = block.timestamp;
        
        emit IdentityUpdated(msg.sender, identity.did, block.timestamp);
    }
    
    /**
     * @dev Set verification status (admin or authorized verifier)
     * @param _user User address to verify
     * @param _status New verification status
     * @param _method Verification method
     * @param _txHash Transaction hash for verification
     */
    function setVerificationStatus(
        address _user,
        VerificationStatus _status,
        string memory _method,
        string memory _txHash
    ) external onlyOwner onlyRegisteredIdentity(_user) {
        Identity storage identity = identities[_user];
        VerificationStatus oldStatus = identity.verification.status;
        
        identity.verification.status = _status;
        identity.verification.method = _method;
        identity.verification.verifier = msg.sender;
        identity.verification.txHash = _txHash;
        identity.verification.blockNumber = block.number;
        identity.verification.verifiedAt = block.timestamp;
        identity.verified = (_status == VerificationStatus.VERIFIED);
        identity.updatedAt = block.timestamp;
        
        // Update reputation score based on verification
        _updateReputationScore(_user);
        
        emit VerificationStatusChanged(_user, identity.did, oldStatus, _status, block.timestamp);
    }
    
    /**
     * @dev Get identity by address
     * @param _user User address
     */
    function getIdentity(address _user) 
        external 
        view 
        returns (
            string memory did,
            string memory name,
            string memory bio,
            string memory avatar,
            bool verified,
            VerificationStatus verificationStatus,
            uint256 reputationScore,
            uint256 createdAt
        ) 
    {
        Identity memory identity = identities[_user];
        return (
            identity.did,
            identity.name,
            identity.bio,
            identity.avatar,
            identity.verified,
            identity.verification.status,
            identity.reputationScore.value,
            identity.createdAt
        );
    }
    
    /**
     * @dev Get identity by DID
     * @param _did Decentralized identifier
     */
    function getIdentityByDID(string memory _did) 
        external 
        view 
        returns (
            address userAddress,
            string memory name,
            string memory bio,
            bool verified,
            uint256 reputationScore
        ) 
    {
        address user = didToAddress[_did];
        require(user != address(0), "DID not found");
        
        Identity memory identity = identities[user];
        return (
            identity.userAddress,
            identity.name,
            identity.bio,
            identity.verified,
            identity.reputationScore.value
        );
    }
    
    /**
     * @dev Get user's ratings
     * @param _user User address
     */
    function getUserRatings(address _user) 
        external 
        view 
        returns (string[] memory) 
    {
        return userRatings[_user];
    }
    
    /**
     * @dev Get rating details
     * @param _ratingId Rating ID
     */
    function getRating(string memory _ratingId) 
        external 
        view 
        returns (
            string memory orderId,
            address fromAddress,
            string memory fromDID,
            address toAddress,
            string memory toDID,
            uint8 score,
            string memory comment,
            RatingType ratingType,
            uint256 createdAt
        ) 
    {
        require(ratingExists[_ratingId], "Rating not found");
        Rating memory rating = ratings[_ratingId];
        return (
            rating.orderId,
            rating.fromAddress,
            rating.fromDID,
            rating.toAddress,
            rating.toDID,
            rating.score,
            rating.comment,
            rating.ratingType,
            rating.createdAt
        );
    }
    
    /**
     * @dev Get ratings for a specific order
     * @param _orderId Order ID
     */
    function getOrderRatings(string memory _orderId) 
        external 
        view 
        returns (string[] memory) 
    {
        return orderRatings[_orderId];
    }
    
    /**
     * @dev Get reputation score with details
     * @param _user User address
     */
    function getReputationScore(address _user) 
        external 
        view 
        returns (
            uint256 score,
            string memory algorithm,
            uint256 confidence
        ) 
    {
        Identity memory identity = identities[_user];
        return (
            identity.reputationScore.value,
            identity.reputationScore.algorithm,
            identity.reputationScore.confidence
        );
    }
    
    /**
     * @dev Calculate aggregated reputation data
     * @param _user User address
     */
    function getReputationBreakdown(address _user) 
        external 
        view 
        returns (
            uint256 totalRatings,
            uint256 averageScore,
            uint256[6] memory scoreDistribution // index 0 unused, 1-5 for scores
        ) 
    {
        string[] memory userRatingIds = userRatings[_user];
        uint256 total = 0;
        uint256[6] memory distribution;
        
        for (uint256 i = 0; i < userRatingIds.length; i++) {
            if (ratingExists[userRatingIds[i]]) {
                uint8 score = ratings[userRatingIds[i]].score;
                total += score;
                distribution[score]++;
            }
        }
        
        uint256 average = userRatingIds.length > 0 ? total / userRatingIds.length : 0;
        
        return (userRatingIds.length, average, distribution);
    }
    
    /**
     * @dev Internal function to update reputation score
     * @param _user User address
     */
    function _updateReputationScore(address _user) internal {
        Identity storage identity = identities[_user];
        string[] memory userRatingIds = userRatings[_user];
        
        if (userRatingIds.length == 0) {
            _setDefaultScore(identity);
            return;
        }
        
        (uint256 totalScore, uint256 validRatings) = _calculateTotalScore(userRatingIds);
        
        if (validRatings == 0) {
            _setDefaultScore(identity);
            return;
        }
        
        uint256 baseScore = _calculateBaseScore(totalScore, validRatings, identity.verified);
        uint256 confidence = _calculateConfidence(validRatings);
        
        uint256 oldScore = identity.reputationScore.value;
        identity.reputationScore.value = baseScore;
        identity.reputationScore.confidence = confidence;
        identity.updatedAt = block.timestamp;
        
        emit ReputationScoreUpdated(_user, identity.did, oldScore, baseScore, block.timestamp);
    }
    
    function _setDefaultScore(Identity storage identity) private {
        identity.reputationScore.value = 50;
        identity.reputationScore.confidence = 50;
    }
    
    function _calculateTotalScore(string[] memory userRatingIds) private view returns (uint256, uint256) {
        uint256 totalScore = 0;
        uint256 validRatings = 0;
        
        for (uint256 i = 0; i < userRatingIds.length; i++) {
            if (ratingExists[userRatingIds[i]]) {
                totalScore += ratings[userRatingIds[i]].score;
                validRatings++;
            }
        }
        
        return (totalScore, validRatings);
    }
    
    function _calculateBaseScore(uint256 totalScore, uint256 validRatings, bool verified) private pure returns (uint256) {
        uint256 averageRating = totalScore / validRatings;
        uint256 baseScore = averageRating * 20;
        
        if (verified) {
            baseScore += 5;
        }
        
        uint256 volumeBonus = validRatings > 50 ? 10 : (validRatings * 10) / 50;
        baseScore += volumeBonus;
        
        if (baseScore > 100) baseScore = 100;
        if (baseScore < 1) baseScore = 1;
        
        return baseScore;
    }
    
    function _calculateConfidence(uint256 validRatings) private pure returns (uint256) {
        uint256 confidence = validRatings > 20 ? 100 : (validRatings * 100) / 20;
        if (confidence > 100) confidence = 100;
        return confidence;
    }
    
    /**
     * @dev Internal function to validate DID format
     * @param _did DID string to validate
     */
    function _isValidDIDFormat(string memory _did) internal pure returns (bool) {
        bytes memory didBytes = bytes(_did);
        
        // Check minimum length (did:ethr:0x + 40 hex chars = 50 chars minimum)
        if (didBytes.length < 50) return false;
        
        // Check prefix "did:ethr:0x"
        if (didBytes[0] != 'd' || didBytes[1] != 'i' || didBytes[2] != 'd' || didBytes[3] != ':') return false;
        if (didBytes[4] != 'e' || didBytes[5] != 't' || didBytes[6] != 'h' || didBytes[7] != 'r' || didBytes[8] != ':') return false;
        if (didBytes[9] != '0' || didBytes[10] != 'x') return false;
        
        // Check if remaining characters are valid hex (40 characters for Ethereum address)
        if (didBytes.length != 50) return false;
        
        for (uint256 i = 11; i < 50; i++) {
            bytes1 char = didBytes[i];
            if (!((char >= '0' && char <= '9') || (char >= 'a' && char <= 'f') || (char >= 'A' && char <= 'F'))) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * @dev Internal function to convert uint to string
     * @param _value Number to convert
     */
    function _toString(uint256 _value) internal pure returns (string memory) {
        if (_value == 0) return "0";
        
        uint256 temp = _value;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        
        bytes memory buffer = new bytes(digits);
        while (_value != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_value % 10)));
            _value /= 10;
        }
        
        return string(buffer);
    }
    
    /**
     * @dev Get total number of identities
     */
    function getTotalIdentities() external view returns (uint256) {
        return identityCounter;
    }
    
    /**
     * @dev Get total number of ratings
     */
    function getTotalRatings() external view returns (uint256) {
        return ratingCounter;
    }
    
    /**
     * @dev Check if identity is registered
     * @param _user User address
     */
    function isIdentityRegistered(address _user) external view returns (bool) {
        return identities[_user].createdAt > 0;
    }
    
    /**
     * @dev Check if DID exists
     * @param _did Decentralized identifier
     */
    function doesDIDExist(string memory _did) external view returns (bool) {
        return didToAddress[_did] != address(0);
    }
}
