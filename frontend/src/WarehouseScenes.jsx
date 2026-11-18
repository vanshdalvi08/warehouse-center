import React from "react";
import receiving from "./assets/warehouse/receiving.png";
import storage from "./assets/warehouse/storage.png";
import dispatch from "./assets/warehouse/dispatch.png";

function Scene({ src }) {
  return (
    <img
      className="warehouse-scene-image"
      src={src}
      width="1536"
      height="1024"
      alt=""
      draggable="false"
      decoding="async"
    />
  );
}
export function ReceivingScene() {
  return <Scene src={receiving} />;
}
export function StorageScene() {
  return <Scene src={storage} />;
}
export function DispatchScene() {
  return <Scene src={dispatch} />;
}
