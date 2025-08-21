// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title Vault
 * @dev Holds ERC20 tokens, controlled by owner (the deployer by default).
 *      You can later transfer ownership to another DAO/contract if needed.
 */
contract Vault is Ownable {
    constructor() Ownable(msg.sender) {}

    function deposit(address token, uint256 amount) external {
        require(IERC20(token).transferFrom(msg.sender, address(this), amount), "Deposit failed");
    }

    function withdraw(address token, uint256 amount, address to) external onlyOwner {
        require(IERC20(token).transfer(to, amount), "Withdraw failed");
    }

    function balanceOf(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}