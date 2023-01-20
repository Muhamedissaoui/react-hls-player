import React, { useEffect, useRef, useState } from "react";
import Hls from "hls.js";
import Config from "hls.js";
import "./Player.css";

export interface HlsPlayerProps
  extends React.VideoHTMLAttributes<HTMLVideoElement> {
  hlsConfig?: Config;
  src: string;
  width?: string;
  autoPlay?: boolean;
}

const leadingZeroFormatter = new Intl.NumberFormat(undefined, {
  minimumIntegerDigits: 2,
});

function formateDuration(time: number) {
  const seconds = Math.floor(time % 60);
  const minutes = Math.floor((time / 60) % 60);
  const hours = Math.floor(time / 3600);
  if (hours === 0) {
    return `${minutes}:${leadingZeroFormatter.format(seconds)}`;
  } else {
    return `${hours}:${leadingZeroFormatter.format(
      minutes
    )}:${leadingZeroFormatter.format(seconds)}`;
  }
}

function TheosPlayer({ hlsConfig, src, autoPlay, width }: HlsPlayerProps) {
  const video = useRef<HTMLVideoElement>(null);
  const hls = useRef<Hls>(new Hls());

  useEffect(() => {
    function _initPlayer() {
      if (hls != null) {
        hls.current.destroy();
      }

      const newHls = new Hls({
        enableWorker: false,
        ...hlsConfig,
      });

      if (video.current != null) {
        newHls.attachMedia(video.current);
      }

      newHls.loadSource(src);

      newHls.on(Hls.Events.MANIFEST_PARSED, () => {
        if (autoPlay) {
          video?.current
            ?.play()
            .catch(() =>
              console.log(
                "Unable to autoplay prior to user interaction with the dom."
              )
            );
        }
        if (hasQuality.current) {
          return;
        } else {
          const levels = newHls.levels;
          setQuality(levels.map((level) => level.height));

          hasQuality.current = true;
        }
      });

      newHls.on(Hls.Events.ERROR, function (event, data) {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              newHls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              newHls.recoverMediaError();
              break;
            default:
              _initPlayer();
              break;
          }
        }
      });

      hls.current = newHls;
    }

    // Check for Media Source support
    if (Hls.isSupported()) {
      _initPlayer();
    }

    return () => {
      if (hls != null) {
        hls.current.destroy();
      }
    };
  }, [autoPlay, hlsConfig, video, src]);

  const videoContainer = useRef<HTMLDivElement>(null);
  const waitingRef = useRef<HTMLDivElement>(null);
  const pauseIcon = useRef<HTMLDivElement>(null);
  const videoContainerControls = useRef<HTMLDivElement>(null);
  const thumbIndicator = useRef<HTMLDivElement>(null);
  const playButton = useRef<HTMLButtonElement>(null);
  const fullScreenButton = useRef<HTMLButtonElement>(null);
  const miniPlayerButton = useRef<HTMLButtonElement>(null);
  const settingsButton = useRef<HTMLButtonElement>(null);
  const muteButton = useRef<HTMLButtonElement>(null);
  const volumeSlider = useRef<HTMLInputElement>(null);
  const currentTime = useRef<HTMLDivElement>(null);
  const totalTime = useRef<HTMLDivElement>(null);
  const timeLineContainer = useRef<HTMLDivElement>(null);
  const bufferRef = useRef<HTMLDivElement>(null);
  const dropUp = useRef<HTMLDivElement>(null);
  const hasQuality = useRef<boolean>(false);
  const isWaiting = useRef<boolean>(false);
  let isScrubbing = false;
  let wasPaused: any;

  const [quality, setQuality] = useState<number[]>([]);

  function skip(duration: number) {
    if (video.current === null) {
      return;
    } else {
      video.current!.currentTime += duration;
    }
  }
  function toggleScrubbing(e: any) {
    const rect = timeLineContainer.current!.getBoundingClientRect();
    const percent =
      Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
    isScrubbing = (e.buttons & 1) === 1;
    videoContainer.current!.classList.toggle("scrubbing", isScrubbing);
    if (isScrubbing) {
      wasPaused = video.current!.paused;
      video.current!.pause();
    } else {
      video.current!.currentTime = percent * video.current!.duration;
      if (!wasPaused) video.current!.play();
    }
    handleTimeLineUpdate(e);
  }

  const togglePlay = () => {
    if (video.current != null) {
      video.current.paused ? video.current.play() : video.current.pause();
      playButton.current!.blur();
      if (dropUp.current!.classList.contains("open")) {
        dropUp.current!.classList.remove("open");
      }
    }
  };
  const toggleFullScreenMode = () => {
    if (document.fullscreenElement == null) {
      if (videoContainer.current == null && fullScreenButton.current == null)
        return;
      videoContainer.current!.requestFullscreen();
      fullScreenButton.current!.blur();
      if (dropUp.current != null) {
        if (dropUp.current!.classList.contains("open")) {
          dropUp.current!.classList.remove("open");
        }
      }
    } else {
      if (fullScreenButton.current == null) return;
      document.exitFullscreen();
      fullScreenButton.current!.blur();
      if (dropUp.current != null) {
        if (dropUp.current!.classList.contains("open")) {
          dropUp.current!.classList.remove("open");
        }
      }
    }
  };
  const toggleMiniPlayerMode = () => {
    if (videoContainer.current != null) {
      if (videoContainer.current!.classList.contains("mini-player")) {
        document.exitPictureInPicture();
        miniPlayerButton.current!.addEventListener("focus", () => {
          miniPlayerButton.current!.blur();
        });
        if (dropUp.current != null) {
          if (dropUp.current!.classList.contains("open")) {
            dropUp.current!.classList.remove("open");
          }
        }
      } else {
        video.current!.requestPictureInPicture();
        miniPlayerButton.current!.addEventListener("focus", () => {
          miniPlayerButton.current!.blur();
        });
        if (dropUp.current != null) {
          if (dropUp.current!.classList.contains("open")) {
            dropUp.current!.classList.remove("open");
          }
        }
      }
    } else {
      return;
    }
  };
  const togglemute = () => {
    if (video.current == null) return;
    video.current!.muted = !video.current!.muted;
    if (dropUp.current != null) {
      if (dropUp.current!.classList.contains("open")) {
        dropUp.current!.classList.remove("open");
      }
    }
  };
  const handleVolume = (e: any) => {
    video.current!.volume = e.target.value;
    video.current!.muted = e.target.value === 0;
    if (dropUp.current != null) {
      if (dropUp.current!.classList.contains("open")) {
        dropUp.current!.classList.remove("open");
      }
    }
  };
  const handleTimeLineUpdate = (e: any) => {
    const rect = timeLineContainer.current!.getBoundingClientRect();
    const percent =
      Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;

    timeLineContainer.current!.style.setProperty(
      "--preview-position",
      percent.toString()
    );

    if (isScrubbing) {
      e.preventDefault();
      timeLineContainer.current!.style.setProperty(
        "--progress-position",
        percent.toString()
      );
    }
  };
  const handleTime = (e: any) => {
    const rect = timeLineContainer.current!.getBoundingClientRect();
    const percent =
      Math.min(Math.max(0, e.x - rect.x), rect.width) / rect.width;
    video.current!.currentTime = percent * video.current!.duration;
  };
  const onProgress = () => {
    if (!video.current!.buffered.length || !bufferRef.current) return;
    const bufferedEnd = video.current!.buffered.end(
      video.current!.buffered.length - 1
    );
    if (bufferRef.current! && video.current!.duration > 0) {
      const width = (bufferedEnd / video.current!.duration) * 100;
      bufferRef.current!.style.width = `${width}%`;
    }
  };
  const handleSettings = () => {
    dropUp.current!.classList.toggle("open");
    settingsButton.current!.blur();
  };

  document.addEventListener("keydown", (e) => {
    const tagName = document.activeElement?.tagName.toLowerCase();
    if (tagName === "input") {
      return;
    } else if (isWaiting.current) {
      return;
    } else {
      switch (e.key.toLocaleLowerCase()) {
        case " ":
          if (tagName === "button") {
            return;
          } else {
            togglePlay();
            if (dropUp.current != null) {
              if (dropUp.current!.classList.contains("open")) {
                dropUp.current!.classList.remove("open");
              }
            }
          }
          break;
        case "k":
          togglePlay();
          if (dropUp.current != null) {
            if (dropUp.current!.classList.contains("open")) {
              dropUp.current!.classList.remove("open");
            }
          }
          break;
        case "f":
          toggleFullScreenMode();
          if (dropUp.current != null) {
            if (dropUp.current!.classList.contains("open")) {
              dropUp.current!.classList.remove("open");
            }
          }
          break;
        case "i":
          toggleMiniPlayerMode();
          if (dropUp.current != null) {
            if (dropUp.current!.classList.contains("open")) {
              dropUp.current!.classList.remove("open");
            }
          }
          break;
        case "m":
          togglemute();
          if (dropUp.current != null) {
            if (dropUp.current!.classList.contains("open")) {
              dropUp.current!.classList.remove("open");
            }
          }
          break;
        case "arrowleft":
        case "j":
          skip(-5);
          if (dropUp.current != null) {
            if (dropUp.current!.classList.contains("open")) {
              dropUp.current!.classList.remove("open");
            }
          }
          break;
        case "arrowright":
        case "l":
          skip(5);
          if (dropUp.current != null) {
            if (dropUp.current!.classList.contains("open")) {
              dropUp.current!.classList.remove("open");
            }
          }
          break;
      }
    }
  });
  document.addEventListener("fullscreenchange", () => {
    if (document.fullscreenElement) {
      if (video.current != null)
        videoContainer.current!.classList.add("full-screen");
    } else {
      if (video.current != null)
        videoContainer.current!.classList.remove("full-screen");
    }
  });
  document.addEventListener("mouseup", (e) => {
    if (isScrubbing) toggleScrubbing(e);
  });
  document.addEventListener("mousemove", (e) => {
    if (isScrubbing) handleTimeLineUpdate(e);
  });

  useEffect(() => {
    // Play-Pause:
    video.current!.addEventListener("play", () => {
      videoContainer.current!.classList.remove("paused");
    });
    video.current!.addEventListener("pause", () => {
      videoContainer.current!.classList.add("paused");
    });

    // Waiting:
    video.current!.addEventListener("waiting", () => {
      waitingRef.current!.classList.add("waiting");
      isWaiting.current = true;
    });
    video.current!.addEventListener("playing", () => {
      waitingRef.current!.classList.remove("waiting");
      isWaiting.current = false;
    });

    // PictureInPicture:
    video.current!.addEventListener("enterpictureinpicture", () => {
      videoContainer.current!.classList.add("mini-player");
    });

    video.current!.addEventListener("leavepictureinpicture", () => {
      videoContainer.current!.classList.remove("mini-player");
    });

    // Volume:
    video.current!.addEventListener("volumechange", () => {
      volumeSlider.current!.value = video.current!.volume.toString();
      let volumeLevel;
      if (video.current!.muted || video.current!.volume === 0) {
        volumeSlider.current!.value = "0";
        volumeLevel = "muted";
      } else if (video.current!.volume >= 0.5) {
        volumeLevel = "high";
      } else {
        volumeLevel = "low";
      }
      videoContainer.current!.dataset.volumeLevel = volumeLevel;
    });

    // Duration:
    video.current!.addEventListener("loadeddata", () => {
      totalTime.current!.textContent = formateDuration(
        video.current!.duration
      )!;
    });

    video.current!.addEventListener("timeupdate", () => {
      currentTime.current!.textContent = formateDuration(
        video.current!.currentTime
      );
      if (video.current!.currentTime > 0) {
        const percent = video.current!.currentTime / video.current!.duration;
        timeLineContainer.current!.style.setProperty(
          "--progress-position",
          percent.toString()
        );
      } else {
        timeLineContainer.current!.style.setProperty(
          "--progress-position",
          "0"
        );
      }
      onProgress();
    });

    // TimeLine:
    timeLineContainer.current!.addEventListener(
      "mousemove",
      handleTimeLineUpdate
    );
    timeLineContainer.current!.addEventListener(
      "mousedown",
      handleTimeLineUpdate
    );
    timeLineContainer.current!.addEventListener("click", handleTime);
    thumbIndicator.current!.addEventListener("mousedown", toggleScrubbing);
    video.current!.addEventListener("progress", onProgress);
  });
  return (
    <div
      ref={videoContainer}
      className="player-container paused"
      data-volume-level="high"
      style={{ width: width }}
    >
      <div ref={waitingRef} className="player-waiting">
        <div className="loading" />
      </div>
      <div ref={pauseIcon} className="player-play-icon" onClick={togglePlay}>
        <div className="play" />
      </div>
      <div ref={videoContainerControls} className="player-controls-container">
        <div ref={dropUp} className="dropup">
          <div className="title">
            <p>Quality:</p>
          </div>
          {quality.length > 1 ? (
            <>
              {quality
                .map((quality, index) => {
                  return (
                    <label
                      key={index}
                      onChange={() => {
                        hls.current.levels.forEach((level, levelIndex) => {
                          if (level.height === quality) {
                            hls.current.currentLevel = levelIndex;
                          }
                        });
                        dropUp.current!.classList.remove("open");
                      }}
                      className="radio"
                    >
                      <input type="radio" name="quality" />
                      <span>{quality}px</span>
                    </label>
                  );
                })
                .reverse()}
              <label
                onChange={() => {
                  hls.current.currentLevel = -1;
                }}
                className="radio"
              >
                <input type="radio" name="quality" defaultChecked />
                <span>auto</span>
              </label>
            </>
          ) : (
            <p>no qualities for this video.</p>
          )}
        </div>
        <div ref={timeLineContainer} className="timeline-container">
          <div className="timeline"></div>
          <div className="progress"></div>
          <div ref={bufferRef} className="buffer"></div>
          <div ref={thumbIndicator} className="thumb-indicator"></div>
        </div>
        <div className="controls">
          <button
            ref={playButton}
            className="play-pause-btn"
            onClick={togglePlay}
          >
            <svg className="play-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M8,5.14V19.14L19,12.14L8,5.14Z" />
            </svg>
            <svg className="pause-icon" viewBox="0 0 24 24">
              <path fill="currentColor" d="M14,19H18V5H14M6,19H10V5H6V19Z" />
            </svg>
          </button>
          <div className="volume-container">
            <button ref={muteButton} className="mute-btn" onClick={togglemute}>
              <svg className="volume-high-icon" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M14,3.23V5.29C16.89,6.15 19,8.83 19,12C19,15.17 16.89,17.84 14,18.7V20.77C18,19.86 21,16.28 21,12C21,7.72 18,4.14 14,3.23M16.5,12C16.5,10.23 15.5,8.71 14,7.97V16C15.5,15.29 16.5,13.76 16.5,12M3,9V15H7L12,20V4L7,9H3Z"
                />
              </svg>
              <svg className="volume-low-icon" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M5,9V15H9L14,20V4L9,9M18.5,12C18.5,10.23 17.5,8.71 16,7.97V16C17.5,15.29 18.5,13.76 18.5,12Z"
                />
              </svg>
              <svg className="volume-muted-icon" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M12,4L9.91,6.09L12,8.18M4.27,3L3,4.27L7.73,9H3V15H7L12,20V13.27L16.25,17.53C15.58,18.04 14.83,18.46 14,18.7V20.77C15.38,20.45 16.63,19.82 17.68,18.96L19.73,21L21,19.73L12,10.73M19,12C19,12.94 18.8,13.82 18.46,14.64L19.97,16.15C20.62,14.91 21,13.5 21,12C21,7.72 18,4.14 14,3.23V5.29C16.89,6.15 19,8.83 19,12M16.5,12C16.5,10.23 15.5,8.71 14,7.97V10.18L16.45,12.63C16.5,12.43 16.5,12.21 16.5,12Z"
                />
              </svg>
            </button>
            <input
              className="volume-slider"
              ref={volumeSlider}
              type="range"
              min="0"
              max="1"
              step="any"
              defaultValue="1"
              onChange={handleVolume}
            />
          </div>
          <div className="duration-container">
            <div ref={currentTime} className="current-time">
              0:00
            </div>
            /<div ref={totalTime} className="total-time"></div>
          </div>
          <button
            ref={settingsButton}
            className="settings-btn"
            onClick={handleSettings}
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="m9.7 21.5-.4-3.05q-.4-.125-.812-.375-.413-.25-.763-.525L4.9 18.75l-2.3-4 2.45-1.85q-.05-.225-.062-.45-.013-.225-.013-.45 0-.2.013-.425.012-.225.062-.475L2.6 9.25l2.3-3.975L7.725 6.45q.35-.275.763-.512Q8.9 5.7 9.3 5.55l.4-3.05h4.6l.4 3.05q.45.175.812.387.363.213.738.513l2.85-1.175 2.3 3.975-2.475 1.875q.05.25.05.45V12q0 .2-.013.412-.012.213-.062.488l2.45 1.85-2.3 4-2.8-1.2q-.375.3-.762.525-.388.225-.788.375l-.4 3.05ZM12 15q1.25 0 2.125-.875T15 12q0-1.25-.875-2.125T12 9q-1.25 0-2.125.875T9 12q0 1.25.875 2.125T12 15Z"
              />
            </svg>
          </button>
          <button
            ref={miniPlayerButton}
            className="mini-player-btn"
            onClick={toggleMiniPlayerMode}
          >
            <svg viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M21 3H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h18c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H3V5h18v14zm-10-7h9v6h-9z"
              />
            </svg>
          </button>
          <button
            ref={fullScreenButton}
            className="full-screen-btn"
            onClick={toggleFullScreenMode}
          >
            <svg className="open" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"
              />
            </svg>
            <svg className="close" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"
              />
            </svg>
          </button>
        </div>
      </div>
      <video ref={video} onClick={togglePlay} />
    </div>
  );
}

export default TheosPlayer;
