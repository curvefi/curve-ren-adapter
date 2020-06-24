const Token = artifacts.require("Token");
const CurveExchangeAdapter = artifacts.require("CurveExchangeAdapterSBTCMocks");

module.exports = async function(deployer, network, accounts) {
	curve = '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714'
	curve_token = '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3'
	registry = '0xe80d347df1209a76dd9d2319d62912ba98c54ddd'
	renbtc = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D'
	wbtc = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
	sbtc = '0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6'
	console.log(curve, curve_token, registry, wbtc, sbtc, accounts[0], Token.address)

	deployer.deploy(CurveExchangeAdapter, curve, curve_token, registry, [renbtc, wbtc, sbtc], Token.address);
};

//["0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D", "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599", "0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6"]