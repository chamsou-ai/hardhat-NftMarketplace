const { network, ethers, deployments } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NftMarketplace Unit Tests", function () {
          let nftMarketplace, basicNft, deployer, user
          const PRICE = ethers.parseEther("0.1")
          const TOKEN_ID = 0
          beforeEach(async () => {
              const accounts = await ethers.getSigners()
              deployer = accounts[0]
              user = accounts[1]
              await deployments.fixture(["all"])
              const nftMarketplaceContract = await ethers.getContract("NftMarketplace", deployer)
              nftMarketplace = nftMarketplaceContract.connect(deployer)
              const basicNftContract = await ethers.getContract("BasicNft", deployer)
              basicNft = basicNftContract.connect(deployer)
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.target, TOKEN_ID)
          })
          describe("listItem", function () {
              it("reverts when the nft is already listed", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed")
              })
              it("reverts when the owner doesn't own the nft", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(listing[1], tx.from, "The sender is not the owner")
              })
              it("reverts when the price is less than or equal to zero ", async function () {
                  const invalidPrice = ethers.parseEther("0")
                  await expect(
                      nftMarketplace.listItem(basicNft.target, TOKEN_ID, invalidPrice),
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero",
                  )
              })
              it("reverts when the nft is not approved by this contract", async function () {
                  const contractApprovedAddress = await basicNft.getApproved(TOKEN_ID)
                  assert.equal(
                      contractApprovedAddress,
                      nftMarketplace.target,
                      "The NFT is not Approved by the marketplace",
                  )
              })
              it("Check if the Listing of the nft info is updated", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  const NftListingPrice = listing[0]
                  assert.equal(NftListingPrice, PRICE, "The price is not set")
              })
              it("It emits an event on listItem", async function () {
                  await expect(nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)).to.emit(
                      nftMarketplace,
                      "ItemListed",
                  )
              })
          })
          describe("buyItem", function () {
              it("reverts if the nft is not listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("revert if the value is less then the price", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                          value: ethers.parseEther("0.0001"),
                      }),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet")
              })
              it("Check if the proceeds are updated", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const proceedBeforeBuy = await nftMarketplace.getProceeds(deployer)
                  const buyItem = await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                      value: PRICE,
                  })
                  await buyItem.wait(1)
                  const proceedAfterBuy = await nftMarketplace.getProceeds(deployer)
                  assert.equal(
                      proceedBeforeBuy,
                      proceedAfterBuy - PRICE,
                      "The seller doesn't Earn the money",
                  )
              })
              it("Check if when the nft is bought is also deleted from the Marketplace", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const buyItem = await nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                      value: PRICE,
                  })
                  await buyItem.wait(1)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(
                      listing[1].toString(),
                      "0x0000000000000000000000000000000000000000",
                      "The NFT dosn't deleted",
                  )
              })
              it("Check the emmiting of the event", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  await expect(
                      nftMarketplace.buyItem(basicNft.target, TOKEN_ID, {
                          value: PRICE,
                      }),
                  ).to.emit(nftMarketplace, "ItemBought")
              })
          })
          describe("cancelItem", function () {
              it("reverts when the owner doesn't own the nft", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(listing[1], tx.from, "The sender is not the owner")
              })
              it("reverts if the nft is not listed", async function () {
                  await expect(
                      nftMarketplace.cancelItem(basicNft.target, TOKEN_ID),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("Check if the Item is Canceled and deleted", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const cancelItem = await nftMarketplace.cancelItem(basicNft.target, TOKEN_ID)
                  await cancelItem.wait(1)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(
                      listing[1].toString(),
                      "0x0000000000000000000000000000000000000000",
                      "The NFT dosn't deleted",
                  )
              })
              it("Check if an event is emitted when the Item is canceled", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  await expect(nftMarketplace.cancelItem(basicNft.target, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ItemCanceled",
                  )
              })
          })
          describe("updateItem", function () {
              const newPrice = ethers.parseEther("0.2")
              it("reverts when the owner doesn't own the nft", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const listing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(listing[1], tx.from, "The sender is not the owner")
              })
              it("reverts if the nft is not listed", async function () {
                  await expect(
                      nftMarketplace.updateListing(basicNft.target, TOKEN_ID, newPrice),
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("Check the if the old price is replaced", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  const updatePrice = await nftMarketplace.updateListing(
                      basicNft.target,
                      TOKEN_ID,
                      newPrice,
                  )
                  await updatePrice.wait(1)
                  const newListing = await nftMarketplace.getListing(basicNft.target, TOKEN_ID)
                  assert.equal(
                      newListing[0],
                      newPrice,
                      "The price doesn't updated with the new price",
                  )
              })
              it("It emits an event on updateListing", async function () {
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)
                  await expect(
                      nftMarketplace.updateListing(basicNft.target, TOKEN_ID, newPrice),
                  ).to.emit(nftMarketplace, "ItemListed")
              })
          })
          describe("withdrawProceeds", function () {
              it("reverts if there are no proceeds", async function () {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceeds",
                  )
              })

              it("allows proceeds to be withdrawn", async function () {
                  // List an item
                  const tx = await nftMarketplace.listItem(basicNft.target, TOKEN_ID, PRICE)
                  await tx.wait(1)

                  // Buy the item
                  const buyTx = await nftMarketplace
                      .connect(user)
                      .buyItem(basicNft.target, TOKEN_ID, { value: PRICE })
                  await buyTx.wait(1)

                  // Check proceeds before withdrawal
                  const proceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  assert.equal(
                      proceedsBefore.toString(),
                      PRICE.toString(),
                      "Proceeds are incorrect",
                  )

                  // Withdraw proceeds
                  const withdrawTx = await nftMarketplace.withdrawProceeds()
                  await withdrawTx.wait(1)

                  // Check proceeds after withdrawal
                  const proceedsAfter = await nftMarketplace.getProceeds(deployer.address)
                  console.log(proceedsAfter)
                  assert.equal(proceedsAfter.toString(), "0", "Proceeds were not withdrawn")
              })
          })
      })
