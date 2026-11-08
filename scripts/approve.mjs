// Adds or removes a phone code, raises seq, re-signs data.json. Run by the "Approve phone" workflow.
// Needs env SIGNING_KEY (PEM). ACTION is approve or remove; CODE looks like K7QM-29XD.
import fs from "fs";
import crypto from "crypto";

const action = process.env.ACTION;
const code = String(process.env.CODE || "").trim().toUpperCase().replace(/^([A-Z2-9]{4})([A-Z2-9]{4})$/, "$1-$2");
if (!/^[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/.test(code)) { console.error("Not a valid code. It looks like K7QM-29XD."); process.exit(1); }
if (!["approve", "remove"].includes(action)) { console.error("Unknown action."); process.exit(1); }

const devices = JSON.parse(fs.readFileSync("devices.json", "utf8"));
const has = devices.includes(code);
if (action === "approve" && has) { console.log(code + " is already approved. Nothing to do."); process.exit(0); }
if (action === "remove" && !has) { console.log(code + " is not on the list. Nothing to do."); process.exit(0); }
if (action === "approve") devices.push(code); else devices.splice(devices.indexOf(code), 1);

const data = JSON.parse(fs.readFileSync("data.json", "utf8"));
data.devices = devices;
data.seq += 1;
const body = Buffer.from(JSON.stringify(data), "utf8");
const sig = crypto.sign("sha256", body, { key: process.env.SIGNING_KEY, dsaEncoding: "der" });
const pub = Buffer.from(fs.readFileSync("scripts/public-key.txt", "utf8").trim(), "base64");
if (!crypto.verify("sha256", body, { key: pub, format: "der", type: "spki", dsaEncoding: "der" }, sig)) throw new Error("signature check failed");
fs.writeFileSync("data.json", body);
fs.writeFileSync("data.json.sig", sig.toString("base64") + "\n");
fs.writeFileSync("devices.json", JSON.stringify(devices) + "\n");
fs.appendFileSync(process.env.GITHUB_OUTPUT || "/dev/null", `msg=${action === "approve" ? "Approve" : "Remove"} phone ${code} (release ${data.seq})\n`);
console.log(`${action === "approve" ? "Approved" : "Removed"} ${code}. Release ${data.seq}, ${devices.length} phone(s) approved.`);
