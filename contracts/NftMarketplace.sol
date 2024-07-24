//SPDX-Lisence-Idetifier: MIT

pragma solidity ^0.8.20;
import "@openzeppelin/contracts/token/ERC721/IERC721.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

error NftMarketplace__PriceMustBeAboveZero();
error NftMarketplace__NotApprovedForMarketplace();
error NftMarketplace__AlreadyListed(address nftAddress, uint256 tokenId);
error NftMarketplace__NotOwner();
error NftMarketplace__NotListed(address nftAddress, uint256 tokenId);
error NftMarketplace__PriceNotMet(address nftAddress, uint256 tokenId, uint256 listedPrice);
error NftMarketplace__NoProceeds();
error NftMarketplace__TransferFailed();
contract NftMarketplace is ReentrancyGuard {
    /////////////////////
    ///////Events///////
    ///////////////////

    event ItemListed(
        address indexed seller,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemBought(
        address indexed buyer,
        address indexed nftAddress,
        uint256 indexed tokenId,
        uint256 price
    );
    event ItemCanceled(address indexed seller, address indexed nftAddress, uint256 indexed tokenId);

    ////////////////////
    ///////Structs//////
    ////////////////////

    struct Listing {
        uint256 price;
        address seller;
    }

    //////////////////////
    ///////Variables/////
    //////////////////////

    // NFT Contracts address => Token Id => Listing

    mapping(address => mapping(uint256 => Listing)) private s_listings;
    //mapping Seller => Amount how much they earned
    mapping(address => uint256) private s_proceeds;

    //////////////////////
    ////Main Functions////
    //////////////////////

    /***
     * List an item for sale on the marketplace
     * @notice Method for listing your NFT on the marketplace
     * @param nftAddress : The address of the NFT contract
     * @param tokenId : The token id of the NFT
     * @param price : The price of the NFT
     * @param seller : The seller of the NFT
     * @dev Technicaly the seller is the owner of the NFT
     * @return
     */

    function listItem(
        address nftAddress,
        uint256 tokenId,
        uint256 price
    ) external notListed(nftAddress, tokenId, msg.sender) isOwner(nftAddress, tokenId, msg.sender) {
        if (price <= 0) {
            revert NftMarketplace__PriceMustBeAboveZero();
        }

        //if the nft is not approved for marketplace then revert error message

        IERC721 nft = IERC721(nftAddress);
        if (nft.getApproved(tokenId) != address(this)) {
            revert NftMarketplace__NotApprovedForMarketplace();
        }

        // think mapping is a better way to do this
        s_listings[nftAddress][tokenId] = Listing(price, msg.sender);
        emit ItemListed(msg.sender, nftAddress, tokenId, price);
    }

    function buyItem(
        address nftAddress,
        uint256 tokenId
    ) external payable isListed(nftAddress, tokenId) nonReentrant {
        Listing memory listedItem = s_listings[nftAddress][tokenId];
        if (msg.value < listedItem.price) {
            revert NftMarketplace__PriceNotMet(nftAddress, tokenId, listedItem.price);
        }
        s_proceeds[listedItem.seller] += msg.value;
        delete (s_listings[nftAddress][tokenId]);
        IERC721(nftAddress).safeTransferFrom(listedItem.seller, msg.sender, tokenId); // Corrected this line
        emit ItemBought(msg.sender, nftAddress, tokenId, listedItem.price);
    }

    function cancelItem(
        address nftAddress,
        uint256 tokenId
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        delete (s_listings[nftAddress][tokenId]);
        emit ItemCanceled(msg.sender, nftAddress, tokenId);
    }

    function updateListing(
        address nftAddress,
        uint256 tokenId,
        uint256 newPrice
    ) external isOwner(nftAddress, tokenId, msg.sender) isListed(nftAddress, tokenId) {
        s_listings[nftAddress][tokenId].price = newPrice;
        emit ItemListed(msg.sender, nftAddress, tokenId, newPrice);
    }

    function withdrawProceeds() external nonReentrant {
        uint256 proceeds = s_proceeds[msg.sender];
        if (proceeds <= 0) {
            revert NftMarketplace__NoProceeds();
        }
        (bool success, ) = payable(msg.sender).call{value: proceeds}("");
        if (!success) {
            revert NftMarketplace__TransferFailed();
        }
    }

    ///////////////////////
    ///////Getters/////////
    ///////////////////////

    function getProceeds(address seller) external view returns (uint256) {
        return s_proceeds[seller];
    }

    function getListing(
        address nftAddress,
        uint256 tokenId
    ) external view returns (Listing memory) {
        return s_listings[nftAddress][tokenId];
    }

    //////////////////////
    ////Modifiers////////
    ////////////////////

    modifier isOwner(
        address nftaddress,
        uint256 tokenId,
        address spender
    ) {
        IERC721 nft = IERC721(nftaddress);
        address owner = nft.ownerOf(tokenId);

        if (owner != spender) {
            revert NftMarketplace__NotOwner();
        }
        _;
    }
    modifier notListed(
        address nftAddress,
        uint256 tokenId,
        address owner
    ) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price > 0) {
            revert NftMarketplace__AlreadyListed(nftAddress, tokenId);
        }
        _;
    }
    modifier isListed(address nftAddress, uint256 tokenId) {
        Listing memory listing = s_listings[nftAddress][tokenId];
        if (listing.price <= 0) {
            revert NftMarketplace__NotListed(nftAddress, tokenId);
        }
        _;
    }
}
