// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract StreamingToken is ERC20, Ownable {
    uint256 public constant CREDITS_PER_ETH = 100;
    mapping(address => mapping(string => uint256)) public streamExpiry;

    constructor() ERC20("Streaming Credits", "STRM") {}

    function purchaseCredits() public payable {
        uint256 credits = msg.value * CREDITS_PER_ETH;
        _mint(msg.sender, credits);
    }

    function startStream(string memory contentId) public {
        require(balanceOf(msg.sender) >= 1, "Insufficient credits");
        _burn(msg.sender, 1);
        streamExpiry[msg.sender][contentId] = block.timestamp + 1 hours;
    }

    function canStream(address user, string memory contentId) public view returns (bool) {
        return streamExpiry[user][contentId] > block.timestamp;
    }
}
