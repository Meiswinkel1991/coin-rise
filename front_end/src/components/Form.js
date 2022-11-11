import React, { useState, useEffect } from "react";
import { Typography, Box } from "@mui/material";
import Stepper from "./Stepper/Stepper";
import StepperGeneral from "./StepperGeneral";
import StepperInfo from "./StepperInfo";
import FinalStepper from "./FinalStepper";
import { useNavigate } from "react-router-dom";

import {
  storeFiles,
  makeFileObjects,
  retrieveFiles,
  loadData,
  storeImg,
} from "./Storage";
import { ethers, BigNumber } from "ethers";
import { CircularProgress } from "@mui/material";
/* campaignManager Contract Address and Contract ABI */
import contractManagerAbi from "../artifacts/contracts/CampaignManager.sol/CampaignManager.json";
import CampaignFactoryAbi from "../artifacts/contracts/CampaignFactory.sol/CampaignFactory.json";
import CampaignAbi from "../artifacts/contracts/Campaign.sol/Campaign.json";
const contractManagerAddress = "0x02D7E5f45A7ae98d8aa572Db8df54165aD4bF88b";
const campaignAddress = "0x1a111771e2FD5c1Ee970CdDd45a89268120Bc45A";
const FactoryAddress = "0xd98458e022ac999a547D49f9da37DCc6F4d1f19F";

