const Token = artifacts.require("Token");

module.exports = async function(deployer, network, accounts) {
	deployer.deploy(Token, "Token", "TKN", 18, "1000000000000000000000000000000");
};
