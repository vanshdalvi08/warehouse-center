import React, { useEffect, useState } from "react";
import { Boxes, Pause, Play, ArrowLeft, ArrowRight } from "lucide-react";
import { ReceivingScene, StorageScene, DispatchScene } from "./WarehouseScenes";
import "./AccessStory.css";

const scenes = [
  {
    title: "Goods receiving",
    description: "Check inbound stock against expected orders.",
    Illustration: ReceivingScene,
  },
  {
    title: "Inventory in place",
    description: "Locate goods, reserve stock and verify every pick.",
    Illustration: StorageScene,
  },
  {
    title: "Ready for dispatch",
    description: "Check the contents, seal the carton and confirm shipment.",
    Illustration: DispatchScene,
  },
];
export function AccessStory() {
  const [active, setActive] = useState(0),
    [paused, setPaused] = useState(false),
    [interacting, setInteracting] = useState(false),
    [reduced, setReduced] = useState(false),
    [hidden, setHidden] = useState(false);
  useEffect(() => {
    const media = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReduced(Boolean(media?.matches));
    updateMotion();
    media?.addEventListener?.("change", updateMotion);
    const visibility = () => setHidden(document.hidden);
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      media?.removeEventListener?.("change", updateMotion);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);
  useEffect(() => {
    if (paused || interacting || reduced || hidden) return;
    const timer = window.setInterval(
      () => setActive((index) => (index + 1) % scenes.length),
      6500,
    );
    return () => window.clearInterval(timer);
  }, [paused, interacting, reduced, hidden, active]);
  function select(index) {
    setActive((index + scenes.length) % scenes.length);
  }
  return (
    <section
      className={`access-story${paused || interacting || reduced || hidden ? " is-paused" : ""}`}
      aria-label="Warehouse workflow illustrations"
      aria-roledescription="carousel"
      onMouseEnter={() => setInteracting(true)}
      onMouseLeave={() => setInteracting(false)}
      onFocusCapture={() => setInteracting(true)}
      onBlurCapture={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget)) setInteracting(false);
      }}
    >
      <div className="access-story-brand">
        <Boxes size={24} />
        <span>Warehouse Center</span>
      </div>
      <div className="access-story-main">
        <div className="access-story-heading">
          <span>WAREHOUSE OPERATIONS</span>
          <h2>
            From receiving
            <br />
            to dispatch.
          </h2>
          <p>One workspace for the goods you move.</p>
        </div>
        <div className="access-slides" aria-live="off">
          {scenes.map(({ title, description, Illustration }, index) => (
            <div
              key={title}
              className={`access-slide${index === active ? " is-active" : ""}`}
              aria-hidden={index !== active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${index + 1} of ${scenes.length}`}
            >
              <div className="access-slide-art">
                <Illustration />
              </div>
              <div className="access-slide-caption">
                <span className="access-slide-index">0{index + 1}</span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="access-story-controls">
          <div
            className="access-story-dots"
            aria-label="Choose warehouse illustration"
          >
            {scenes.map((scene, index) => (
              <button
                key={scene.title}
                type="button"
                aria-label={`Show ${scene.title}`}
                aria-pressed={active === index}
                onClick={() => select(index)}
              >
                <span />
              </button>
            ))}
          </div>
          <div className="access-story-arrows">
            <button
              type="button"
              aria-label="Previous illustration"
              onClick={() => select(active - 1)}
            >
              <ArrowLeft size={15} />
            </button>
            <button
              type="button"
              aria-label="Next illustration"
              onClick={() => select(active + 1)}
            >
              <ArrowRight size={15} />
            </button>
            <button
              type="button"
              aria-label={
                reduced
                  ? "Automatic slideshow disabled for reduced motion"
                  : paused
                    ? "Play illustration slideshow"
                    : "Pause illustration slideshow"
              }
              disabled={reduced}
              onClick={() => {
                setPaused(!paused);
                if (paused) setInteracting(false);
              }}
            >
              {paused || reduced ? <Play size={13} /> : <Pause size={13} />}
            </button>
          </div>
        </div>
      </div>
      <div className="access-story-footer">
        <span>RECEIVE</span>
        <i />
        <span>STORE</span>
        <i />
        <span>FULFIL</span>
      </div>
    </section>
  );
}