function Form() {
  const [userAddress, setUserAddress] = useState();
  const [campaignContract, setCampaignContract] = useState();
  const [signer, setSigner] = useState();
  const [isLoading, setIsloading] = useState(false);
  const navigate = useNavigate();

  // wallet adress

  useEffect(() => {
    const onNewSigner = async () => {
      let addr;
      if (window.ethereum) {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();

        addr = await signer.getAddress();

        setUserAddress(addr.toString());
      }
    };

    onNewSigner();
  }, [window.ethereum]);

  useEffect(() => {
    const setUp = async () => {
      if (signer) {
        setCampaignContract(
          new ethers.Contract(campaignAddress, CampaignAbi, signer)
        );
      }
    };
    setUp();
  }, [signer]);

  const [textTrack, setTextTrack] = useState("");
  const [activeStep, setActiveStep] = useState(0);
  const [campaign, setCampaign] = useState({
    purpose: "Non-Profit",
    category: "",
    newWalletAddress: "",
    campaignName: "",
    campaignInfo: "",
    campaignImg: "",
    campaignDuration: "",
    minAmount: "",
    campaignVideo: "",
    extraInformation: "",
    vote: false,
    nftGold: "",
    nftSilver: "",
    nftBronze: "",
    minVotePercentage: "",
  });

  function handleChange(e) {
    setTextTrack(e.target.value);
  }
  async function handleNext() {
    if (activeStep < 2) setActiveStep((prev) => prev + 1);
    else {
      setIsloading(true);
      const cidImg = await storeImg(campaign?.campaignImg);
      const files = await makeFileObjects(
        campaign?.campaignName,
        campaign?.campaignInfo,
        campaign?.extraInformation,
        campaign?.campaignVideo,
        cidImg
      );
      const cid = await storeFiles(files);
      await CreateNewCampaign(
        campaign?.campaignDuration,
        campaign?.minAmount,
        cid
      );
      const newA = await getLastDeployedCampaign();
      console.log(newA, "newA");
      setIsloading(false);
      navigate(`/project/${newA}`);
      // console.log(newComapaing,'newComapaing')
    }
  }
  function handlePrev() {
    setActiveStep((prev) => prev - 1);
  }
  const steps = ["  ", "", ""];
  const stepsContent = [
    <StepperGeneral
      setCampaign={setCampaign}
      campaign={campaign}
      userAddress={userAddress}
    />,
    <StepperInfo setCampaign={setCampaign} campaign={campaign} />,
    <FinalStepper setCampaign={setCampaign} campaign={campaign} />,
  ];
  const [newAddr, setNewAddr] = useState();

  /**
   * Create a new Campaign for funding non-profit projects
   */
  const CreateNewCampaign = async (duration, minamount, cid_ipfs) => {
    if (!duration && Number(duration)) {
      console.log(`Error, Please enter a valid deadline`);
      return;
    }

    if (!minamount && Number(minamount)) {
      console.log(`Error, Please enter a valid amount`);
      return;
    }

    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.Web3Provider(ethereum);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(
          contractManagerAddress,
          contractManagerAbi.abi,
          signer
        );
        /**
         *  Receive Emitted Event from Smart Contract
         *  @dev See newAttributeAdded emitted from our smart contract add_new_attribute function
         */
        contract.on("NewCampaignCreated", (newCampaign, deadline) => {
          console.log("newCampaign address :", newCampaign);
          console.log("newCampaign deadline :", deadline.toNumber());
        });
        let tx = await contract.createNewCampaign(
          BigNumber.from(duration),
          BigNumber.from(minamount),
          cid_ipfs
        );
        const stylesMining = ["color: black", "background: yellow"].join(";");
        console.log(
          "%c Create new campaign... please wait!  %s",
          stylesMining,
          tx.hash
        );
        //wait until a block containing our transaction has been mined and confirmed.
        //NewCampaignCreated event has been emitted .
        const receipt = await tx.wait();
        const stylesReceipt = ["color: black", "background: #e9429b"].join(";");
        console.log(
          "%c🍵 We just added new campaign %s ",
          stylesReceipt,
          tx.hash
        );
        /* Check our Transaction results */
        if (receipt.status === 1) {
          /**
           * @dev NOTE: Switch up these links once we go to Production
           * Currently set to use Polygon Mumbai Testnet
           */
          const stylesPolygon = ["color: white", "background: #7e44df"].join(
            ";"
          );
          console.log(
            `%c🧬 new campaign added, see transaction: https://polygonscan.com/tx/${tx.hash} %s`,
            stylesPolygon,
            tx.hash
          );
        }
        return;
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  /**
   * Get last Deployed Campaign Contract
   */
  const getLastDeployedCampaign = async () => {
    try {
      const { ethereum } = window;
      if (ethereum) {
        const provider = new ethers.providers.JsonRpcProvider(
          process.env.REACT_APP_QUICKNODE_URL_POLYGON_MUMBAI
        );
        const contract = new ethers.Contract(
          FactoryAddress,
          CampaignFactoryAbi.abi,
          provider
        );

        let campaignList = await contract.getLastDeployedCampaign();
        const stylesMining = ["color: black", "background: yellow"].join(";");
        console.log(
          "%c Deployed Campaign Contracts addresses =  %s",
          stylesMining,
          campaignList
        );
        return campaignList;
      } else {
        console.log("Ethereum object doesn't exist!");
      }
    } catch (error) {
      console.log("error", error);
    }
  };

  return (
    <Box>
      <Stepper steps={steps} activeStep={activeStep} />
      <Box width="100%">{stepsContent[activeStep]}</Box>
      <Box mt={5} mb={4} display="flex" justifyContent="center" width="100%">
        {activeStep > 0 && (
          <button
            onClick={handlePrev}
            style={{
              backgroundColor: "white",
              border: "4px solid #11484F",
              borderRadius: "10px",
              fontFamily: "Sen",
              fontSize: "25px",
              lineHeight: "30px",
              color: "#11484F",
              padding: "10px 60px",
              fontWeight: 700,
              cursor: "pointer",
              marginRight: "15px",
            }}
          >
            Previous
          </button>
        )}
        <button
          onClick={handleNext}
          style={{
            backgroundColor: "white",
            border: "4px solid #11484F",
            borderRadius: "10px",
            fontFamily: "Sen",
            fontSize: "25px",
            lineHeight: "30px",
            color: "#11484F",
            padding: "10px 60px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          {activeStep == 2 && isLoading ? <CircularProgress /> : "Next"}
        </button>
      </Box>
    </Box>
    // <form className="Form" onSubmit={handleSubmit}>
    //   <div>
    //     <label htmlFor="text">Text </label>
    //     <input type="text" id="text" name="text" />
    //   </div>

    //   <div>
    //     <label htmlFor="text">Text track</label>
    //     <input
    //       type="text"
    //       id="textTrack"
    //       name="textTrack"
    //       value={textTrack}
    //       onChange={handleChange}
    //     />
    //   </div>

    //   <div>
    //     <label htmlFor="textArea">TextArea </label>
    //     <textarea type="text" id="textArea" name="textArea"></textarea>
    //   </div>

    //   <div>
    //     <label>Select </label>
    //     <select id="select" name="select">
    //       <option>Option 1</option>
    //       <option>Option 2</option>
    //       <option>Option 3</option>
    //     </select>
    //     {/* {select} */}
    //   </div>

    //   <div>
    //     <label>Select multiple </label>
    //     <select id="selectMultiple" name="selectMultiple" multiple>
    //       <option>Option 1</option>
    //       <option>Option 2</option>
    //       <option>Option 3</option>
    //     </select>
    //     {/* {selectMultiple} */}
    //   </div>

    //   <div>
    //     <label>Checkbox </label>
    //     <input id="checkbox" name="checkbox" type="checkbox"></input>
    //     {/* {checkbox ? <span>Checked !</span> : null} */}
    //   </div>

    //   <div>
    //     <button>Submit</button>
    //   </div>
    // </form>
  );
}

export default Form;
