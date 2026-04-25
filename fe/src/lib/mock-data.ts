export const marketSnapshot = {
  symbol: "ETH / USDC Perp",
  venue: "Monad Testnet",
  markPrice: "$3,184.70",
  indexPrice: "$3,183.91",
  change24h: "+2.48%",
  volume24h: "$18.2M",
  openInterest: "$44.8M",
  fundingRate: "+0.012%",
  nextFunding: "02:17:32",
  vaultApr: "18.4%",
  vaultTvl: "$2.84M",
};

export const leaders = [
  {
    name: "Delta K",
    style: "Breakout / ETH",
    pnl: "+$48.2k",
    winRate: "71%",
    followers: 182,
    risk: "Balanced",
  },
  {
    name: "Mono S",
    style: "Scalp / BTC",
    pnl: "+$32.7k",
    winRate: "68%",
    followers: 134,
    risk: "Fast",
  },
  {
    name: "Rhea",
    style: "Swing / SOL",
    pnl: "+$19.4k",
    winRate: "73%",
    followers: 96,
    risk: "Low drift",
  },
  {
    name: "Atlas",
    style: "Mean reversion",
    pnl: "+$15.1k",
    winRate: "64%",
    followers: 88,
    risk: "Tight SL",
  },
];

export const positions = [
  {
    pair: "ETH / USDC",
    side: "Long",
    entry: "$3,176.40",
    size: "$2,500",
    pnl: "+$74.18",
    stopLoss: "-$125.00",
  },
  {
    pair: "BTC / USDC",
    side: "Short",
    entry: "$66,240.00",
    size: "$1,800",
    pnl: "-$19.06",
    stopLoss: "-$90.00",
  },
];

export const vaultFlow = [
  {
    event: "Loss vaulted",
    wallet: "0x84c...19c4",
    amount: "$184.00",
    receipt: "184.00 vUSD",
  },
  {
    event: "Yield claimed",
    wallet: "0x41d...77aa",
    amount: "$42.83",
    receipt: "USDC paid",
  },
  {
    event: "Treasury fee",
    wallet: "Protocol",
    amount: "$5.10",
    receipt: "Keeper gas",
  },
];

export const activityFeed = [
  "Leader Delta K opened ETH long with 12x leverage.",
  "Keeper mirrored 38 follower positions in 210 ms.",
  "Stop loss on SOL closed and minted 61.2 vUSD receipts.",
  "Vault yield stream updated from last 0.1% close fee batch.",
];

export const feeBreakdown = [
  { label: "vUSD yield share", value: "70%" },
  { label: "Leader incentive", value: "20%" },
  { label: "Protocol treasury", value: "10%" },
];
