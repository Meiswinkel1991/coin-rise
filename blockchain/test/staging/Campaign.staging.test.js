const { expect, assert } = require("chai")
const { ethers, network } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers")
const deployedContracts = require("../../deployments/deployedContracts.json")

developmentChains.includes(network.name)
    ? describe.skip
    : describe("Campaign Protocol staging test", () => {
          let chainId, stableToken, campaignManager, campaignFactory, accounts
          beforeEach(async () => {
              chainId = network.config.chainId
              accounts = await ethers.getSigners()

              //Search the deployed contracts
              if (chainId in deployedContracts) {
                  const campaignManagerAddress = deployedContracts[chainId].CampaignManager.address
                  const campaignFactoryAddress = deployedContracts[chainId].CampaignFactory.address

                  const stableTokenAddress = networkConfig[chainId].DAI

                  campaignManager = await ethers.getContractAt(
                      "CampaignManager",
                      campaignManagerAddress
                  )
                  campaignFactory = await ethers.getContractAt(
                      "CampaignFactory",
                      campaignFactoryAddress
                  )

                  stableToken = await ethers.getContractAt("ERC20", stableTokenAddress)
              }
          })

          describe("#performUpkeep", () => {
              it("successfully performUpkeep with live chainlink keeper", async () => {
                  const _duration = 30

                  await new Promise(async (resolve, reject) => {
                      campaignManager.once("CampaignFinished", async (campaign) => {
                          console.log("Campaign finished")

                          resolve()
                      })

                      await campaignManager.createNewCampaign(_duration)
                  })
              })
          })
      })

/** Procedure
 * 1. Submitter creates a new Campaign
 * 2. Users can contribute the campaign
 * 3. Chainlink Keeper check the status of the Campaign
 * 4. If the Campaign has finished the Keeper send the funds to the campaign and transfer the Ownership to the submitter
 * 5. Submitter can send all the tokens in the Campaign contract to an other address
 */
