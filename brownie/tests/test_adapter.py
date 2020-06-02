import logging

def test_account_balance(accounts, web3):
	ERC20_abi = [{"constant":True,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":False,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":False,"stateMutability":"nonpayable","type":"function"},{"constant":True,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":False,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":False,"stateMutability":"nonpayable","type":"function"},{"constant":True,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":True,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":True,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":False,"stateMutability":"view","type":"function"},{"constant":False,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":False,"stateMutability":"nonpayable","type":"function"},{"constant":True,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":False,"stateMutability":"view","type":"function"},{"payable":True,"stateMutability":"payable","type":"fallback"},{"anonymous":False,"inputs":[{"indexed":True,"name":"owner","type":"address"},{"indexed":True,"name":"spender","type":"address"},{"indexed":False,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":False,"inputs":[{"indexed":True,"name":"from","type":"address"},{"indexed":True,"name":"to","type":"address"},{"indexed":False,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]

	contract = web3.eth.contract(abi=ERC20_abi, address='0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599')
	wbtcaccount = '0x6f636A1A8d60747f398aA4Ce6f7BD23D83D89956'
	acc = str(accounts[0])
	print(acc)
	logging.info(wbtcaccount, accounts[0])
	print(wbtcaccount, accounts[0])
	print(contract.functions.balanceOf(wbtcaccount).call())
	web3.parity.personal.unlockAccount('0x6f636A1A8d60747f398aA4Ce6f7BD23D83D89956', "", 0)
	
	contract.functions.transfer(acc, 1000000000000000000).transact({'from': '0x6f636A1A8d60747f398aA4Ce6f7BD23D83D89956'})
	balance = contract.functions.balanceOf(accounts[0]).call()
	# logging.info(balance)
	# # accounts[0].transfer(accounts[1], "10 ether", gas_price=0)

	assert balance - "10 ether" == accounts[0].balance()
