const { client } = require("../config/database");

async function getWaitingRoomDisplays() {
  const result = await client.query("SELECT display_id FROM waiting_room_displays");
  return result.rows;
}

async function getCounterDisplays() {
  const result = await client.query("SELECT displayid as display_id FROM counterdisplay");
  return result.rows;
}

async function getOTADisplayLinks() {
  const result = await client.query("SELECT display_id, filename, status FROM otadisplay");
  return result.rows;
}

async function checkOTALink(displayid) {
  const check = await client.query("SELECT display_id FROM otadisplay WHERE display_id = $1", [displayid]);
  return check.rows.length > 0;
}

async function updateOTALink(displayid, filename, status) {
  await client.query("UPDATE otadisplay SET filename = $1, status = $2 WHERE display_id = $3", [filename, status, displayid]);
}

async function insertOTALink(displayid, filename, status) {
  await client.query("INSERT INTO otadisplay (display_id, filename, status) VALUES ($1, $2, $3)", [displayid, filename, status]);
}

module.exports = {
  getWaitingRoomDisplays,
  getCounterDisplays,
  getOTADisplayLinks,
  checkOTALink,
  updateOTALink,
  insertOTALink,
};
