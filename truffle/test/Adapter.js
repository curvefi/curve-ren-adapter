const CurveAdapter = artifacts.require('CurveExchangeAdapter')
const Token = artifacts.require('Token')
const erc20 = require('./abi/erc20')
const swap_abi = require('./abi/swap')
const { ether, balance } = require('openzeppelin-test-helpers');

const BN = require('bignumber.js')

let curve = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B'
let registry = '0xe80d347df1209a76dd9d2319d62912ba98c54ddd'

// userAddress must be unlocked using --unlock ADDRESS
const userAddress = '0x6f636A1A8d60747f398aA4Ce6f7BD23D83D89956';
const wbtcAddress = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const wbtcContract = new web3.eth.Contract(erc20, wbtcAddress);

const userRenAddress = '0x5a704C4BaA9295542bbcE855cb978CEBD3cADFC5';
const renAddress = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D'
const renContract = new web3.eth.Contract(erc20, renAddress);

const swap = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B'
const swapContract = new web3.eth.Contract(swap_abi, swap)

const swapToken = '0x49849C98ae39Fff122806C06791Fa73784FB3675'
const swapTokenContract = new web3.eth.Contract(erc20, swapToken)


contract('Curve Protocol', async accounts => {


	it('should send ether to the DAI address', async () => {
		let account = accounts[0]
		let contract = await Token.deployed()
		// Send 0.1 eth to userAddress to have gas to send an ERC20 tx.
		await web3.eth.sendTransaction({
		  from: accounts[0],
		  to: userAddress,
		  value: "1000000000000000000"
		});
		await web3.eth.sendTransaction({
		  from: accounts[0],
		  to: userRenAddress,
		  value: "1000000000000000000"
		});
		const ethBalance = await balance.current(userAddress);
		expect(+ethBalance).to.be.at.least(+"1000000000000000000")
	});

	it('should transfer DAI to CurveProtocol', async () => {
		let account = accounts[0]
		let userbalance = await wbtcContract.methods.balanceOf(userAddress).call();
		let userrenbalance = await renContract.methods.balanceOf(userRenAddress).call();
		await wbtcContract.methods
			.transfer(accounts[0], userbalance)
			.send({ from: userAddress, gasLimit: 800000 });

		const daiBalance = await wbtcContract.methods.balanceOf(accounts[0]).call();
		await renContract.methods
			.transfer(accounts[0], userrenbalance)
			.send({ from: userRenAddress, gasLimit: 800000 });
		//expect(+daiBalance).to.be.at.least(+'3497861967')	
	});

	it('should approve DAI to CurveProtocol', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		await wbtcContract.methods
	        .approve(contract.address, '3497861967')
	        .send({ from: account, gasLimit: 800000 });
        await renContract.methods
	        .approve(contract.address, '1900000000')
	        .send({ from: account, gasLimit: 800000 });
	    const daiAllowance = await wbtcContract.methods.allowance(account, contract.address).call()
	    expect(+daiAllowance).to.be.at.least(+'3497861967')
	});


	it('should transfer renbtc and wbtc to adapter contract', async () => {
		let contract = await CurveAdapter.deployed()
		await renContract.methods
			.transfer(contract.address, '100000')
			.send({ from: accounts[0], gasLimit: 800000 });
		await wbtcContract.methods
			.transfer(contract.address, '100000')
			.send({ from: accounts[0], gasLimit: 800000 });
	})

	it('should exchange', async () => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()
		let tokenContract = await Token.deployed()

     		await renContract.methods
			.transfer(contract.address, '100000')
			.send({ from: accounts[0], gasLimit: 800000 });

		console.log(await wbtcContract.methods.balanceOf(account).call())
		let receipt = await contract.mintThenSwap(0, 0, account, 1, "0x30", "0x30", { from: account })
		console.log(receipt)
		console.log(await wbtcContract.methods.balanceOf(account).call())

		//make if fail and check renBTC balance
		console.log(await renContract.methods.balanceOf(account).call())
		let receipt2 = await contract.mintThenSwap(0, 100000, account, 1, "0x30", "0x30", { from: account })
		console.log(await renContract.methods.balanceOf(account).call())

	});

	it('should add liquidity', async () => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let amounts = ["10000", "10000"]

		let receipt = await contract.mintThenDeposit(account, amounts, 0, "0x30", "0x30", { from: account })
		console.log(receipt)
		console.log(await swapTokenContract.methods.balanceOf(account).call())

		console.log(await swapContract.methods.calc_token_amount(amounts, true).call())

		console.log(await renContract.methods.balanceOf(account).call())
		let receipt2 = await contract.mintThenDeposit(account, amounts, "1099864718376454", "0x30", "0x30", { from: account })
		console.log(await renContract.methods.balanceOf(account).call())
	})

	it('should remove liquidity', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let balance = await swapTokenContract.methods.balanceOf(account).call()

		await swapTokenContract.methods.approve(contract.address, balance).send({from: account, gasLimit: 1000000 })

		let receipt = await contract.removeLiquidityThenBurn('0x30', BN(balance).div(2).toFixed(0,1), [1,1])

		let balanceAfter = await swapTokenContract.methods.balanceOf(account).call()
		console.log(balanceAfter)
	})

	it('should remove liquidity imbalance', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let balance = await swapTokenContract.methods.balanceOf(account).call()
		console.log(balance)

		await swapTokenContract.methods.approve(contract.address, balance).send({from: account, gasLimit: 1000000 })

		let receipt = await contract.removeLiquidityImbalanceThenBurn('0x30', [1,1], BN(balance).div(2).toFixed(0,1))

		let balanceAfter = await swapTokenContract.methods.balanceOf(account).call()
		console.log(balanceAfter)
	})

	it('should remove liquidity in one coin', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let balance = await swapTokenContract.methods.balanceOf(account).call()
		console.log(balance)

		await swapTokenContract.methods.approve(contract.address, balance).send({from: account, gasLimit: 1000000 })

		let receipt = await contract.removeLiquidityOneCoinThenBurn('0x30', balance, 1000)

		let balanceAfter = await swapTokenContract.methods.balanceOf(account).call()
		console.log(balanceAfter)
	})

	it('should remove liquidity in one coin', async() => {
		let account = accounts[0]
		let contract = await CurveProtocol.deployed()

		let daiBalance = await daiContract.methods.balanceOf(contract.address).call()
		let receipt = await contract.remove_liquidity_one_coin("100000000000", 0, 1, { from: account })
		let withdrawnAmount = receipt.logs[0].args.withdrawnAmount.toString()
		let daiBalanceAfter = await daiContract.methods.balanceOf(contract.address).call()

		console.log(+daiBalance, +daiBalanceAfter, +withdrawnAmount)
	})
});