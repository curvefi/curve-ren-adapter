pragma solidity ^0.5.0;

import "./SafeMath.sol";

contract Token {

    using SafeMath for uint256;

    string public symbol;
    string public  name;
    uint256 public decimals;
    uint256 public totalSupply;

    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowed;

    event Transfer(address from, address to, uint256 value);
    event Approval(address owner, address spender, uint256 value);

    constructor(
        string memory _symbol,
        string memory _name,
        uint256 _decimals,
        uint256 _totalSupply
    )
        public
    {
        symbol = _symbol;
        name = _name;
        decimals = _decimals;
        totalSupply = _totalSupply;
        balances[msg.sender] = _totalSupply;
        emit Transfer(address(0), msg.sender, _totalSupply);
    }

    function () external payable {
        revert();
    }

    function balanceOf(address _owner) public view returns (uint256) {
        return balances[_owner];
    }

    function allowance(
        address _owner,
        address _spender
    )
        public
        view
        returns (uint256)
    {
        return allowed[_owner][_spender];
    }

    function approve(address _spender, uint256 _value) public returns (bool) {
        allowed[msg.sender][_spender] = _value;
        emit Approval(msg.sender, _spender, _value);
        return true;
    }

    function transfer(address _to, uint256 _value) public returns (bool) {
        balances[msg.sender] = balances[msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        emit Transfer(msg.sender, _to, _value);
        return true;
    }

    function transferFrom(
        address _from,
        address _to,
        uint256 _value
    )
        public
        returns (bool)
    {
        require(allowed[_from][msg.sender] >=_value, "Insufficient allowance");
        balances[_from] = balances[_from].sub(_value);
        allowed[_from][msg.sender] = allowed[_from][msg.sender].sub(_value);
        balances[_to] = balances[_to].add(_value);
        emit Transfer(_from, _to, _value);
        return true;
    }

    function mint(
        bytes32 _pHash,
        uint256 _amount,
        bytes32 _nHash,
        bytes calldata _sig
    ) external returns (uint256) {
        return 10000;
    }

    function burn(bytes calldata _to, uint256 _amountScaled) external returns (uint256) {
        return 10000;
    }

}