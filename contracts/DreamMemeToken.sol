// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract DreamMemeToken is ERC20, Ownable {
    constructor(uint256 initialSupply) ERC20("Dream Meme Token", "DMT") Ownable(msg.sender) {
        _mint(msg.sender, initialSupply);
    }
}
