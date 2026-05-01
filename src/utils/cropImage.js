// src/utils/cropImage.js
export async function getCroppedSquareBlob(file, areaPx) {
  const img = await new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = rej;
    i.src = URL.createObjectURL(file);
  });
  const canvas = document.createElement("canvas");
  const size = Math.min(areaPx.width, areaPx.height);
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(
    img,
    areaPx.x,
    areaPx.y,
    areaPx.width,
    areaPx.height,
    0,
    0,
    size,
    size,
  );
  URL.revokeObjectURL(img.src);
  return new Promise((res) => canvas.toBlob((b) => res(b), "image/jpeg", 0.92));
}
