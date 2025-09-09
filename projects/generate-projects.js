const fs = require("fs");
const path = require("path");

const base = path.join(__dirname, "projects");

// ensure projects/ exists
if (!fs.existsSync(base)) fs.mkdirSync(base);

const letters = "abcdefghijklmno".split(""); // a → o
letters.forEach(letter => {
  const folder = path.join(base, `project-${letter}`);
  if (!fs.existsSync(folder)) fs.mkdirSync(folder);

  // choose alternating cover types just as placeholders
  const cover = (["b","e","h","k","o"].includes(letter)) ? "cover.mp4" : "cover.jpg";

  const meta = {
    title: `Project ${letter.toUpperCase()}`,
    year: 2025,
    roles: ["Direction", "3D", "Edit"],
    description: `Placeholder description for Project ${letter.toUpperCase()}.`,
    cover,
    assets: ["shot1.jpg"],
    link: "#"
  };

  fs.writeFileSync(path.join(folder, "meta.json"), JSON.stringify(meta, null, 2));
  
  // touch placeholder files so you can see them
  fs.writeFileSync(path.join(folder, cover), "");
  fs.writeFileSync(path.join(folder, "shot1.jpg"), "");
});

console.log("Generated project-a through project-o ✅");
