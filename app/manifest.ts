import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jikari",
    short_name: "jikari",
    description: "한국어 화자를 위한 조용한 일본어 학습 도구",
    start_url: "/",
    display: "standalone",
    background_color: "#F5EFE4",
    theme_color: "#F5EFE4",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
