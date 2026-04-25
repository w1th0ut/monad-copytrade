// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {VUSD} from "./VUSD.sol";
import {IVaultReceiptSync} from "./interfaces/IVaultReceiptSync.sol";

contract Vault is Ownable, IVaultReceiptSync {
    using SafeERC20 for IERC20;

    error ZeroAmount();
    error UnauthorizedCaller();
    error NoYieldAvailable();

    IERC20 public immutable usdc;
    VUSD public immutable receiptToken;

    address public tradingEngine;
    address public treasury;

    uint256 public totalManualLiquidity;
    uint256 public totalLockedLossLiquidity;
    uint256 public accumulatedYield;
    uint256 public undistributedYield;
    uint256 public accYieldPerShare;

    mapping(address => uint256) public pendingRewards;
    mapping(address => uint256) public rewardDebt;

    event LiquidityDeposited(address indexed provider, uint256 amount);
    event TradingEngineUpdated(address indexed tradingEngine);
    event TreasuryUpdated(address indexed treasury);
    event LossVaulted(address indexed user, uint256 amount, uint256 receiptMinted);
    event YieldClaimed(address indexed user, uint256 amount);
    event FeeIncomeDeposited(uint256 amount);
    event ProfitCovered(address indexed tradingEngine, uint256 amount);

    constructor(address usdc_, address receiptToken_, address initialOwner) Ownable(initialOwner) {
        usdc = IERC20(usdc_);
        receiptToken = VUSD(receiptToken_);
        treasury = initialOwner;
    }

    modifier onlyTradingEngine() {
        if (msg.sender != tradingEngine) {
            revert UnauthorizedCaller();
        }
        _;
    }

    modifier onlyReceiptToken() {
        if (msg.sender != address(receiptToken)) {
            revert UnauthorizedCaller();
        }
        _;
    }

    function setTradingEngine(address tradingEngine_) external onlyOwner {
        tradingEngine = tradingEngine_;
        emit TradingEngineUpdated(tradingEngine_);
    }

    function setTreasury(address treasury_) external onlyOwner {
        treasury = treasury_;
        emit TreasuryUpdated(treasury_);
    }

    function depositLiquidity(uint256 amount) external {
        if (amount == 0) {
            revert ZeroAmount();
        }

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalManualLiquidity += amount;

        emit LiquidityDeposited(msg.sender, amount);
    }

    function lockLossToLP(address user, uint256 amount) external onlyTradingEngine {
        if (amount == 0) {
            revert ZeroAmount();
        }

        _syncAccount(user);
        usdc.safeTransferFrom(msg.sender, address(this), amount);
        totalLockedLossLiquidity += amount;
        receiptToken.mint(user, amount);
        _refreshDebt(user);
        _maybeDistributeUndistributedYield();

        emit LossVaulted(user, amount, amount);
    }

    function notifyFeeIncome(uint256 amount) external onlyTradingEngine {
        if (amount == 0) {
            revert ZeroAmount();
        }

        usdc.safeTransferFrom(msg.sender, address(this), amount);
        accumulatedYield += amount;

        if (receiptToken.totalSupply() == 0) {
            undistributedYield += amount;
        } else {
            accYieldPerShare += (amount * 1e18) / receiptToken.totalSupply();
        }

        emit FeeIncomeDeposited(amount);
    }

    function coverProfit(uint256 amount) external onlyTradingEngine {
        if (amount == 0) {
            revert ZeroAmount();
        }

        usdc.safeTransfer(msg.sender, amount);
        emit ProfitCovered(msg.sender, amount);
    }

    function previewClaimableYield(address user) public view returns (uint256) {
        return pendingRewards[user] + _earnedSinceLastSync(user);
    }

    function claimYield() external returns (uint256 reward) {
        _syncAccount(msg.sender);
        reward = pendingRewards[msg.sender];

        if (reward == 0) {
            revert NoYieldAvailable();
        }

        pendingRewards[msg.sender] = 0;
        _refreshDebt(msg.sender);
        accumulatedYield -= reward;
        usdc.safeTransfer(msg.sender, reward);

        emit YieldClaimed(msg.sender, reward);
    }

    function beforeReceiptTransfer(address from, address to) external onlyReceiptToken {
        _syncAccount(from);
        _syncAccount(to);
    }

    function afterReceiptTransfer(address from, address to) external onlyReceiptToken {
        _refreshDebt(from);
        _refreshDebt(to);
        _maybeDistributeUndistributedYield();
    }

    function _syncAccount(address account) internal {
        if (account == address(0)) {
            return;
        }

        pendingRewards[account] += _earnedSinceLastSync(account);
        rewardDebt[account] = (receiptToken.balanceOf(account) * accYieldPerShare) / 1e18;
    }

    function _refreshDebt(address account) internal {
        if (account == address(0)) {
            return;
        }

        rewardDebt[account] = (receiptToken.balanceOf(account) * accYieldPerShare) / 1e18;
    }

    function _earnedSinceLastSync(address account) internal view returns (uint256) {
        if (account == address(0)) {
            return 0;
        }

        uint256 accrued = (receiptToken.balanceOf(account) * accYieldPerShare) / 1e18;
        uint256 debt = rewardDebt[account];

        return accrued > debt ? accrued - debt : 0;
    }

    function _maybeDistributeUndistributedYield() internal {
        uint256 supply = receiptToken.totalSupply();
        if (undistributedYield == 0 || supply == 0) {
            return;
        }

        accYieldPerShare += (undistributedYield * 1e18) / supply;
        undistributedYield = 0;
    }
}
