// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title ProductRegistry
 * @dev Smart contract for managing decentralized product listings
 * Stores product metadata on IPFS and emits events for indexing services
 */
contract ProductRegistry is Ownable, ReentrancyGuard {
    
    struct Product {
        address seller;
        string ipfsHash;
        uint256 price;
        string category;
        bool isActive;
        uint256 createdAt;
        uint256 updatedAt;
    }
    
    // State variables
    uint256 public productCounter;
    mapping(uint256 => Product) public products;
    mapping(address => uint256[]) public sellerProducts;
    mapping(string => uint256[]) public categoryProducts;
    
    // Events
    event ProductListed(
        uint256 indexed productId,
        address indexed seller,
        string ipfsHash,
        uint256 price,
        string category,
        uint256 timestamp
    );
    
    event ProductUpdated(
        uint256 indexed productId,
        address indexed seller,
        string ipfsHash,
        uint256 price,
        uint256 timestamp
    );
    
    event ProductDeactivated(
        uint256 indexed productId,
        address indexed seller,
        uint256 timestamp
    );
    
    event ProductReactivated(
        uint256 indexed productId,
        address indexed seller,
        uint256 timestamp
    );
    
    // Modifiers
    modifier onlySeller(uint256 _productId) {
        require(products[_productId].seller == msg.sender, "Only seller can modify this product");
        _;
    }
    
    modifier validProduct(uint256 _productId) {
        require(_productId > 0 && _productId <= productCounter, "Product does not exist");
        _;
    }
    
    constructor() Ownable(msg.sender) {
        productCounter = 0;
    }
    
    /**
     * @dev List a new product
     * @param _ipfsHash IPFS hash containing product metadata
     * @param _price Product price in wei
     * @param _category Product category
     */
    function listProduct(
        string memory _ipfsHash,
        uint256 _price,
        string memory _category
    ) external nonReentrant returns (uint256) {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        require(bytes(_category).length > 0, "Category cannot be empty");
        
        productCounter++;
        
        Product memory newProduct = Product({
            seller: msg.sender,
            ipfsHash: _ipfsHash,
            price: _price,
            category: _category,
            isActive: true,
            createdAt: block.timestamp,
            updatedAt: block.timestamp
        });
        
        products[productCounter] = newProduct;
        sellerProducts[msg.sender].push(productCounter);
        categoryProducts[_category].push(productCounter);
        
        emit ProductListed(
            productCounter,
            msg.sender,
            _ipfsHash,
            _price,
            _category,
            block.timestamp
        );
        
        return productCounter;
    }
    
    /**
     * @dev Update an existing product
     * @param _productId Product ID to update
     * @param _ipfsHash New IPFS hash
     * @param _price New price
     */
    function updateProduct(
        uint256 _productId,
        string memory _ipfsHash,
        uint256 _price
    ) external validProduct(_productId) onlySeller(_productId) nonReentrant {
        require(bytes(_ipfsHash).length > 0, "IPFS hash cannot be empty");
        require(_price > 0, "Price must be greater than 0");
        require(products[_productId].isActive, "Product is not active");
        
        products[_productId].ipfsHash = _ipfsHash;
        products[_productId].price = _price;
        products[_productId].updatedAt = block.timestamp;
        
        emit ProductUpdated(
            _productId,
            msg.sender,
            _ipfsHash,
            _price,
            block.timestamp
        );
    }
    
    /**
     * @dev Deactivate a product
     * @param _productId Product ID to deactivate
     */
    function deactivateProduct(uint256 _productId) 
        external 
        validProduct(_productId) 
        onlySeller(_productId) 
    {
        require(products[_productId].isActive, "Product is already inactive");
        
        products[_productId].isActive = false;
        products[_productId].updatedAt = block.timestamp;
        
        emit ProductDeactivated(_productId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Reactivate a product
     * @param _productId Product ID to reactivate
     */
    function reactivateProduct(uint256 _productId) 
        external 
        validProduct(_productId) 
        onlySeller(_productId) 
    {
        require(!products[_productId].isActive, "Product is already active");
        
        products[_productId].isActive = true;
        products[_productId].updatedAt = block.timestamp;
        
        emit ProductReactivated(_productId, msg.sender, block.timestamp);
    }
    
    /**
     * @dev Get product details
     * @param _productId Product ID
     */
    function getProduct(uint256 _productId) 
        external 
        view 
        validProduct(_productId) 
        returns (
            address seller,
            string memory ipfsHash,
            uint256 price,
            string memory category,
            bool isActive,
            uint256 createdAt,
            uint256 updatedAt
        ) 
    {
        Product memory product = products[_productId];
        return (
            product.seller,
            product.ipfsHash,
            product.price,
            product.category,
            product.isActive,
            product.createdAt,
            product.updatedAt
        );
    }
    
    /**
     * @dev Get all products by a seller
     * @param _seller Seller address
     */
    function getSellerProducts(address _seller) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return sellerProducts[_seller];
    }
    
    /**
     * @dev Get all products in a category
     * @param _category Category name
     */
    function getCategoryProducts(string memory _category) 
        external 
        view 
        returns (uint256[] memory) 
    {
        return categoryProducts[_category];
    }
    
    /**
     * @dev Get total number of products
     */
    function getTotalProducts() external view returns (uint256) {
        return productCounter;
    }
}
