export interface BlogPost {
  id: number;
  title: string;
  slug: string;
  date: string;
  content: string;
  videos?: string[];
  images?: { src: string; alt: string; width: number; height: number }[];
}

export const blogPosts: BlogPost[] = [
  {
    id: 37,
    title: "2018 FSU Flying High Circus at Callaway Gardens",
    slug: "2018-fsu-flying-high-circus-at-callaway-gardens",
    date: "2018-07-23",
    content: `Since 1960 the Flying High Circus has spent their summers at Callaway Gardens in north Georgia. Select members help put on the resort's kids camp with circus-themed activities, work with adults on some circus tricks and put on a full circus show under the Callaway big top several times a week.

This year Joey learned how to be a catcher on trapeze–and then conducted trapeze lessons. Here he catches a woman who was in the circus in the 1980s and came back for a glimpse of circus glory.`,
    videos: [
      "y-O6-m1bKi0", // Trapeze catch
      "ltY1RqtLqOU", // Quartet
      "MIyWB3cUAY0", // Teeter Board
      "wMML4WyTNhA", // 2 man juggling
      "PzwgbmDZho4"  // Mom getting clowned
    ],
    images: [
      { src: "/images/fh2.jpg", alt: "Flying High Circus", width: 596, height: 277 }
    ]
  },
  {
    id: 34,
    title: "2018 FSU Flying High Circus Home Show",
    slug: "2018-fsu-flying-high-circus-home-show",
    date: "2018-07-23",
    content: `The 2018 Home Show was held during the month of April and Joey was in four acts.

The Russian Bar was spectacular as usual.`,
    videos: [
      "TjwbQwPTrbM", // Russian Bar
      "8MJ3zJX7Pgg", // Teeter board
      "awTrcQOxImI", // Quartet
      "D-x-PR3K78k"  // Juggling
    ],
    images: [
      { src: "/images/IMG_8833.jpg", alt: "Family photo at circus", width: 318, height: 238 }
    ]
  },
  {
    id: 22,
    title: "Summer 2017 Flying High at Callaway Gardens",
    slug: "summer-2017-flying-high-at-callaway-gardens",
    date: "2017-07-17",
    content: "The troupe spent the summer conducting kids camps and performing under the lakeside big top. Some scenes from Callaway:",
    videos: [
      "8QCd8vmxi8I",
      "H5PmX3hSWP4",
      "zta4RBZdjjo",
      "cqax65W_m_8",
      "6ExP2UZ9X8c",
      "Bach5P2CmMI",
      "zEaDEn-FAtQ",
      "vZPqCw-XgY8",
      "H79CaUVvTHs",
      "Vq4S3bt1wV0"
    ]
  },
  {
    id: 18,
    title: "FSU Flying High Circus Spring Show 2017",
    slug: "fsu-flying-high-circus-spring-show-2017",
    date: "2017-07-17",
    content: "Juggling:\n\nRussian Bar:\n\nQuartet (low res):",
    videos: [
      "a4bsT_Tr90w", // Juggling
      "Lv7oKWVz-SM", // Russian Bar
      "qDoM2v_8CFw"  // Quartet
    ]
  },
  {
    id: 5,
    title: "My juggling–the early years",
    slug: "my-juggling",
    date: "2015-06-30",
    content: `Debut act with the 2016 Florida State University Flying High Circus

Other Juggling`,
    videos: [
      "-GCeTZuCUOo", // Debut act
      "0h4ozAEqxzo",
      "VIww803HGgI",
      "IorFp86hCzI",
      "E5oJXb0R82c"
    ]
  },
  {
    id: 1,
    title: "My touchdown",
    slug: "hello-world",
    date: "2015-06-30",
    content: "My touchdown, 2014",
    videos: [
      "nzR1x2Khqjc"
    ]
  }
];
