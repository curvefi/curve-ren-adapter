## Specification for [CurveExchangeAdapter](https://github.com/pengiundev/CurveExchangeAdapter/blob/master/truffle/contracts/CurveExchangeAdapterSBTC.sol)

### Description

Curve Ren Adapter for swapping/depositing/withdrawing in a Curve pool with native BTC going through renVM and getting renBTC minted

First coin in `IERC20[N_COINS] coins` array will always be renBTC

OpenGSN/Biconomy gasless transactions are planned to be integrated so `msg.sender` will be changed to the respective `_msgSender()` function

### recoverStuck

Failsafe function in a case that UI submits a pHash for different types/values than the mintThenSwap/mintThenBurn functions use
user who initiated the swap/deposit function can get back renBTC if they provide what was submitted through UI

#### mintThenSwap

Swapping from BTC->renBTC->ERC20 BTC

mintThenSwap method should mint renBTC to the adapter contract only if the provided 
`_minExchangeRate`, `_slippage`, `_j`, `_coinDestination` and `msg.sender` match what is submmitted through UI.

Only the address from which the swap was initiated can call the method.

Users lock in a minimum exchange rate and slippage which they want to have when doing the swap.
The original message sender can choose to call the function with a new exchange rate or to get renBTC instead.
If the exchange rate at time of confirmation is **not** what the user specified - they should receive renBTC instead.

Function should fail if called from an address different than the one submitted to renVM.

#### mintThenDeposit


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

Burns amount received from exchanging coin i to renBTC and sends BTC to `_btcDestination`

#### removeLiquidityThenBurn

Removes a proportional amount of liquidity from Curve pool, transfers other ERC20 BTCs to `_coinDestination`
and burns removed renBTC liquidity to `_btcDestination`

#### removeLiquidityImbalanceThenBurn

Removes specified amounts of liquidity from Curve pool, transfers other ERC20 BTCs to `_coinDestination`
and burns removed renBTC liquidity to `_btcDestination`

#### removeLiquidityOneCoinThenBurn

Removes liquidity in renBTC from Curve pool, transfers other ERC20 BTCs to `_coinDestination`
and burns removed renBTC liquidity to `_btcDestination`