/**
 *Submitted for verification at Etherscan.io on 2020-05-18
*/

/**
 *Submitted for verification at Etherscan.io on 2020-01-23
*/

// File: github.com/OpenZeppelin/openzeppelin-contracts/blob/master/contracts/GSN/Context.sol

pragma solidity ^0.6.2;

import './SafeMath.sol';

import "@opengsn/gsn/contracts/BaseRelayRecipient.sol";
import "@opengsn/gsn/contracts/interfaces/IKnowForwarderAddress.sol";

// File: browser/dex-adapter-simple.sol

library Math {
    /**
     * @dev Returns the largest of two numbers.
     */
    function max(uint256 a, uint256 b) internal pure returns (uint256) {
        return a >= b ? a : b;
    }

    /**
     * @dev Returns the smallest of two numbers.
     */
    function min(uint256 a, uint256 b) internal pure returns (uint256) {
        return a < b ? a : b;
    }

    /**
     * @dev Returns the average of two numbers. The result is rounded towards
     * zero.
     */
    function average(uint256 a, uint256 b) internal pure returns (uint256) {
        // (a + b) / 2 can overflow, so we distribute
        return (a / 2) + (b / 2) + ((a % 2 + b % 2) / 2);
    }
}

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function approve(address _spender, uint256 _value) external returns (bool);
    function balanceOf(address _owner) external view returns (uint256 balance);
}

interface IGateway {
    function mint(bytes32 _pHash, uint256 _amount, bytes32 _nHash, bytes calldata _sig) external returns (uint256);
    function burn(bytes calldata _to, uint256 _amount) external returns (uint256);
}

interface IGatewayRegistry {
    function getGatewayBySymbol(string calldata _tokenSymbol) external view returns (IGateway);
    function getGatewayByToken(address  _tokenAddress) external view returns (IGateway);
    function getTokenBySymbol(string calldata _tokenSymbol) external view returns (IERC20);
}

interface IUniswapExchange {
    function tokenToEthTransferOutput(uint256 tokens_sold, uint256 min_eth, uint256 deadline, address recipient) external returns (uint256  eth_bought);
    function tokenToEthSwapInput(uint256 tokens_sold, uint256 min_eth, uint256 deadline) external returns (uint256  eth_bought);
    function tokenToTokenSwapInput(uint256 tokens_sold, uint256 min_tokens_bought, uint256 min_eth_bought, uint256 deadline, address token_addr) external returns (uint256  tokens_bought);
    function getEthToTokenInputPrice(uint256 eth_sold) external view returns (uint256 tokens_bought);
    function tokenAddress() external view returns (address);
}

interface ICurveExchange {
    function exchange(int128 i, int128 j, uint256 dx, uint256 min_dy) external;

    function get_dy(int128, int128 j, uint256 dx) external view returns (uint256);

    function calc_token_amount(uint256[3] calldata amounts, bool deposit) external returns (uint256 amount);

    function add_liquidity(uint256[3] calldata amounts, uint256 min_mint_amount) external;

    function remove_liquidity(
        uint256 _amount,
        uint256[3] calldata min_amounts
    ) external;

    function remove_liquidity_imbalance(uint256[3] calldata amounts, uint256 max_burn_amount) external;

    function remove_liquidity_one_coin(uint256 _token_amounts, int128 i, uint256 min_amount) external;
}

interface IFreeFromUpTo {
    function freeFromUpTo(address from, uint256 value) external returns (uint256 freed);
}

