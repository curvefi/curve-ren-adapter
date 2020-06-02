const Token = artifacts.require("Token");
const CurveExchangeAdapter = artifacts.require("CurveExchangeAdapter");

module.exports = async function(deployer, network, accounts) {
	curve = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B'
	registry = '0xe80d347df1209a76dd9d2319d62912ba98c54ddd'
	wbtc = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
	console.log(curve, registry, wbtc, accounts[0], Token.address)

	deployer.deploy(CurveExchangeAdapter, curve, registry, wbtc, accounts[0], Token.address);
};
