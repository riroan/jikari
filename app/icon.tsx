import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

// DESIGN.md Quiet Paper: cream ground, a single clay dot (光 = light).
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#F5EFE4",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: "28%",
            height: "28%",
            borderRadius: "50%",
            background: "#B85840",
          }}
        />
      </div>
    ),
    size,
  );
}
