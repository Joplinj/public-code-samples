import { useContext, useEffect, useRef, useState } from "react";
import { AuthContext } from "../global/context";
import { Player, BigPlayButton } from "video-react";
import { MdArrowBack } from "react-icons/md";
import "video-react/dist/video-react.css";

const FALLBACK_PROGRESS_SAVE_INTERVAL_MS = 30000;
const NEXT_EPISODE_DELAY_MS = 5000;
const NEXT_EPISODE_COUNTDOWN_START = 5;
const CONTROLS_HIDE_DELAY_MS = 3000;

/**
 * Video player component used in a streaming application.
 *
 * Handles playback resume, progress persistence, next-episode flow,
 * player error state, and auto-hidden controls.
 */
const VideoPlayer = ({
  path,
  xc_id,
  position,
  isResume,
  type,
  episodeID,
  backFromPlayer,
  handleVideoEnd,
  nextEpisode,
  duration,
  playerParamsFromToken,
}) => {
  const { JWT_TOKEN, language, appInfos } = useContext(AuthContext);

  const videoRef = useRef(null);

  const saveProgressIntervalRef = useRef(null);
  const playerStatusIntervalRef = useRef(null);
  const nextEpisodeTimeoutRef = useRef(null);
  const nextEpisodeCountdownIntervalRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const isTransitioningToNextEpisodeRef = useRef(false);
  const isVideoLoadedRef = useRef(false);
  const lastSavedApiPositionRef = useRef(null);

  const [isNextButtonVisible, setIsNextButtonVisible] = useState(false);
  const [isError, setIsError] = useState(false);
  const [currentSecondBeforeNext, setCurrentSecondBeforeNext] = useState(NEXT_EPISODE_COUNTDOWN_START);
  const [videoDuration, setVideoDuration] = useState(0);
  const [isControlsVisible, setIsControlsVisible] = useState(true);

  const nextEpisodeLabel = appInfos?.lang?.[language]?.data?.global?.time_next_episode_label ?? "Next episode in";

  const errorMessage = appInfos?.lang?.[language]?.data?.global?.error_message ?? "An error occurred";

  useEffect(() => {
    lastSavedApiPositionRef.current = null;
    isVideoLoadedRef.current = false;
    setIsError(false);
    setIsNextButtonVisible(false);
    setCurrentSecondBeforeNext(NEXT_EPISODE_COUNTDOWN_START);
  }, [path]);

  useEffect(() => {
    handleResumePlayback();

    clearInterval(saveProgressIntervalRef.current);
    saveProgressIntervalRef.current = setInterval(
      savePlaybackProgress,
      appInfos?.progressSpacing ? appInfos.progressSpacing * 1000 : FALLBACK_PROGRESS_SAVE_INTERVAL_MS,
    );

    return () => clearInterval(saveProgressIntervalRef.current);
  }, [appInfos, isNextButtonVisible, path, type]);

  useEffect(() => {
    clearInterval(playerStatusIntervalRef.current);

    playerStatusIntervalRef.current = setInterval(() => {
      if (!videoRef.current) return;

      const playerState = videoRef.current.getState();

      if (isNextButtonVisible) {
        clearInterval(playerStatusIntervalRef.current);
        return;
      }

      if (type === "series" && playerState.player.ended) {
        clearInterval(playerStatusIntervalRef.current);
        handleNextEpisode();
        return;
      }

      if (type !== "series" && playerState.player.ended) {
        clearInterval(playerStatusIntervalRef.current);
        backFromPlayer(lastSavedApiPositionRef.current, videoDuration);
        return;
      }

      if (playerState.player.error) {
        setIsError(true);
        clearInterval(playerStatusIntervalRef.current);
        return;
      }

      if (playerState.player.networkState === 1 && !isVideoLoadedRef.current) {
        isVideoLoadedRef.current = true;
        videoRef.current.play();
      }
    }, 1000);

    return () => clearInterval(playerStatusIntervalRef.current);
  }, [type, nextEpisode, videoDuration, isNextButtonVisible, path]);

  useEffect(() => {
    if (!isNextButtonVisible) {
      setCurrentSecondBeforeNext(NEXT_EPISODE_COUNTDOWN_START);
      return;
    }

    nextEpisodeCountdownIntervalRef.current = setInterval(() => {
      setCurrentSecondBeforeNext((currentValue) => {
        if (currentValue <= 1) {
          clearInterval(nextEpisodeCountdownIntervalRef.current);
          return 0;
        }

        return currentValue - 1;
      });
    }, 1000);

    return () => clearInterval(nextEpisodeCountdownIntervalRef.current);
  }, [isNextButtonVisible]);

  useEffect(() => {
    const handleNavigation = () => {
      backFromPlayer(lastSavedApiPositionRef.current, videoDuration);
    };

    window.addEventListener("popstate", handleNavigation);

    return () => {
      window.removeEventListener("popstate", handleNavigation);
    };
  }, [videoDuration, backFromPlayer]);

  useEffect(() => {
    return () => {
      clearInterval(saveProgressIntervalRef.current);
      clearInterval(playerStatusIntervalRef.current);
      clearInterval(nextEpisodeCountdownIntervalRef.current);
      clearTimeout(nextEpisodeTimeoutRef.current);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, []);

  const buildProgressSaveUrl = (playerState) => {
    const currentTime = playerState.player.currentTime;
    const currentDuration = playerState.player.duration;

    // Backend ask this pattern
    if (type === "series") {
      return `${process.env.REACT_APP_PATH_CUSTOM_API}/set_episode_progress?jwt_token=${JWT_TOKEN}&series_id=${xc_id}&xc_id=${episodeID}&position=${currentTime}&duration=${currentDuration}`;
    }

    return `${process.env.REACT_APP_PATH_CUSTOM_API}/set_movie_progress?jwt_token=${JWT_TOKEN}&xc_id=${xc_id}&position=${currentTime}&duration=${currentDuration}`;
  };

  const handleSeek = (value) => {
    videoRef.current?.seek(value);
  };

  const handleResumePlayback = () => {
    if (position < 1 || !isResume) return;
    if (type === "series" && position + 60 > duration) return;
    if (isTransitioningToNextEpisodeRef.current) return;

    lastSavedApiPositionRef.current = position;
    handleSeek(position);
  };

  const savePlaybackProgress = async () => {
    if (!videoRef.current || isNextButtonVisible) return;

    const playerState = videoRef.current.getState();
    if (playerState.player.paused) return;

    try {
      const response = await fetch(buildProgressSaveUrl(playerState));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const result = await response.json();

      if (result?.data) {
        lastSavedApiPositionRef.current = result.data.position;
        setVideoDuration(result.data.duration);
      }
    } catch (error) {
      console.error("Failed to save playback progress", error);
    }
  };

  const handleNextEpisode = () => {
    if (!nextEpisode) {
      backFromPlayer(lastSavedApiPositionRef.current, videoDuration);
      return;
    }

    setIsNextButtonVisible(true);
    isTransitioningToNextEpisodeRef.current = true;

    nextEpisodeTimeoutRef.current = setTimeout(() => {
      isTransitioningToNextEpisodeRef.current = false;
      setIsNextButtonVisible(false);
      handleVideoEnd(videoDuration);
    }, NEXT_EPISODE_DELAY_MS);
  };

  const handlePlayNextEpisodeNow = () => {
    isTransitioningToNextEpisodeRef.current = false;
    setIsNextButtonVisible(false);
    clearTimeout(nextEpisodeTimeoutRef.current);
    handleVideoEnd();
  };

  const handleMouseMove = () => {
    setIsControlsVisible(true);

    clearTimeout(controlsTimeoutRef.current);
    controlsTimeoutRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, CONTROLS_HIDE_DELAY_MS);
  };

  return (
    <div onMouseMove={handleMouseMove}>
      <div>
        <div onClick={() => backFromPlayer(lastSavedApiPositionRef.current, videoDuration)}>
          <MdArrowBack size={50} color="white" />
        </div>

        <div>
          <div onClick={handlePlayNextEpisodeNow}>
            <p>
              {nextEpisodeLabel} {currentSecondBeforeNext}
            </p>
          </div>
        </div>

        <div>
          <Player
            preload="none"
            ref={videoRef}
            autoPlay={false}
            muted={Boolean(playerParamsFromToken)}
            src={path}
            fluid={false}
            height="100%"
          >
            <BigPlayButton position="center" />
          </Player>
        </div>

        {isError ? (
          <div>
            <p>{errorMessage}</p>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default VideoPlayer;
