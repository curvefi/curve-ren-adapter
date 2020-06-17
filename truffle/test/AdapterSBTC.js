const CurveAdapter = artifacts.require('CurveExchangeAdapterSBTCMocks')
const Token = artifacts.require('Token')
const erc20 = require('./abi/erc20')
const swap_abi = require('./abi/swap_sbtc')
const { ether, balance } = require('openzeppelin-test-helpers');

const BN = require('bignumber.js')
const chai = require('chai')
const expect = chai.expect
chai.should()
chai.use(require('chai-bignumber')(BN));

let curve = '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714'
let curve_token = '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3'
let registry = '0xe80d347df1209a76dd9d2319d62912ba98c54ddd'

// userAddress must be unlocked using --unlock ADDRESS
const userAddress = '0x6f636A1A8d60747f398aA4Ce6f7BD23D83D89956';
const wbtcAddress = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'
const wbtcContract = new web3.eth.Contract(erc20, wbtcAddress);

const userRenAddress = '0x5a704C4BaA9295542bbcE855cb978CEBD3cADFC5';
const renAddress = '0xEB4C2781e4ebA804CE9a9803C67d0893436bB27D'
const renContract = new web3.eth.Contract(erc20, renAddress);

const userSBTCAddress = '0xC8C2b727d864CC75199f5118F0943d2087fB543b';
const sbtcAddress = '0xfE18be6b3Bd88A2D2A7f928d00292E7a9963CfC6'
const sbtcContract = new web3.eth.Contract(erc20, sbtcAddress);

const swap = '0x7fC77b5c7614E1533320Ea6DDc2Eb61fa00A9714'
const swapContract = new web3.eth.Contract(swap_abi, swap)

