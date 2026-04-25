// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Vault} from "./Vault.sol";

interface ICopyTradeRegistry {
    function subscriptions(address follower, address leader)
        external
        view
        returns (bool active, uint256 margin, uint256 leverage, uint256 stopLossBps);
}

contract TradingEngine is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    error InvalidAmount();
    error InvalidLeverage();
    error InvalidPosition();
    error InvalidExitPrice();
    error UnauthorizedKeeper();
    error InsufficientIdleBalance();
    error CopyTradeRegistryNotSet();
    error SubscriptionInactive();

    struct Position {
        address trader;
        address leader;
        bytes32 pairId;
        bool isLong;
        bool isOpen;
        uint256 margin;
        uint256 leverage;
        uint256 size;
        uint256 entryPrice;
        uint256 stopLossPrice;
    }

    IERC20 public immutable usdc;
    Vault public immutable vault;

    address public keeper;
    address public treasury;
    address public copyTradeRegistry;

    uint256 public nextPositionId = 1;
    uint16 public tradingFeeBps = 10;

    mapping(address => uint256) public idleBalance;
    mapping(uint256 => Position) public positions;

    event Deposited(address indexed user, uint256 amount);
    event Withdrawn(address indexed user, uint256 amount);
    event PositionOpened(
        uint256 indexed positionId,
        address indexed trader,
        address indexed leader,
        uint256 margin,
        uint256 leverage
    );
    event PositionClosed(uint256 indexed positionId, int256 pnl, uint256 fee, uint256 exitPrice);
    event StopLossExecuted(uint256 indexed positionId, uint256 exitPrice, uint256 lossMovedToVault);
    event KeeperUpdated(address indexed keeper);
    event CopyTradeRegistryUpdated(address indexed copyTradeRegistry);

    constructor(
        address usdc_,
        address vault_,
        address keeper_,
        address treasury_,
        address initialOwner
    ) Ownable(initialOwner) {
        usdc = IERC20(usdc_);
        vault = Vault(vault_);
        keeper = keeper_;
        treasury = treasury_;

        usdc.approve(vault_, type(uint256).max);
    }

    function setKeeper(address keeper_) external onlyOwner {
        keeper = keeper_;
        emit KeeperUpdated(keeper_);
    }

    function setCopyTradeRegistry(address copyTradeRegistry_) external onlyOwner {
        copyTradeRegistry = copyTradeRegistry_;
        emit CopyTradeRegistryUpdated(copyTradeRegistry_);
    }

    function deposit(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        idleBalance[msg.sender] += amount;

        emit Deposited(msg.sender, amount);
    }

    function withdraw(uint256 amount) external nonReentrant {
        if (amount == 0) {
            revert InvalidAmount();
        }
        if (idleBalance[msg.sender] < amount) {
            revert InsufficientIdleBalance();
        }

        idleBalance[msg.sender] -= amount;
        usdc.safeTransfer(msg.sender, amount);

        emit Withdrawn(msg.sender, amount);
    }

    function openPosition(
        address leader,
        bytes32 pairId,
        bool isLong,
        uint256 margin,
        uint256 leverage,
        uint256 entryPrice,
        uint256 stopLossPrice
    ) external nonReentrant returns (uint256 positionId) {
        positionId = _openPositionFor(
            msg.sender, leader, pairId, isLong, margin, leverage, entryPrice, stopLossPrice
        );
    }

    function mirrorTradeFor(
        address follower,
        address leader,
        bytes32 pairId,
        bool isLong,
        uint256 entryPrice
    ) external nonReentrant returns (uint256 positionId) {
        if (msg.sender != keeper) {
            revert UnauthorizedKeeper();
        }
        if (copyTradeRegistry == address(0)) {
            revert CopyTradeRegistryNotSet();
        }

        (bool active, uint256 margin, uint256 leverage, uint256 stopLossBps) =
            ICopyTradeRegistry(copyTradeRegistry).subscriptions(follower, leader);
        if (!active) {
            revert SubscriptionInactive();
        }

        uint256 stopLossPrice = _deriveStopLossPrice(entryPrice, isLong, leverage, stopLossBps);
        positionId = _openPositionFor(
            follower, leader, pairId, isLong, margin, leverage, entryPrice, stopLossPrice
        );
    }

    function closePosition(uint256 positionId, uint256 exitPrice) external nonReentrant {
        Position memory position = positions[positionId];
        if (!position.isOpen) {
            revert InvalidPosition();
        }
        if (msg.sender != position.trader && msg.sender != keeper && msg.sender != owner()) {
            revert InvalidPosition();
        }

        _settlePosition(positionId, exitPrice, false);
    }

    function executeStopLoss(uint256 positionId, uint256 exitPrice) external nonReentrant {
        if (msg.sender != keeper) {
            revert UnauthorizedKeeper();
        }

        _settlePosition(positionId, exitPrice, true);
    }

    function _settlePosition(uint256 positionId, uint256 exitPrice, bool stopLossMode) internal {
        Position storage position = positions[positionId];
        if (!position.isOpen) {
            revert InvalidPosition();
        }
        if (exitPrice == 0) {
            revert InvalidExitPrice();
        }

        position.isOpen = false;

        uint256 absoluteChange = position.entryPrice > exitPrice
            ? position.entryPrice - exitPrice
            : exitPrice - position.entryPrice;
        uint256 rawPnl = (position.size * absoluteChange) / position.entryPrice;
        bool profitable =
            position.isLong ? exitPrice > position.entryPrice : exitPrice < position.entryPrice;
        uint256 fee = (position.size * tradingFeeBps) / 10_000;
        uint256 lossMovedToVault;
        int256 signedPnl;

        if (profitable) {
            vault.coverProfit(rawPnl);
            signedPnl = int256(rawPnl);
            idleBalance[position.trader] += position.margin + rawPnl;
        } else {
            uint256 realizedLoss = Math.min(rawPnl, position.margin);
            uint256 cappedFee = Math.min(fee, position.margin - realizedLoss);
            uint256 survivor = position.margin - realizedLoss - cappedFee;

            fee = cappedFee;
            lossMovedToVault = realizedLoss;
            signedPnl = -int256(realizedLoss);
            idleBalance[position.trader] += survivor;

            if (realizedLoss > 0) {
                vault.lockLossToLP(position.trader, realizedLoss);
            }
        }

        if (profitable) {
            _distributeFee(fee, position.leader);
            idleBalance[position.trader] -= fee;
        } else if (fee > 0) {
            _distributeFee(fee, position.leader);
        }

        emit PositionClosed(positionId, signedPnl, fee, exitPrice);

        if (stopLossMode) {
            emit StopLossExecuted(positionId, exitPrice, lossMovedToVault);
        }
    }

    function _openPositionFor(
        address trader,
        address leader,
        bytes32 pairId,
        bool isLong,
        uint256 margin,
        uint256 leverage,
        uint256 entryPrice,
        uint256 stopLossPrice
    ) internal returns (uint256 positionId) {
        if (margin == 0 || entryPrice == 0 || stopLossPrice == 0) {
            revert InvalidAmount();
        }
        if (leverage < 1 || leverage > 25) {
            revert InvalidLeverage();
        }
        if (idleBalance[trader] < margin) {
            revert InsufficientIdleBalance();
        }

        idleBalance[trader] -= margin;

        positionId = nextPositionId++;
        positions[positionId] = Position({
            trader: trader,
            leader: leader,
            pairId: pairId,
            isLong: isLong,
            isOpen: true,
            margin: margin,
            leverage: leverage,
            size: margin * leverage,
            entryPrice: entryPrice,
            stopLossPrice: stopLossPrice
        });

        emit PositionOpened(positionId, trader, leader, margin, leverage);
    }

    function _deriveStopLossPrice(
        uint256 entryPrice,
        bool isLong,
        uint256 leverage,
        uint256 stopLossBps
    ) internal pure returns (uint256) {
        if (entryPrice == 0 || leverage == 0 || stopLossBps == 0 || stopLossBps > 10_000) {
            revert InvalidAmount();
        }

        uint256 priceMove = (entryPrice * stopLossBps) / (leverage * 10_000);
        if (priceMove == 0) {
            revert InvalidAmount();
        }

        if (isLong) {
            if (priceMove >= entryPrice) {
                revert InvalidExitPrice();
            }
            return entryPrice - priceMove;
        }

        return entryPrice + priceMove;
    }

    function _distributeFee(uint256 fee, address leader) internal {
        if (fee == 0) {
            return;
        }

        uint256 vaultShare = (fee * 7000) / 10_000;
        uint256 leaderShare = leader == address(0) ? 0 : (fee * 2000) / 10_000;
        uint256 treasuryShare = fee - vaultShare - leaderShare;

        if (vaultShare > 0) {
            vault.notifyFeeIncome(vaultShare);
        }
        if (leaderShare > 0) {
            idleBalance[leader] += leaderShare;
        }
        if (treasuryShare > 0) {
            idleBalance[treasury] += treasuryShare;
        }
    }
}
