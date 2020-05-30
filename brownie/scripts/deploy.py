from brownie import CurveExchangeAdapter, Token, accounts

def main():
    acct = accounts[0]
    token = Token.deploy("My Real Token", "RLT", 18, 1e28, {'from': acct})
    curve = '0x93054188d876f558f4a66B2EF1d97d16eDf0895B'
    registry = '0xe80d347df1209a76dd9d2319d62912ba98c54ddd'
    wbtc = '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599'

    adapter = CurveExchangeAdapter.deploy(curve, registry, wbtc, acct, token, {'from': acct})