const swapToken = '0x075b1bb99792c9E1041bA13afEf80C91a1e70fB3'
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
		await web3.eth.sendTransaction({
		  from: accounts[0],
		  to: userSBTCAddress,
		  value: "1000000000000000000"
		});
		const ethBalance = await balance.current(userAddress);
		expect(+ethBalance).to.be.at.least(+"1000000000000000000")
	});

	it('should transfer DAI to CurveProtocol', async () => {
		let account = accounts[0]
		let userbalance = await wbtcContract.methods.balanceOf(userAddress).call();
		let userrenbalance = await renContract.methods.balanceOf(userRenAddress).call();
		let usersbtcbalance = await sbtcContract.methods.balanceOf(userSBTCAddress).call();
		await wbtcContract.methods
			.transfer(accounts[0], userbalance)
			.send({ from: userAddress, gasLimit: 800000 });

		const daiBalance = await wbtcContract.methods.balanceOf(accounts[0]).call();
		await renContract.methods
			.transfer(accounts[0], userrenbalance)
			.send({ from: userRenAddress, gasLimit: 800000 });

		await sbtcContract.methods
			.transfer(accounts[0], usersbtcbalance)
			.send({ from: userSBTCAddress, gasLimit: 800000 });
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
        await sbtcContract.methods
	        .approve(contract.address, '3497861967')
	        .send({ from: account, gasLimit: 800000 });
	    const daiAllowance = await wbtcContract.methods.allowance(account, contract.address).call()
	    expect(+daiAllowance).to.be.at.least(+'3497861967')
	});


	it('should transfer renbtc and wbtc to adapter contract', async () => {
		let contract = await CurveAdapter.deployed()
		await renContract.methods
			.transfer(contract.address, '100000')
			.send({ from: accounts[0], gasLimit: 800000 });
		// await wbtcContract.methods
		// 	.transfer(contract.address, '100000')
		// 	.send({ from: accounts[0], gasLimit: 800000 });
	})

	it('should exchange', async () => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()
		let tokenContract = await Token.deployed()

     		await renContract.methods
			.transfer(contract.address, '100000')
			.send({ from: accounts[0], gasLimit: 800000 });

		let amount = BN(1e4).toFixed(0,1)
		let min_amount = BN(amount).times(BN(0.99)).toFixed(0,1)
		let dy = BN(await swapContract.methods.get_dy(0,1, amount).call())
		let exchange_rate = dy.div(BN(amount))
		let min_exchange_rate = exchange_rate.times(1e8).times(BN(0.99)).toFixed(0,1)
		let wbtcBalance = BN(await wbtcContract.methods.balanceOf(account).call())
		let receipt = await contract.mintThenSwap(min_exchange_rate, min_exchange_rate, 100, 1, account, amount, "0x30", "0x30", { from: account })
		let mintedAmount = receipt.logs[0].args.mintedAmount
		let endwbtcBalance = BN(await wbtcContract.methods.balanceOf(account).call())
		let wbtcReceived = endwbtcBalance.minus(wbtcBalance)
		let min_receive_amount = BN(mintedAmount).times(exchange_rate).times(BN(0.99))
		wbtcReceived.should.be.bignumber.at.least(min_receive_amount)

		let sbtcBalance = BN(await sbtcContract.methods.balanceOf(account).call())
		receipt = await contract.mintThenSwap(min_exchange_rate, min_exchange_rate, 100, 2, account, amount, "0x30", "0x30", { from: account })
		mintedAmount = receipt.logs[0].args.mintedAmount
		let endsbtcBalance = BN(await sbtcContract.methods.balanceOf(account).call())
		let sbtcReceived = endsbtcBalance.minus(sbtcBalance)
		min_receive_amount = BN(mintedAmount).times(exchange_rate).times(BN(0.99))
		sbtcReceived.should.be.bignumber.at.least(min_receive_amount)

		//make it fail and check renBTC balance
		let renBalance = BN(await renContract.methods.balanceOf(account).call())
		min_amount = BN(min_amount).times(100).toFixed(0,1)
		min_exchange_rate = BN(min_exchange_rate).times(100).toFixed(0,1)
		let receipt2 = await contract.mintThenSwap(min_exchange_rate, min_exchange_rate, 100, 2, account, amount, "0x30", "0x30", { from: account })
		let endRenBalance = BN(await renContract.methods.balanceOf(account).call())
		//mock mint is always 10000
		let renReceived = endRenBalance.minus(renBalance)
		mintedAmount = receipt2.logs[0].args.renAmount
		renReceived.should.be.bignumber.equal(BN(mintedAmount))
	});

	it('should receive ren when user wants that on swap', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()
		let renBalance = BN(await renContract.methods.balanceOf(account).call())
		let receipt = await contract.mintNoSwap(0, 0, 0, account, 0, "0x30", "0x30", { from: account })
		let endRenBalance = BN(await renContract.methods.balanceOf(account).call())

		let renReceived = endRenBalance.minus(renBalance)
		let mintedAmount = receipt.logs[0].args.renAmount
		renReceived.should.be.bignumber.equal(BN(mintedAmount))
	})


	it('should receive ren when user wants that on deposit', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()
		let renBalance = BN(await renContract.methods.balanceOf(account).call())
		let receipt = await contract.mintNoDeposit(account, 0, [0,0], 0, 0, "0x30", "0x30", { from: account })
		let endRenBalance = BN(await renContract.methods.balanceOf(account).call())

		let renReceived = endRenBalance.minus(renBalance)
		let mintedAmount = receipt.logs[0].args.renAmount
		renReceived.should.be.bignumber.equal(BN(mintedAmount))
	})

	it('should add liquidity', async () => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let amounts = ["10000", "10000", "10000"]

		let calc_token_amount =  BN(await swapContract.methods.calc_token_amount(amounts, true).call())
		let min_mint_amount = calc_token_amount.times(BN(0.99))

		let amount = BN(1e4).toFixed(0,1);

		let curveBalance = BN(await swapTokenContract.methods.balanceOf(account).call())
		let receipt = await contract.mintThenDeposit(account, amount, amounts, min_mint_amount.toFixed(0,1), min_mint_amount.toFixed(0,1), "0x30", "0x30", { from: account })
		let endCurveBalance = BN(await swapTokenContract.methods.balanceOf(account).call())
		let curveReceived = endCurveBalance.minus(curveBalance)
		amounts[0] = BN(receipt.logs[0].args.mintedAmount).toFixed(0,1)
		let new_min_mint_amount = BN(await swapContract.methods.calc_token_amount(amounts, true).call()).times(BN(0.99))
		curveReceived.should.be.bignumber.at.least(new_min_mint_amount)


		//make it fail with a larger min mint amount
		let renBalance = BN(await renContract.methods.balanceOf(account).call())
		let receipt2 = await contract.mintThenDeposit(account, amount, amounts, "1099864718376454", "1099864718376454", "0x30", "0x30", { from: account })
		let endRenBalance = BN(await renContract.methods.balanceOf(account).call())
		let renReceived = endRenBalance.minus(renBalance)
		let mintedAmount = receipt2.logs[0].args.renAmount
		//mock mint is always 10000
		renReceived.should.be.bignumber.equal(BN(mintedAmount))
	})

	it('should remove liquidity', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let balance =  BN(await swapTokenContract.methods.balanceOf(account).call())
		let amount = BN(balance).times(BN(0.1)).toFixed(0,1)
		let wbtcBalance = BN(await wbtcContract.methods.balanceOf(account).call())

		await swapTokenContract.methods.approve(contract.address, amount).send({from: account, gasLimit: 1000000 })

		let receipt = await contract.removeLiquidityThenBurn('0x30', amount, [100,100,100])
		let endwbtcBalance = BN(await wbtcContract.methods.balanceOf(account).call())
		let wbtcWithdrawn = endwbtcBalance.minus(wbtcBalance)
		wbtcWithdrawn.should.be.bignumber.at.least(BN(100))

		let balanceAfter = BN(await swapTokenContract.methods.balanceOf(account).call())
		
		let burnedBalance = balanceAfter.minus(balance)
		burnedBalance.should.be.bignumber.at.most(BN(amount))
	})

	it('should remove liquidity imbalance', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let balance = await swapTokenContract.methods.balanceOf(account).call()
		let wbtcBalance = BN(await wbtcContract.methods.balanceOf(account).call())
		let renBalance = BN(await renContract.methods.balanceOf(account).call())
		await swapTokenContract.methods.approve(contract.address, balance).send({from: account, gasLimit: 1000000 })

		let receipt = await contract.removeLiquidityImbalanceThenBurn('0x30', [1000,1000,1000], BN(balance).div(2).toFixed(0,1))
		let endwbtcBalance = BN(await wbtcContract.methods.balanceOf(account).call())
		let endrenBalance = BN(await renContract.methods.balanceOf(account).call())


		let wbtcWithdrawn = endwbtcBalance.minus(wbtcBalance)
		let renWithdrawn = endrenBalance.minus(renBalance)

		wbtcWithdrawn.should.be.bignumber.at.least(BN(1000))
		renWithdrawn.should.be.bignumber.equal(0)
	})

	it('should remove liquidity in one coin', async() => {
		let account = accounts[0]
		let contract = await CurveAdapter.deployed()

		let balance = await swapTokenContract.methods.balanceOf(account).call()
		console.log(balance)

		await swapTokenContract.methods.approve(contract.address, BN(balance).toFixed(0,1)).send({from: account, gasLimit: 1000000 })
		let calc_token_amount = BN(await swapContract.methods.calc_withdraw_one_coin(BN(balance).toFixed(0,1), 0).call())
		console.log(calc_token_amount)
		let min_amount = calc_token_amount.times(BN(0.99)).toFixed(0,1)
		let renBalance = BN(await renContract.methods.balanceOf(account).call())

		let receipt = await contract.removeLiquidityOneCoinThenBurn('0x30', balance, min_amount, 2)
		let endrenBalance = BN(await renContract.methods.balanceOf(account).call())
		let renWithdrawn = endrenBalance.minus(renBalance)
		renWithdrawn.should.be.bignumber.equal(0)

		let balanceAfter = +(await swapTokenContract.methods.balanceOf(account).call())
		balanceAfter.should.be.equal(0);
	})
});