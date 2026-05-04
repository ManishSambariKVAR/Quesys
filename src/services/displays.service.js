const { client } = require("../config/database");

async function getWaitingRoomDisplays() {
  const result = await client.query("SELECT * FROM waiting_room_displays ORDER BY id ASC");
  return result.rows;
}

async function addWaitingRoomDisplay(displayId, displayStatus, ipAddress) {
  await client.query(
    "INSERT INTO waiting_room_displays (display_id, display_status, ip_address) VALUES ($1, $2, $3)",
    [displayId, displayStatus, ipAddress]
  );
}

async function updateWaitingRoomDisplay(id, displayId, displayStatus, ipAddress) {
  await client.query(
    "UPDATE waiting_room_displays SET display_id = $1, display_status = $2, ip_address = $3 WHERE id = $4",
    [displayId, displayStatus, ipAddress, id]
  );
}

async function deleteWaitingRoomDisplay(id) {
  await client.query("DELETE FROM waiting_room_displays WHERE id = $1", [id]);
}

module.exports = {
  getWaitingRoomDisplays,
  addWaitingRoomDisplay,
  updateWaitingRoomDisplay,
  deleteWaitingRoomDisplay,
};