contract CurveExchangeAdapter is BaseRelayRecipient, IKnowForwarderAddress {
    using SafeMath for uint256;

    IFreeFromUpTo public constant chi = IFreeFromUpTo(0x0000000000004946c0e9F43F4Dee607b0eF1fA1c);

    modifier discountCHI {
        uint256 gasStart = gasleft();
        _;
        uint256 gasSpent = 21000 + gasStart - gasleft() + 16 *
                           msg.data.length;
        chi.freeFromUpTo(address(this), (gasSpent + 14154) / 41947);
    }

    
    IERC20[3] coins;
    uint256[3] precisions_normalized = [1,1,1e10];

    IERC20 curveToken;

    ICurveExchange public exchange;  
    IGatewayRegistry public registry;

    event SwapReceived(uint256 mintedAmount, uint256 wbtcAmount, int128 j);
    event DepositMintedCurve(uint256 mintedAmount, uint256 curveAmount, uint256[3] amounts);
    event ReceiveRen(uint256 renAmount);
    event Burn(uint256 burnAmount);

    constructor(ICurveExchange _exchange, address _curveTokenAddress, IGatewayRegistry _registry, IERC20[3] memory _coins, address _forwarder) public {
        trustedForwarder = _forwarder;

        exchange = _exchange;
        registry = _registry;
        curveToken = IERC20(_curveTokenAddress);
        for(uint256 i = 0; i < 3; i++) {
            coins[i] = _coins[i];
            require(coins[i].approve(address(exchange), uint256(-1)));
        }        
    }
    
    function versionRecipient() external virtual view
    override returns (string memory) {
        return "1.0";
    }

    function getTrustedForwarder() public view
    override returns(address) {
        return trustedForwarder;
    }
    
    function mintThenSwap(
        uint256 _minExchangeRate,
        uint256 _newMinExchangeRate,
        uint256 _slippage,
        int128 _j,
        address payable _coinDestination,
        uint256 _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external discountCHI {
        //params is [_minExchangeRate, _slippage, _i, _j]
        //fail early so not to spend much gas?
        //require(_i <= 2 && _j <= 2 && _i != _j);
        // Mint renBTC tokens
        bytes32 pHash = keccak256(abi.encode(_minExchangeRate, _slippage, _j, _coinDestination, _msgSender()));
        uint256 mintedAmount = registry.getGatewayBySymbol("BTC").mint(pHash, _amount, _nHash, _sig);
        
        // Get price
        uint256 dy = exchange.get_dy(0, _j, mintedAmount);
        dy = dy.div(precisions_normalized[uint256(_j)]);
        uint256 rate = dy.mul(1e8).div(mintedAmount);
        _slippage = uint256(1e4).sub(_slippage);
        uint256 min_dy = mintedAmount.mul(rate).mul(_slippage).div(1e12);
        
        // Price is OK
        if (rate >= _newMinExchangeRate) {
            require(_j != 0);
            doSwap(_j, mintedAmount, min_dy, _coinDestination);
        } else {
            //Send renBTC to the User instead
            require(coins[0].transfer(_coinDestination, mintedAmount));
            emit ReceiveRen(mintedAmount);
        }
    }

    function doSwap(int128 _j, uint256 _mintedAmount, uint256 _min_dy, address payable _coinDestination) internal {
        uint256 startBalance = coins[uint256(_j)].balanceOf(address(this));
        exchange.exchange(0, _j, _mintedAmount, _min_dy);
        uint256 endBalance = coins[uint256(_j)].balanceOf(address(this));
        uint256 bought = endBalance.sub(startBalance);
    
        //Send proceeds to the User
        require(coins[uint256(_j)].transfer(_coinDestination, bought));
        emit SwapReceived(_mintedAmount, bought, _j);
    }

    function mintThenDeposit(
        address payable _wbtcDestination, 
        uint256 _amount, 
        uint256[3] calldata _amounts, 
        uint256 _min_mint_amount, 
        uint256 _new_min_mint_amount, 
        bytes32 _nHash, 
        bytes calldata _sig
    ) external discountCHI {
        // Mint renBTC tokens
        bytes32 pHash = keccak256(abi.encode(_wbtcDestination, _amounts, _min_mint_amount, _msgSender()));
        //use actual _amount the user sent
        uint256 mintedAmount = registry.getGatewayBySymbol("BTC").mint(pHash, _amount, _nHash, _sig);

        //set renBTC to actual minted amount in case the user sent less BTC to Ren
        uint256[3] memory receivedAmounts = _amounts;
        receivedAmounts[0] = mintedAmount;
        for(uint256 i = 1; i < 3; i++) {
            receivedAmounts[i] = _amounts[i];
        }
        if(exchange.calc_token_amount(_amounts, true) >= _new_min_mint_amount) {
            for(uint256 i = 1; i < 3; i++) {
                require(coins[i].transferFrom(msg.sender, address(this), receivedAmounts[i]));
            }
            uint256 curveBalanceBefore = curveToken.balanceOf(address(this));
            exchange.add_liquidity(receivedAmounts, 0);
            uint256 curveBalanceAfter = curveToken.balanceOf(address(this));
            uint256 curveAmount = curveBalanceAfter.sub(curveBalanceBefore);
            require(curveAmount >= _new_min_mint_amount);
            require(curveToken.transfer(msg.sender, curveAmount));
            emit DepositMintedCurve(mintedAmount, curveAmount, _amounts);
        }
        else {
            require(coins[0].transfer(_wbtcDestination, mintedAmount));
            emit ReceiveRen(mintedAmount);
        }
    }

    function mintNoSwap(
        uint256 _minExchangeRate,
        uint256 _newMinExchangeRate,
        uint256 _slippage,
        address payable _wbtcDestination,
        uint256 _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external discountCHI {
        bytes32 pHash = keccak256(abi.encode(_minExchangeRate, _slippage, _wbtcDestination, _msgSender()));
        uint256 mintedAmount = registry.getGatewayBySymbol("BTC").mint(pHash, _amount, _nHash, _sig);
        
        require(coins[0].transfer(_wbtcDestination, mintedAmount));
        emit ReceiveRen(mintedAmount);
    }

    function mintNoDeposit(
        address payable _wbtcDestination, 
        uint256 _amount, 
        uint256[3] calldata _amounts, 
        uint256 _min_mint_amount, 
        uint256 _new_min_mint_amount, 
        bytes32 _nHash, 
        bytes calldata _sig
    ) external discountCHI {
         // Mint renBTC tokens
        bytes32 pHash = keccak256(abi.encode(_wbtcDestination, _amounts, _min_mint_amount, _msgSender()));
        //use actual _amount the user sent
        uint256 mintedAmount = registry.getGatewayBySymbol("BTC").mint(pHash, _amount, _nHash, _sig);

        require(coins[0].transfer(_wbtcDestination, mintedAmount));
        emit ReceiveRen(mintedAmount);
    }

    function removeLiquidityThenBurn(bytes calldata _btcDestination, uint256 amount, uint256[3] calldata min_amounts) external discountCHI {
        uint256[3] memory balances;
        for(uint256 i = 0; i < coins.length; i++) {
            balances[i] = coins[i].balanceOf(address(this));
        }

        require(curveToken.transferFrom(msg.sender, address(this), amount));
        exchange.remove_liquidity(amount, min_amounts);

        for(uint256 i = 0; i < coins.length; i++) {
            balances[i] = coins[i].balanceOf(address(this)).sub(balances[i]);
            if(i == 0) continue;
            require(coins[i].transfer(msg.sender, balances[i]));
        }

        // Burn and send proceeds to the User
        uint256 burnAmount = registry.getGatewayBySymbol("BTC").burn(_btcDestination, balances[0]);
        emit Burn(burnAmount);
    }

    function removeLiquidityImbalanceThenBurn(bytes calldata _btcDestination, uint256[3] calldata amounts, uint256 max_burn_amount) external discountCHI {
        uint256[3] memory balances;
        for(uint256 i = 0; i < coins.length; i++) {
            balances[i] = coins[i].balanceOf(address(this));
        }

        uint256 _tokens = curveToken.balanceOf(msg.sender);
        if(_tokens > max_burn_amount) { 
            _tokens = max_burn_amount;
        }
        require(curveToken.transferFrom(msg.sender, address(this), _tokens));
        exchange.remove_liquidity_imbalance(amounts, max_burn_amount.mul(101).div(100));
        _tokens = curveToken.balanceOf(address(this));
        require(curveToken.transfer(msg.sender, _tokens));

        for(uint256 i = 0; i < coins.length; i++) {
            balances[i] = coins[i].balanceOf(address(this)).sub(balances[i]);
            if(i == 0) continue;
            require(coins[i].transfer(msg.sender, balances[i]));
        }

        // Burn and send proceeds to the User
        uint256 burnAmount = registry.getGatewayBySymbol("BTC").burn(_btcDestination, balances[0]);
        emit Burn(burnAmount);
    }

    //always removing in renBTC, else use normal method
    function removeLiquidityOneCoinThenBurn(bytes calldata _btcDestination, uint256 _token_amounts, uint256 min_amount, uint8 _i) external discountCHI {
        uint256 startRenbtcBalance = coins[0].balanceOf(address(this));
        require(curveToken.transferFrom(msg.sender, address(this), _token_amounts));
        exchange.remove_liquidity_one_coin(_token_amounts, _i, min_amount);
        uint256 endRenbtcBalance = coins[0].balanceOf(address(this));
        uint256 renbtcWithdrawn = endRenbtcBalance.sub(startRenbtcBalance);

        // Burn and send proceeds to the User
        uint256 burnAmount = registry.getGatewayBySymbol("BTC").burn(_btcDestination, renbtcWithdrawn);
        emit Burn(burnAmount);
    }
    
    function swapThenBurn(bytes calldata _btcDestination, uint256 _amount, uint256 _minRenbtcAmount, uint8 _i) external discountCHI {
        require(coins[_i].transferFrom(msg.sender, address(this), _amount));
        uint256 startRenbtcBalance = coins[0].balanceOf(address(this));
        exchange.exchange(_i, 0, _amount, _minRenbtcAmount);
        uint256 endRenbtcBalance = coins[0].balanceOf(address(this));
        uint256 renbtcBought = endRenbtcBalance.sub(startRenbtcBalance);
        
        // Burn and send proceeds to the User
        uint256 burnAmount = registry.getGatewayBySymbol("BTC").burn(_btcDestination, renbtcBought);
        emit Burn(burnAmount);
    }
}