/**
 * Resize an image file on the client side before upload.
 *
 * @param {File} file - The original File object from <input type="file">
 * @param {Object} options
 * @param {number} options.maxWidth - Max width in pixels (default: 1200)
 * @param {number} options.maxHeight - Max height in pixels (default: 1200)
 * @param {number} options.quality - JPEG/WebP quality 0-1 (default: 0.85)
 * @param {string} options.outputType - "image/jpeg" | "image/webp" | "image/png" (default: "image/jpeg")
 * @returns {Promise<File>} A new resized File object ready for FormData
 */
export function resizeImage(file, options = {}) {
  const {
    maxWidth = 1200,
    maxHeight = 1200,
    quality = 0.85,
    outputType = "image/jpeg",
  } = options;

  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);

      try {
        let w = img.width;
        let h = img.height;

        // scale down to fit within maxWidth x maxHeight, maintaining aspect ratio
        if (w > maxWidth || h > maxHeight) {
          const ratio = Math.min(maxWidth / w, maxHeight / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        const isPng = outputType === "image/png";
        const blobType = isPng ? "image/png" : outputType;
        const blobQuality = isPng ? undefined : quality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file); // fallback
              return;
            }

            const ext = isPng ? ".png" : blobType === "image/webp" ? ".webp" : ".jpg";
            const name =
              (file.name.replace(/\.[^.]+$/, "") || "image") + "_resized" + ext;

            const resized = new File([blob], name, { type: blobType });
            resolve(resized);
          },
          blobType,
          blobQuality,
        );
      } catch {
        resolve(file); // fallback on any canvas error
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file); // fallback
    };

    img.src = url;
  });
}
