const { assert, expect } = require("chai")
const { network, deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config.js")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("Basic NFT", function () {
          let basicNft, deployer
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = (await getNamedAccounts()).deployer
              deployer = accounts[0]
              await deployments.fixture(["all"])
              basicNft = await ethers.getContract("BasicNft", deployer)
          })
          describe("Constructor", function () {
              it("initialise the NFT correctly", async function () {
                  const name = await basicNft.name()
                  const symbol = await basicNft.symbol()
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(name, "Dogie")
                  assert.equal(symbol, "DOG")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })
          describe("Mint NFT", () => {
              beforeEach(async () => {
                  const txResponse = await basicNft.mintNft()
                  await txResponse.wait(1)
              })
              it("Allow users to mint NFT , and updates appropriatly", async function () {
                  const tokenURI = await basicNft.tokenURI(0)
                  const tokenCounter = await basicNft.getTokenCounter()
                  assert.equal(tokenCounter.toString(), "1")
                  assert.equal(tokenURI, await basicNft.TOKEN_URI())
              })
              it("Show the correct balance and owner of an NFT", async function () {
                  const deployerAddress = deployer.address
                  const deployerBlance = await basicNft.balanceOf(deployerAddress)
                  const owner = await basicNft.ownerOf(0)
                  assert.equal(deployerBlance.toString(), "1")
                  assert.equal(owner, deployerAddress)
              })
          })
      })
