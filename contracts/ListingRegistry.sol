// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ListingRegistry
 * @dev Manages product listings on-chain with IPFS metadata references
 */
contract ListingRegistry is Ownable, ReentrancyGuard {
    
    struct Listing {
        string listingId;
        address seller;
        string name;
        uint256 price;
        string currency;
        uint256 stock;
        string ipfsCID;
        bool active;
        uint256 createdAt;
    }
    
    // Mapping from listingId to Listing
    mapping(string => Listing) public listings;
    
    // Array to track all listing IDs
    string[] public listingIds;
    
    // Mapping from seller address to their listing IDs
    mapping(address => string[]) public sellerListings;
    
    // Events
    event ListingCreated(
        string indexed listingId,
        address indexed seller,
        string name,
        uint256 price,
        string currency,
        uint256 stock
    );
    
    event ListingUpdated(
        string indexed listingId,
        uint256 price,
        uint256 stock,
        bool active
    );
    
    event StockDecremented(
        string indexed listingId,
        uint256 quantity,
        uint256 remainingStock
    );
    
    constructor() Ownable(msg.sender) {}
    
    /**
     * @dev Create a new listing
     */
    function createListing(
        string memory _listingId,
        string memory _name,
        uint256 _price,
        string memory _currency,
        uint256 _stock,
        string memory _ipfsCID
    ) external nonReentrant {
        require(bytes(_listingId).length > 0, "Invalid listing ID");
        require(bytes(listings[_listingId].listingId).length == 0, "Listing already exists");
        require(_price > 0, "Price must be greater than 0");
        require(_stock > 0, "Stock must be greater than 0");
        
        Listing memory newListing = Listing({
            listingId: _listingId,
            seller: msg.sender,
            name: _name,
            price: _price,
            currency: _currency,
            stock: _stock,
            ipfsCID: _ipfsCID,
            active: true,
            createdAt: block.timestamp
        });
        
        listings[_listingId] = newListing;
        listingIds.push(_listingId);
        sellerListings[msg.sender].push(_listingId);
        
        emit ListingCreated(_listingId, msg.sender, _name, _price, _currency, _stock);
    }
    
    /**
     * @dev Update listing details
     */
    function updateListing(
        string memory _listingId,
        uint256 _price,
        uint256 _stock,
        bool _active
    ) external {
        Listing storage listing = listings[_listingId];
        require(bytes(listing.listingId).length > 0, "Listing does not exist");
        require(listing.seller == msg.sender, "Not the seller");
        
        listing.price = _price;
        listing.stock = _stock;
        listing.active = _active;
        
        emit ListingUpdated(_listingId, _price, _stock, _active);
    }
    
    /**
     * @dev Decrement stock (called when order is created)
     */
    function decrementStock(string memory _listingId, uint256 _quantity) external returns (bool) {
        Listing storage listing = listings[_listingId];
        require(bytes(listing.listingId).length > 0, "Listing does not exist");
        require(listing.active, "Listing is not active");
        require(listing.stock >= _quantity, "Insufficient stock");
        
        listing.stock -= _quantity;
        
        emit StockDecremented(_listingId, _quantity, listing.stock);
        return true;
    }
    
    /**
     * @dev Get listing details
     */
    function getListing(string memory _listingId) external view returns (Listing memory) {
        require(bytes(listings[_listingId].listingId).length > 0, "Listing does not exist");
        return listings[_listingId];
    }
    
    /**
     * @dev Get all listings count
     */
    function getListingsCount() external view returns (uint256) {
        return listingIds.length;
    }
    
    /**
     * @dev Get seller's listings
     */
    function getSellerListings(address _seller) external view returns (string[] memory) {
        return sellerListings[_seller];
    }
    
    /**
     * @dev Check if listing has sufficient stock
     */
    function hasStock(string memory _listingId, uint256 _quantity) external view returns (bool) {
        Listing memory listing = listings[_listingId];
        return listing.active && listing.stock >= _quantity;
    }
}

