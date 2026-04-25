// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract CopyTradeRegistry is Ownable {
    error InvalidLeader();
    error InvalidConfig();
    error SubscriptionMissing();

    struct Subscription {
        bool active;
        uint256 margin;
        uint256 leverage;
        uint256 stopLossBps;
    }

    address public tradingEngine;

    mapping(address => mapping(address => Subscription)) public subscriptions;
    mapping(address => address[]) private leaderFollowers;
    mapping(address => string) public leaderUsername;
    address[] public registeredLeaders;

    event LeaderRegistered(address indexed leader, string username);
    event LeaderFollowed(
        address indexed follower,
        address indexed leader,
        uint256 margin,
        uint256 leverage,
        uint256 stopLossBps
    );
    event LeaderUnfollowed(address indexed follower, address indexed leader);
    event TradingEngineUpdated(address indexed tradingEngine);

    constructor(address tradingEngine_, address initialOwner) Ownable(initialOwner) {
        tradingEngine = tradingEngine_;
    }

    function setTradingEngine(address tradingEngine_) external onlyOwner {
        tradingEngine = tradingEngine_;
        emit TradingEngineUpdated(tradingEngine_);
    }

    function registerLeader(string calldata username) external {
        if (bytes(username).length == 0) revert InvalidConfig();
        if (bytes(leaderUsername[msg.sender]).length == 0) {
            registeredLeaders.push(msg.sender);
        }
        leaderUsername[msg.sender] = username;
        emit LeaderRegistered(msg.sender, username);
    }

    function getRegisteredLeaders() external view returns (address[] memory) {
        return registeredLeaders;
    }

    function followLeader(address leader, uint256 margin, uint256 leverage, uint256 stopLossBps)
        external
    {
        if (leader == address(0) || leader == msg.sender) {
            revert InvalidLeader();
        }
        if (
            margin == 0 || leverage < 1 || leverage > 25 || stopLossBps == 0 || stopLossBps > 10_000
        ) {
            revert InvalidConfig();
        }

        Subscription storage subscription = subscriptions[msg.sender][leader];
        bool isFirstSubscription = !subscription.active;

        subscription.active = true;
        subscription.margin = margin;
        subscription.leverage = leverage;
        subscription.stopLossBps = stopLossBps;

        if (isFirstSubscription) {
            leaderFollowers[leader].push(msg.sender);
        }

        emit LeaderFollowed(msg.sender, leader, margin, leverage, stopLossBps);
    }

    function unfollowLeader(address leader) external {
        Subscription storage subscription = subscriptions[msg.sender][leader];
        if (!subscription.active) {
            revert SubscriptionMissing();
        }

        subscription.active = false;
        emit LeaderUnfollowed(msg.sender, leader);
    }

    function getFollowers(address leader) external view returns (address[] memory) {
        return leaderFollowers[leader];
    }
}
