import { useState, useEffect, useRef, MutableRefObject } from "react";
import { 
  Container,
  Grid,
  Box,
  Typography,
  Slider, 
  Input,
  Select,
  MenuItem,
  Button,
  Tooltip,
  Avatar,
  Switch,
  FormControlLabel,
  TextField,
  LinearProgress,
  IconButton,
  FormControl,
  InputLabel,
} from "@mui/material";
import AddAPhotoIcon from "@mui/icons-material/AddAPhoto";
import AvTimerIcon from "@mui/icons-material/AvTimer";
import CancelIcon from "@mui/icons-material/Cancel";
import CropRectangleIcon from "@mui/icons-material/Crop169";
import CropSquareIcon from "@mui/icons-material/CropSquare";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import type { RendererFunctions } from "./ImageDisplay";
import { drawObjectDetectionOutput } from "../../utils/object-detection";
import { drawInstanceSegmentationOutput } from "../../utils/instance-segmentation";
import { drawAnomalyOutput } from "../../utils/anomaly";
import { drawPoseEstimationOutput } from "../../utils/pose-estimation";


interface CameraControlsProps {
    collection_name?: string;
    collections: string[];
    thresholdRef: MutableRefObject<number>;
    pixelThresholdRef: MutableRefObject<number>;
    keypointScoreThresholdRef: MutableRefObject<number>;
    setSelectedCollection: (value: string) => void;
    renderer: RendererFunctions | null;
    onCapture: (hasTimer: boolean, captureRate: number, captureNbrOfPhotos: number) => void;
    captureProgress: number | null;
    onCancelCapture: () => void;
    toggleShowROI: (value: boolean) => void;
    currentROI: number[] | null;
    handleChangeROI: (roi: number[]) => void;
    toggleDragSquared: (value: boolean) => void;
    enableInputTensor: boolean;
    toggleEnableInputTensor: (value: boolean) => void;
    updateROIControlsRef: MutableRefObject<boolean>;
}

