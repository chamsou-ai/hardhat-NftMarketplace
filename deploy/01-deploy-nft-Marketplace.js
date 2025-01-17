const {network , deployments, getNamedAccounts} = require("hardhat")
const {networkConfig, developmentChains} = require("../helper-hardhat-config")
const { verify } = require("../utils/verify")

module.exports = async ({getNamedAccounts , deployments}) => {
    const {deploy , log} = deployments
    const {deployer} = await getNamedAccounts()

    log("----------------------------------------------------")

    const args = []
    const NftMarketplace = await deploy("NftMarketplace" , {
        from : deployer,
        args : args,
        log : true,
        waitConfirmations : network.config.blockConfirmations || 1
    })
    if(!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY){
        log("Verifying...")
        await verify(NftMarketplace.address , args)
    }

    log("----------------------------------------------------")

}

module.exports.tags = ["all" , "nftmarketplace"]