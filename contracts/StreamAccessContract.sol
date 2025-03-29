// SPDX-License-Identifier: MIT
pragma solidity ^0.8.17;

/**
 * @title Stream Access Contract
 * @dev Manages access control for crypto streaming content
 */
contract StreamAccessContract {
    // Content struct to store metadata and access information
    struct Content {
        address creator;         // Content creator address
        uint256 price;           // Access price in wei
        bool exists;             // Whether content exists
        bool isPremium;          // Whether content is premium
        uint256 royaltyPercent;  // Creator royalty percentage (out of 100)
        string contentHash;      // IPFS or content identifier hash
    }
    
    // Access struct to track user access
    struct Access {
        bool hasAccess;          // Whether user has access
        uint256 expirationTime;  // When access expires (0 for permanent)
    }
    
    // Content mapping: contentId => Content
    mapping(bytes32 => Content) public contents;
    
    // Access mapping: contentId => user => Access
    mapping(bytes32 => mapping(address => Access)) public userAccess;
    
    // Platform fee percentage (out of 100)
    uint256 public platformFeePercent = 10;
    
    // Platform wallet to receive fees
    address payable public platformWallet;
    
    // Events
    event ContentRegistered(bytes32 indexed contentId, address indexed creator, bool isPremium, uint256 price);
    event AccessGranted(bytes32 indexed contentId, address indexed user, uint256 expirationTime);
    event ContentPriceUpdated(bytes32 indexed contentId, uint256 newPrice);
    event RoyaltyPaid(bytes32 indexed contentId, address indexed creator, uint256 amount);
    event PlatformFeePaid(bytes32 indexed contentId, uint256 amount);

    // Constructor
    constructor(address payable _platformWallet) {
        platformWallet = _platformWallet;
    }
    
    /**
     * @dev Register new streaming content
     * @param contentId Unique content identifier
     * @param price Access price in wei (0 for free)
     * @param isPremium Whether the content is premium
     * @param royaltyPercent Creator royalty percentage for secondary sales
     * @param contentHash IPFS or content identifier hash
     */
    function registerContent(
        bytes32 contentId,
        uint256 price,
        bool isPremium,
        uint256 royaltyPercent,
        string memory contentHash
    ) external {
        require(!contents[contentId].exists, "Content already registered");
        require(royaltyPercent <= 100, "Royalty cannot exceed 100%");
        
        contents[contentId] = Content({
            creator: msg.sender,
            price: price,
            exists: true,
            isPremium: isPremium,
            royaltyPercent: royaltyPercent,
            contentHash: contentHash
        });
        
        // If free content, grant access to creator automatically
        if (price == 0) {
            userAccess[contentId][msg.sender] = Access({
                hasAccess: true,
                expirationTime: 0 // Permanent access
            });
        }
        
        emit ContentRegistered(contentId, msg.sender, isPremium, price);
    }
    
    /**
     * @dev Purchase access to content
     * @param contentId Content identifier to purchase
     * @param duration Access duration in seconds (0 for permanent)
     */
    function purchaseAccess(bytes32 contentId, uint256 duration) external payable {
        Content memory content = contents[contentId];
        require(content.exists, "Content does not exist");
        require(msg.value >= content.price, "Insufficient payment");
        
        // Calculate platform fee and creator payment
        uint256 platformFee = (msg.value * platformFeePercent) / 100;
        uint256 creatorPayment = msg.value - platformFee;
        
        // Pay platform fee
        platformWallet.transfer(platformFee);
        emit PlatformFeePaid(contentId, platformFee);
        
        // Pay creator royalty
        payable(content.creator).transfer(creatorPayment);
        emit RoyaltyPaid(contentId, content.creator, creatorPayment);
        
        // Calculate access expiration
        uint256 expirationTime = duration > 0 ? block.timestamp + duration : 0;
        
        // Grant access
        userAccess[contentId][msg.sender] = Access({
            hasAccess: true,
            expirationTime: expirationTime
        });
        
        emit AccessGranted(contentId, msg.sender, expirationTime);
    }
    
    /**
     * @dev Check if a user has access to content
     * @param contentId Content identifier
     * @param user User address
     * @return Whether user has access
     */
    function hasAccess(bytes32 contentId, address user) public view returns (bool) {
        Access memory access = userAccess[contentId][user];
        
        if (!access.hasAccess) {
            return false;
        }
        
        // If expiration is 0, access is permanent
        if (access.expirationTime == 0) {
            return true;
        }
        
        // Otherwise, check if access has expired
        return block.timestamp <= access.expirationTime;
    }
    
    /**
     * @dev Grant free access to a user (creator only)
     * @param contentId Content identifier
     * @param user User address
     * @param duration Access duration in seconds (0 for permanent)
     */
    function grantAccess(bytes32 contentId, address user, uint256 duration) external {
        Content memory content = contents[contentId];
        require(content.exists, "Content does not exist");
        require(msg.sender == content.creator, "Only creator can grant access");
        
        // Calculate expiration
        uint256 expirationTime = duration > 0 ? block.timestamp + duration : 0;
        
        // Grant access
        userAccess[contentId][user] = Access({
            hasAccess: true,
            expirationTime: expirationTime
        });
        
        emit AccessGranted(contentId, user, expirationTime);
    }
    
    /**
     * @dev Update content price (creator only)
     * @param contentId Content identifier
     * @param newPrice New price in wei
     */
    function updateContentPrice(bytes32 contentId, uint256 newPrice) external {
        Content storage content = contents[contentId];
        require(content.exists, "Content does not exist");
        require(msg.sender == content.creator, "Only creator can update price");
        
        content.price = newPrice;
        emit ContentPriceUpdated(contentId, newPrice);
    }
    
    /**
     * @dev Update platform fee percentage (platform wallet only)
     * @param newFeePercent New fee percentage
     */
    function updatePlatformFee(uint256 newFeePercent) external {
        require(msg.sender == platformWallet, "Only platform wallet can update fee");
        require(newFeePercent <= 30, "Fee cannot exceed 30%");
        platformFeePercent = newFeePercent;
    }
    
    /**
     * @dev Get content details
     * @param contentId Content identifier
     * @return creator Creator address
     * @return price Access price
     * @return isPremium Whether content is premium
     * @return royaltyPercent Creator royalty percentage
     * @return contentHash Content identifier hash
     */
    function getContentDetails(bytes32 contentId) external view returns (
        address creator,
        uint256 price,
        bool isPremium,
        uint256 royaltyPercent,
        string memory contentHash
    ) {
        Content memory content = contents[contentId];
        require(content.exists, "Content does not exist");
        
        return (
            content.creator,
            content.price,
            content.isPremium,
            content.royaltyPercent,
            content.contentHash
        );
    }
}