const CameraControls = ({
    collection_name,
    collections,
    thresholdRef,
    pixelThresholdRef,
    keypointScoreThresholdRef,
    setSelectedCollection,
    renderer,
    onCapture,
    captureProgress,
    onCancelCapture,
    toggleShowROI,
    currentROI,
    handleChangeROI,
    toggleDragSquared,
    enableInputTensor,
    toggleEnableInputTensor,
    updateROIControlsRef,
}: CameraControlsProps) => {

    const [hasTimer, setHasTimer] = useState(false);
    const [showROI, setShowROI] = useState(false);
    const [captureRate, setCaptureRate] = useState(1);
    const [captureNbrOfPhotos, setCaptureNbrOfPhotos] = useState(10);
    const [ROIFree, setROIFree] = useState(false);
    const [ROI, setROI] = useState<number[]>([0, 0, 1, 1]);
    const [originalROI, setOriginalROI] = useState<number[] | null>(null);

    const disableCapture = collection_name ? false : true;
    const circleButtonStyle = { borderRadius: "50%", padding: 2, boxShadow: 2 };
    const redCircleStyle = { position: "absolute", top: -3, right: 3, width: 15, height: 15 };

    const doCapture = () => {
        onCapture(hasTimer, captureRate, captureNbrOfPhotos);
    };    

    const handleShowROIToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setShowROI(checked);
      toggleShowROI(checked);
    };

    const handleDragSquaredToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      setROIFree(checked);
      toggleDragSquared(checked);
    };

    const handleEnableInputTensorToggle = (event: React.ChangeEvent<HTMLInputElement>, checked: boolean) => {
      toggleEnableInputTensor(checked);
    };

    const disableArrows = {
      "& input::-webkit-outer-spin-button, & input::-webkit-inner-spin-button": { display: "none" },
      "& input[type=number]": { MozAppearance: "textfield" },
    };

    const ROIShouldChangeCountRef = useRef(0);
    const maxIterations = 10;

    useEffect(() => {
      if (updateROIControlsRef.current == true && currentROI !== null) {
        if (JSON.stringify(currentROI) !== JSON.stringify(ROI)) {
          setROI(currentROI);
          updateROIControlsRef.current = false;
          ROIShouldChangeCountRef.current = 0;
        } else {
          ROIShouldChangeCountRef.current++;
          if (ROIShouldChangeCountRef.current >= maxIterations) {
            updateROIControlsRef.current = false;
            ROIShouldChangeCountRef.current = 0;
          }
        }
      }
      if (originalROI === null) {
        setOriginalROI(currentROI);
      }
    }, [currentROI]);

    return (
      <Container sx={{ display: "flex", justifyContent: "center", pt: 2, pb: 2 }}>
        <Grid container spacing={1}>

        {/* BUTTONS AND COLLECTION */}
        <Container sx={{ display: "flex", justifyContent: "center", pt: 2, pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            
            {/* SWAP VGA vs INPUT TENSOR */}
            <Grid item xs={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={enableInputTensor}
                    onChange={handleEnableInputTensorToggle}
                    name="enableInputTensor"
                    color="primary"
                    disabled={false} // # TODO: Disable for models that are converted with input tensor disabled
                  />
                }
                label="Input Tensor"
              />
            </Grid>

            {/* COLLECTION */}
            <Grid item xs={2}>
              <Box>
                <FormControl fullWidth>
                  <InputLabel id="collection-label">Select Collection</InputLabel>
                  <Select
                    labelId="collection-label"
                    value={collections.includes(collection_name || "") ? collection_name : ""}
                    onChange={(event) => setSelectedCollection(event.target.value)}
                    label="Collection"
                  >
                    {collections.map((collection) => (
                      <MenuItem key={collection} value={collection}>
                        {collection}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Box>
            </Grid>

            {/* BUTTON */}
            <Grid item xs={4}>
              <Container sx={{ display: "flex", justifyContent: "center" }}>
                <Tooltip title="Capture picture" placement="top">
                  <>
                    <Button sx={circleButtonStyle} disabled={disableCapture} variant="contained" color="primary" onClick={doCapture}>
                      <AddAPhotoIcon fontSize="large" />
                      {hasTimer && (
                        <Box sx={redCircleStyle}>
                          <Avatar sx={{ bgcolor: "red", width: 30, height: 30 }}>
                            <AvTimerIcon sx={{ color: "white" }} />
                          </Avatar>
                        </Box>
                      )}
                    </Button>
                  </>
                </Tooltip>
              </Container>
            </Grid>

            {/* RESET INPUT TENSOR CROPPING */}
            <Grid item xs={4}>
              <Container sx={{ display: "flex", justifyContent: "flex-start" }}>
                <Tooltip title="Reset view" placement="top">
                  <>
                    <Button
                      sx={circleButtonStyle} color="primary"
                      onClick={() => {
                        handleChangeROI(originalROI);
                        updateROIControlsRef.current = true;
                      }}
                      disabled={JSON.stringify(currentROI) === JSON.stringify(originalROI)}
                    >
                      <RestartAltIcon fontSize="large" />
                    </Button>
                  </>
                </Tooltip>
              </Container>
            </Grid>
          </Grid>
        </Container>

        {/* TIMER */}
        <Container sx={{ display: "flex", justifyContent: "center", pt: 2, pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={hasTimer}
                    onChange={(event) => setHasTimer(event.target.checked)}
                    name="hasTimer"
                    color="primary"
                  />
                }
                label="Timer"
              />
            </Grid>
            <>
              <Grid item xs={2}>
                <TextField
                  label="Capture Rate"
                  type="number"
                  value={captureRate}
                  onChange={(event) => setCaptureRate(Number(event.target.value))}
                  InputLabelProps={{shrink: true}}
                  fullWidth
                  disabled={!hasTimer}
                />
              </Grid>
              <Grid item xs={2}>
                <TextField
                  label="Nbr of Photos"
                  type="number"
                  value={captureNbrOfPhotos}
                  onChange={(event) => setCaptureNbrOfPhotos(Number(event.target.value))}
                  InputLabelProps={{shrink: true}}
                  fullWidth
                  disabled={!hasTimer}
                />
              </Grid>
              {captureProgress !== null && (
                <Grid item xs={4}>
                  <Box sx={{ display: "flex", alignItems: "center", pl: 4 }}>
                    <LinearProgress 
                      variant="determinate" 
                      value={(captureProgress / captureNbrOfPhotos) * 100} 
                      sx={{ width: '100%', mr: 2 }} 
                    />
                    <IconButton onClick={onCancelCapture}>
                      <CancelIcon />
                    </IconButton>
                  </Box>
                </Grid>
              )}
            </>
          </Grid>
        </Container>

        {/* ROI */}
        <Container sx={{ display: "flex", justifyContent: "center", pt: 2, pb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={2}>
              <FormControlLabel
                control={
                  <Switch
                    checked={showROI}
                    onChange={handleShowROIToggle}
                    name="showROI"
                    color="primary"
                  />
                }
                label="ROI"
              />
            </Grid>

            <Grid item xs={1}>
              <TextField
                label="left"
                type="number"
                value={ROI[0]}
                onChange={(event) => setROI([Number(event.target.value), ROI[1], ROI[2], ROI[3]])}
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                fullWidth
                disabled={!showROI}
                sx={disableArrows}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="top"
                type="number"
                value={ROI[1]}
                onChange={(event) => setROI([ROI[0], Number(event.target.value), ROI[2], ROI[3]])}
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                fullWidth
                disabled={!showROI}
                sx={disableArrows}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="width"
                type="number"
                value={ROI[2]}
                onChange={(event) => setROI([ROI[0], ROI[1], Number(event.target.value), ROI[3]])}
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                fullWidth
                disabled={!showROI}
                sx={disableArrows}
              />
            </Grid>
            <Grid item xs={1}>
              <TextField
                label="height"
                type="number"
                value={ROI[3]}
                onChange={(event) => setROI([ROI[0], ROI[1], ROI[2], Number(event.target.value)])}
                inputProps={{ min: 0, max: 1, step: 0.01 }}
                fullWidth
                disabled={!showROI}
                sx={disableArrows}
              />
            </Grid>
            <Grid item xs={2}>
              <Button variant="contained" color="primary" disabled={!showROI} onClick={() => handleChangeROI(ROI)}>
                Apply
              </Button>
            </Grid>

            <Grid item xs={2}>
              <Container sx={{ display: "flex", justifyContent: "center", alignItems: "center", pt: 2, pb: 2 }}>
                <CropRectangleIcon sx={{ mr: 1 }} />
                Free ratio
                <Switch
                  checked={ROIFree}
                  onChange={handleDragSquaredToggle}
                  name="preserveAspectRatio"
                  color="primary"
                  disabled={!showROI}
                />
                <CropSquareIcon sx={{ mr: 1 }} />
                Square ratio
              </Container>
            </Grid>
          </Grid>
        </Container> 

        {/* ARCHITECTURE SPECIFIC */}
        {(renderer === drawObjectDetectionOutput || renderer === drawInstanceSegmentationOutput || renderer === drawAnomalyOutput || renderer === drawPoseEstimationOutput) && (
            <>
            <Grid item xs={6}>
                <Box>
                <Typography fontWeight="bold" mb={2}>
                  {renderer === drawObjectDetectionOutput || renderer === drawInstanceSegmentationOutput ? "Detection Threshold" :
                    renderer === drawAnomalyOutput ? "Anomaly Threshold" :
                    "Confidence Threshold"}
                </Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                    <Slider
                        value={thresholdRef.current}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(event, newValue) => {
                            thresholdRef.current = newValue as number;
                        }}
                    />
                    </Grid>
                    <Grid item>
                    <Input
                        value={thresholdRef.current}
                        size="small"
                        onChange={(e) => {
                            thresholdRef.current = Number(e.target.value);
                        }}
                        inputProps={{
                        min: 0,
                        max: 1,
                        step: 0.05,
                        type: "number",
                        "aria-labelledby": "input-slider",
                        }}
                    />
                    </Grid>
                </Grid>
                </Box>
            </Grid>
            </>
        )}
        {renderer === drawAnomalyOutput && (
            <>
            <Grid item xs={6}>
                <Box>
                <Typography fontWeight="bold" mb={2}>
                  Pixel Threshold
                </Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                    <Slider
                        value={pixelThresholdRef.current}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(event, newValue) => {
                          pixelThresholdRef.current = newValue as number;
                      }}
                    />
                    </Grid>
                    <Grid item>
                    <Input
                        value={pixelThresholdRef.current}
                        size="small"
                        onChange={(e) => {
                            pixelThresholdRef.current = Number(e.target.value);
                        }}
                        inputProps={{
                        min: 0,
                        max: 1,
                        step: 0.05,
                        type: "number",
                        "aria-labelledby": "input-slider",
                        }}
                    />
                    </Grid>
                </Grid>
                </Box>
            </Grid>
            </>
        )}
        {renderer === drawPoseEstimationOutput && (
            <>
            <Grid item xs={6}>
                <Box>
                <Typography fontWeight="bold" mb={2}>
                  Keypoint Score Threshold
                </Typography>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs>
                    <Slider
                        value={keypointScoreThresholdRef.current}
                        min={0}
                        max={1}
                        step={0.01}
                        onChange={(event, newValue) => {
                            keypointScoreThresholdRef.current = newValue as number;
                        }}
                    />
                    </Grid>
                    <Grid item>
                    <Input
                        value={keypointScoreThresholdRef.current}
                        size="small"
                        onChange={(e) => {
                            keypointScoreThresholdRef.current = Number(e.target.value);
                        }}
                        inputProps={{
                        min: 0,
                        max: 1,
                        step: 0.05,
                        type: "number",
                        "aria-labelledby": "input-slider",
                        }}
                    />
                    </Grid>
                </Grid>
                </Box>
            </Grid>
            </>
        )}
        </Grid>
      </Container>
    );
  };

export default CameraControls;
