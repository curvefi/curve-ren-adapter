# Curve Exchange Adapter for Curve Ren and Curve sBTC pools

## Specification for [CurveExchangeAdapter](https://github.com/pengiundev/CurveExchangeAdapter/blob/master/truffle/contracts/CurveExchangeAdapterSBTC.sol)

### Description

Curve Ren Adapter for swapping/depositing/withdrawing in a Curve pool with native BTC going through renVM and getting renBTC minted

First coin in `IERC20[N_COINS] coins` array will always be renBTC

OpenGSN/Biconomy gasless transactions are planned to be integrated so `msg.sender` will be changed to the respective `_msgSender()` function

### recoverStuck

`
recoverStuck(
    bytes calldata encoded,
    uint256 _amount,
    bytes32 _nHash,
    bytes calldata _sig
)
`

Failsafe function in a case that UI submits a pHash for different types/values than the mintThenSwap/mintThenBurn functions use
user who initiated the swap/deposit function can get back renBTC if they provide what was submitted through UI

#### mintThenSwap

`mintThenSwap(
    uint256 _minExchangeRate,
    uint256 _newMinExchangeRate,
    uint256 _slippage,
    int128 _j,
    address payable _coinDestination,
    uint256 _amount,
    bytes32 _nHash,
    bytes calldata _sig
)
`

Swapping from BTC->renBTC->ERC20 BTC

mintThenSwap method should mint renBTC to the adapter contract only if the provided 
`_minExchangeRate`, `_slippage`, `_j`, `_coinDestination` and `msg.sender` match what is submmitted through UI.

Only the address from which the swap was initiated can call the method.

Users lock in a minimum exchange rate and slippage which they want to have when doing the swap.
The original message sender can choose to call the function with a new exchange rate or to get renBTC instead.
If the exchange rate at time of confirmation is **not** what the user specified - they should receive renBTC instead.

Function should fail if called from an address different than the one submitted to renVM.

#### mintThenDeposit

`
mintThenDeposit(
    address payable _wbtcDestination, 
    uint256 _amount, 
    uint256[N_COINS] calldata _amounts, 
    uint256 _min_mint_amount, 
    uint256 _new_min_mint_amount, 
    bytes32 _nHash, 
    bytes calldata _sig
)
`


Mint BTC->renBTC then deposit into a Curve pool

mintThenDeposit method should mint renBTC to the adapter contract only if the provided 
`_wbtcDestination`, `_amounts`, `_min_mint_amount` and `msg.sender` match what is submmitted through UI.

Only the address from which the deposit was initiated can call the method.

Users lock in a minimum Curve LP token mint amount which they want to have when doing the swap.
The original message sender can choose to call the function with a new Curve LP token mint amount or to get renBTC instead.
If the minimum Curve LP tokens mint amount at time of confirmation is **not** what the user specified - they should receive renBTC instead.

Function should use the actual deposited amount to the Bitcoin address.
Function should fail if called from an address different than the one submitted to renVM.

#### swapThenBurn

`swapThenBurn(
	bytes calldata _btcDestination, 
	uint256 _amount, 
	uint256 _minRenbtcAmount, 
	uint8 _i
	)
`

Burns amount received from exchanging coin i to renBTC and sends BTC to `_btcDestination`

#### removeLiquidityThenBurn

`
removeLiquidityThenBurn(
	bytes calldata _btcDestination,
	address _coinDestination,
	uint256 amount,
	uint256[N_COINS] calldata min_amounts
)
`

Removes a proportional amount of liquidity from Curve pool, transfers other ERC20 BTCs to `_coinDestination`
and burns removed renBTC liquidity to `_btcDestination`

#### removeLiquidityImbalanceThenBurn

`
removeLiquidityImbalanceThenBurn(
	bytes calldata _btcDestination,
	address _coinDestination,
	uint256[N_COINS] calldata amounts,
	uint256 max_burn_amount
)
`

Removes specified amounts of liquidity from Curve pool, transfers other ERC20 BTCs to `_coinDestination`
and burns removed renBTC liquidity to `_btcDestination`

#### removeLiquidityOneCoinThenBurn

`
removeLiquidityOneCoinThenBurn(
	bytes calldata _btcDestination,
	uint256 _token_amounts,
	uint256 min_amount,
	uint8 _i
)
`

Removes liquidity in renBTC from Curve pool, transfers other ERC20 BTCs to `_coinDestination`
and burns removed renBTC liquidity to `_btcDestination`